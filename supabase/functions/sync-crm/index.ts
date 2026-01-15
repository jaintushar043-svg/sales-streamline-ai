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

    // Get user's CRM connection
    let connection;
    if (connectionId) {
      const { data } = await supabase
        .from("crm_connections")
        .select("*")
        .eq("id", connectionId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      connection = data;
    } else {
      const { data } = await supabase
        .from("crm_connections")
        .select("*")
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
        // Decrypt API key if it's encrypted
        let actualApiKey: string | null = null;
        if (connection.api_key && connection.api_key_encrypted) {
          const { data: decryptedKey, error: decryptError } = await supabase
            .rpc("decrypt_crm_api_key", { p_secret_id: connection.api_key });
          
          if (!decryptError && decryptedKey) {
            actualApiKey = decryptedKey;
          }
        } else if (connection.api_key) {
          // Legacy: plain text API key (for backward compatibility)
          actualApiKey = connection.api_key;
        }

        // Send to webhook
        const webhookResponse = await fetch(connection.webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(actualApiKey ? { "Authorization": `Bearer ${actualApiKey}` } : {}),
          },
          body: JSON.stringify(payload),
        });

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
