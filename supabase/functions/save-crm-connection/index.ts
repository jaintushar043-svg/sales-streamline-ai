import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { validateWebhookUrl } from "../_shared/security-utils.ts";

interface SaveConnectionRequest {
  name: string;
  webhook_url: string;
  api_key?: string;
}

serve(async (req) => {
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

    const { name, webhook_url, api_key }: SaveConnectionRequest = await req.json();

    if (!name || !webhook_url) {
      return new Response(
        JSON.stringify({ error: "Name and webhook URL are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate webhook URL to prevent SSRF
    const urlValidation = validateWebhookUrl(webhook_url);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // First, create the connection record without API key
    const { data: connection, error: insertError } = await supabase
      .from("crm_connections")
      .insert({
        user_id: user.id,
        name,
        webhook_url,
        is_active: true,
        api_key_encrypted: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // If API key is provided, encrypt it using vault
    if (api_key && api_key.trim()) {
      try {
        // Use the vault encryption function
        const { data: secretId, error: encryptError } = await supabase
          .rpc("encrypt_crm_api_key", {
            p_api_key: api_key,
            p_connection_id: connection.id,
          });

        if (encryptError) {
          console.error("Failed to encrypt API key:", encryptError);
          // Still save the connection but without the API key
          return new Response(
            JSON.stringify({
              success: true,
              connection,
              warning: "Connection saved but API key encryption failed. Please update the API key.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update the connection with the encrypted secret ID
        const { data: updatedConnection, error: updateError } = await supabase
          .from("crm_connections")
          .update({
            api_key: secretId, // Store the vault secret ID
            api_key_encrypted: true,
          })
          .eq("id", connection.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Don't return the api_key field to the client
        const { api_key: _, ...safeConnection } = updatedConnection;

        return new Response(
          JSON.stringify({
            success: true,
            connection: { ...safeConnection, has_api_key: true },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (vaultError) {
        console.error("Vault encryption error:", vaultError);
        return new Response(
          JSON.stringify({
            success: true,
            connection,
            warning: "Connection saved but API key encryption failed.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        connection,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Save CRM connection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
