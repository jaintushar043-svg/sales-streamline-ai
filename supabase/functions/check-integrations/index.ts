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
    // Check which integrations are configured by checking environment variables
    const integrations = {
      apollo: {
        configured: !!Deno.env.get("APOLLO_API_KEY"),
      },
      vapi: {
        configured: !!Deno.env.get("VAPI_API_KEY"),
      },
      hubspot: {
        configured: !!Deno.env.get("HUBSPOT_API_KEY"),
        enabled: false,
      },
      airtable: {
        configured: !!Deno.env.get("AIRTABLE_API_KEY"),
        enabled: false,
      },
      sheets: {
        configured: !!Deno.env.get("GOOGLE_SHEETS_API_KEY"),
        enabled: false,
      },
    };

    return new Response(
      JSON.stringify(integrations),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking integrations:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
