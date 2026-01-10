import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";

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

    const supabase = createServiceClient();

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get users by plan
    const { data: usersByPlan } = await supabase
      .from("profiles")
      .select(`
        plan_id,
        billing_plans (name, price_monthly)
      `);

    const planCounts: Record<string, { count: number; revenue: number }> = {};
    usersByPlan?.forEach((profile) => {
      const billingPlan = (profile.billing_plans as unknown) as { name: string; price_monthly: number } | null;
      const planName = billingPlan?.name || "Free";
      const price = billingPlan?.price_monthly || 0;
      if (!planCounts[planName]) {
        planCounts[planName] = { count: 0, revenue: 0 };
      }
      planCounts[planName].count++;
      planCounts[planName].revenue += price;
    });

    // Get total leads
    const { count: totalLeads } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true });

    // Get total calls
    const { count: totalCalls } = await supabase
      .from("calls")
      .select("*", { count: "exact", head: true });

    // Get total call duration
    const { data: callDurations } = await supabase
      .from("calls")
      .select("duration_seconds, call_type");

    const totalCallMinutes = Math.round(
      (callDurations?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0) / 60
    );
    const aiCallMinutes = Math.round(
      (callDurations?.filter((c) => c.call_type === "ai_agent")
        .reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0) / 60
    );

    // Get usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyUsage } = await supabase
      .from("usage_logs")
      .select("usage_type, quantity")
      .gte("created_at", startOfMonth.toISOString());

    const usageSummary = {
      lead_searches: 0,
      enrichments: 0,
      ai_call_minutes: 0,
      manual_call_minutes: 0,
    };

    monthlyUsage?.forEach((log) => {
      switch (log.usage_type) {
        case "lead_search":
          usageSummary.lead_searches += log.quantity;
          break;
        case "enrichment":
          usageSummary.enrichments += log.quantity;
          break;
        case "ai_call":
          usageSummary.ai_call_minutes += log.quantity;
          break;
        case "manual_call":
          usageSummary.manual_call_minutes += log.quantity;
          break;
      }
    });

    // Estimate costs (example rates)
    const costEstimate = {
      ai_gateway: usageSummary.lead_searches * 0.002 + usageSummary.enrichments * 0.005,
      ai_calls: usageSummary.ai_call_minutes * 0.10, // $0.10/min
      manual_calls: usageSummary.manual_call_minutes * 0.02, // $0.02/min
      total: 0,
    };
    costEstimate.total = costEstimate.ai_gateway + costEstimate.ai_calls + costEstimate.manual_calls;

    // Calculate MRR
    const mrr = Object.values(planCounts).reduce((sum, p) => sum + p.revenue, 0);

    return new Response(
      JSON.stringify({
        users: {
          total: totalUsers || 0,
          by_plan: planCounts,
        },
        leads: {
          total: totalLeads || 0,
        },
        calls: {
          total: totalCalls || 0,
          total_minutes: totalCallMinutes,
          ai_minutes: aiCallMinutes,
        },
        usage_this_month: usageSummary,
        costs: costEstimate,
        revenue: {
          mrr,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Admin stats error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
