import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration } = await req.json();
    
    let valid = false;
    let error = null;

    switch (integration) {
      case "apollo": {
        const apiKey = Deno.env.get("APOLLO_API_KEY");
        if (!apiKey) {
          error = "API key not configured";
          break;
        }
        
        // Test Apollo API with a simple request
        const response = await fetch("https://api.apollo.io/v1/auth/health", {
          headers: {
            "x-api-key": apiKey,
          },
        });
        
        valid = response.ok;
        if (!valid) {
          error = `API returned status ${response.status}`;
        }
        break;
      }
      
      case "vapi": {
        const apiKey = Deno.env.get("VAPI_API_KEY");
        if (!apiKey) {
          error = "API key not configured";
          break;
        }
        
        // Test Vapi API
        const response = await fetch("https://api.vapi.ai/assistant", {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });
        
        valid = response.ok;
        if (!valid) {
          error = `API returned status ${response.status}`;
        }
        break;
      }
      
      case "hubspot": {
        const apiKey = Deno.env.get("HUBSPOT_API_KEY");
        if (!apiKey) {
          error = "API key not configured";
          break;
        }
        
        const response = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });
        
        valid = response.ok;
        if (!valid) {
          error = `API returned status ${response.status}`;
        }
        break;
      }
      
      case "airtable": {
        const apiKey = Deno.env.get("AIRTABLE_API_KEY");
        if (!apiKey) {
          error = "API key not configured";
          break;
        }
        
        const response = await fetch("https://api.airtable.com/v0/meta/whoami", {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
          },
        });
        
        valid = response.ok;
        if (!valid) {
          error = `API returned status ${response.status}`;
        }
        break;
      }
      
      case "sheets": {
        // Google Sheets requires OAuth, so we just check if credentials exist
        const apiKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
        valid = !!apiKey;
        if (!valid) {
          error = "API key not configured";
        }
        break;
      }
      
      default:
        error = `Unknown integration: ${integration}`;
    }

    return new Response(
      JSON.stringify({ valid, error }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error testing integration:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
