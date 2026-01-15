import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { getUserPlanLimits, getUserCurrentUsage } from "../_shared/usage.ts";

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

    const supabase = createServiceClient();

    // Get user's plan and profile
    const { data: profile } = await supabase
      .from("profiles")
      .select(`
        *,
        billing_plans (*)
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    // Get limits and current usage
    const limits = await getUserPlanLimits(user.id);
    const usage = await getUserCurrentUsage(user.id);

    // Get call statistics
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: callStats } = await supabase
      .from("calls")
      .select("outcome, call_type, duration_seconds")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const callSummary = {
      total: callStats?.length || 0,
      completed: callStats?.filter((c) => c.outcome).length || 0,
      demo_booked: callStats?.filter((c) => c.outcome === "demo_booked").length || 0,
      interested: callStats?.filter((c) => c.outcome === "interested").length || 0,
      ai_calls: callStats?.filter((c) => c.call_type === "ai_agent").length || 0,
      manual_calls: callStats?.filter((c) => c.call_type === "manual").length || 0,
      total_duration: callStats?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0,
    };

    // Get lead statistics
    const { data: leadStats } = await supabase
      .from("leads")
      .select("status, source")
      .eq("user_id", user.id);

    const leadSummary = {
      total: leadStats?.length || 0,
      new: leadStats?.filter((l) => l.status === "new").length || 0,
      contacted: leadStats?.filter((l) => l.status === "contacted").length || 0,
      qualified: leadStats?.filter((l) => l.status === "qualified").length || 0,
      converted: leadStats?.filter((l) => l.status === "converted").length || 0,
      lost: leadStats?.filter((l) => l.status === "lost").length || 0,
      from_ai_search: leadStats?.filter((l) => l.source === "ai_search").length || 0,
      from_csv: leadStats?.filter((l) => l.source === "csv_import").length || 0,
      from_manual: leadStats?.filter((l) => l.source === "manual").length || 0,
    };

    // Get enrichment statistics
    const { count: enrichedCount } = await supabase
      .from("enriched_leads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // Get CRM sync statistics
    const { data: syncStats } = await supabase
      .from("crm_sync_logs")
      .select("status")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const crmSummary = {
      total_syncs: syncStats?.length || 0,
      successful: syncStats?.filter((s) => s.status === "success").length || 0,
      failed: syncStats?.filter((s) => s.status === "failed").length || 0,
    };

    return new Response(
      JSON.stringify({
        plan: profile?.billing_plans || { name: "Starter" },
        limits,
        usage,
        remaining: limits ? {
          leads: limits.leads_limit - usage.leads_searched,
          enrichments: limits.enrichment_limit - usage.leads_enriched,
          ai_call_minutes: limits.ai_call_minutes - usage.ai_call_minutes,
          manual_call_minutes: limits.manual_call_minutes - usage.manual_call_minutes,
        } : null,
        stats: {
          calls: callSummary,
          leads: leadSummary,
          enriched: enrichedCount || 0,
          crm: crmSummary,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Get usage stats error:", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
