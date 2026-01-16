import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { validateWebhookUrl } from "../_shared/security-utils.ts";

interface SyncRequest {
  leadIds: string[];
  connectionId?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const user = await getUserFromAuth(authHeader);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { leadIds, connectionId }: SyncRequest = await req.json();

    if (!leadIds || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No lead IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // SECURITY: Get user's CRM connection using SECURITY DEFINER function
    // This ensures we access the connection data securely without exposing API keys in logs
    let connection;
    if (connectionId) {
      // Use secure function to get connection for sync
      const { data, error: connError } = await supabase
        .rpc("get_crm_connection_for_sync", {
          p_connection_id: connectionId,
          p_user_id: user.id,
        });
      
      if (connError) {
        console.error("Error fetching connection:", connError.message);
        // Don't log the full error object as it might contain sensitive info
      }
      connection = data?.[0] ? {
        id: data[0].id,
        user_id: data[0].user_id,
        name: data[0].name,
        webhook_url: data[0].webhook_url,
        is_active: data[0].is_active,
        api_key_encrypted: data[0].has_encrypted_key,
        api_key: data[0].encrypted_key_id, // This is the vault secret ID, not the actual key
      } : null;
    } else {
      // Get most recent active connection for user
      const { data } = await supabase
        .from("crm_connections")
        .select("id, user_id, name, webhook_url, is_active, api_key_encrypted, api_key")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      connection = data;
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ error: "No active CRM connection found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook URL to prevent SSRF attacks
    const urlValidation = validateWebhookUrl(connection.webhook_url);
    if (!urlValidation.valid) {
      console.error("Invalid webhook URL blocked:", connection.webhook_url, urlValidation.error);
      return new Response(
        JSON.stringify({ error: `Invalid webhook URL: ${urlValidation.error}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch leads to sync
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select(`
        *,
        enriched_leads(*)
      `)
      .in("id", leadIds)
      .eq("user_id", user.id);

    if (fetchError) throw fetchError;
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid leads found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const syncResults: { success: string[]; failed: string[] } = {
      success: [],
      failed: [],
    };

    // Sync each lead to CRM via webhook
    for (const lead of leads) {
      const payload = {
        action: "create_contact",
        data: {
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          job_title: lead.job_title,
          company: {
            name: lead.company_name,
            website: lead.company_website,
            size: lead.company_size,
            industry: lead.industry,
            revenue: lead.company_revenue,
          },
          linkedin_url: lead.linkedin_url,
          lead_score: lead.enriched_leads?.[0]?.lead_score || null,
          company_summary: lead.enriched_leads?.[0]?.company_summary || null,
          source: "TechMarqX",
          metadata: {
            techmarqx_lead_id: lead.id,
            synced_at: new Date().toISOString(),
          },
        },
      };

      // Log sync attempt
      const { data: syncLog, error: logError } = await supabase
        .from("crm_sync_logs")
        .insert({
          user_id: user.id,
          connection_id: connection.id,
          lead_id: lead.id,
          status: "pending",
          payload,
        })
        .select()
        .single();

      if (logError) {
        console.error("Failed to create sync log:", logError);
      }

      try {
        // SECURITY: Decrypt API key server-side only if it's encrypted in vault
        // The api_key field contains a vault secret ID, not the actual key
        // NEVER log the decrypted key or send it to the frontend
        let actualApiKey: string | null = null;
        if (connection.api_key && connection.api_key_encrypted) {
          try {
            const { data: decryptedKey, error: decryptError } = await supabase
              .rpc("decrypt_crm_api_key", { p_secret_id: connection.api_key });
            
            if (decryptError) {
              // Log error without sensitive details
              console.error("API key decryption failed for connection");
            } else if (decryptedKey) {
              actualApiKey = decryptedKey;
            }
          } catch (decryptErr) {
            // SECURITY: Don't expose decryption errors in detail
            console.error("Failed to decrypt API key");
          }
        }
        // SECURITY: No longer support legacy plaintext keys
        // All keys should be encrypted via vault

        // Send to webhook - API key only used in Authorization header, never logged
        const webhookResponse = await fetch(connection.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(actualApiKey ? { "Authorization": `Bearer ${actualApiKey}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        
        // SECURITY: Clear the decrypted key from memory after use
        actualApiKey = null;

        if (webhookResponse.ok) {
          const responseData = await webhookResponse.json().catch(() => ({}));

          // Update sync log
          if (syncLog) {
            await supabase
              .from("crm_sync_logs")
              .update({
                status: "success",
                response: responseData,
              })
              .eq("id", syncLog.id);
          }

          syncResults.success.push(lead.id);
        } else {
          const errorText = await webhookResponse.text();

          // Update sync log with error
          if (syncLog) {
            await supabase
              .from("crm_sync_logs")
              .update({
                status: "failed",
                error_message: errorText,
                retry_count: 1,
              })
              .eq("id", syncLog.id);
          }

          syncResults.failed.push(lead.id);
        }
      } catch (webhookError: unknown) {
        // Update sync log with error
        if (syncLog) {
          await supabase
            .from("crm_sync_logs")
            .update({
              status: "failed",
              error_message: webhookError instanceof Error ? webhookError.message : "Unknown error",
              retry_count: 1,
            })
            .eq("id", syncLog.id);
        }

        syncResults.failed.push(lead.id);
      }
    }

    // Update connection last sync time
    await supabase
      .from("crm_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(
      JSON.stringify({
        success: true,
        synced: syncResults.success.length,
        failed: syncResults.failed.length,
        results: syncResults,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("CRM sync error:", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
