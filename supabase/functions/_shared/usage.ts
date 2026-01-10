import { createServiceClient } from "./supabase.ts";

export interface UsageLimits {
  leads_limit: number;
  enrichment_limit: number;
  ai_call_minutes: number;
  manual_call_minutes: number;
}

export interface CurrentUsage {
  leads_searched: number;
  leads_enriched: number;
  ai_call_minutes: number;
  manual_call_minutes: number;
}

export const getUserPlanLimits = async (userId: string): Promise<UsageLimits | null> => {
  const supabase = createServiceClient();

  // Get user's plan from profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.plan_id) {
    // Default to starter plan limits
    return {
      leads_limit: 500,
      enrichment_limit: 100,
      ai_call_minutes: 0,
      manual_call_minutes: 60,
    };
  }

  const { data: plan } = await supabase
    .from("billing_plans")
    .select("leads_limit, enrichment_limit, ai_call_minutes, manual_call_minutes")
    .eq("id", profile.plan_id)
    .single();

  return plan;
};

export const getUserCurrentUsage = async (userId: string): Promise<CurrentUsage> => {
  const supabase = createServiceClient();

  const { data } = await supabase.rpc("get_user_usage", { _user_id: userId });

  if (!data || data.length === 0) {
    return {
      leads_searched: 0,
      leads_enriched: 0,
      ai_call_minutes: 0,
      manual_call_minutes: 0,
    };
  }

  return data[0];
};

export const logUsage = async (
  userId: string,
  usageType: "lead_search" | "enrichment" | "ai_call" | "manual_call",
  quantity: number,
  metadata?: Record<string, unknown>
) => {
  const supabase = createServiceClient();

  await supabase.from("usage_logs").insert({
    user_id: userId,
    usage_type: usageType,
    quantity,
    metadata: metadata || {},
  });
};

export const checkUsageLimit = async (
  userId: string,
  usageType: "lead_search" | "enrichment" | "ai_call" | "manual_call",
  requestedQuantity: number
): Promise<{ allowed: boolean; remaining: number; limit: number }> => {
  const limits = await getUserPlanLimits(userId);
  const usage = await getUserCurrentUsage(userId);

  if (!limits) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  let limit: number;
  let used: number;

  switch (usageType) {
    case "lead_search":
      limit = limits.leads_limit;
      used = usage.leads_searched;
      break;
    case "enrichment":
      limit = limits.enrichment_limit;
      used = usage.leads_enriched;
      break;
    case "ai_call":
      limit = limits.ai_call_minutes;
      used = usage.ai_call_minutes;
      break;
    case "manual_call":
      limit = limits.manual_call_minutes;
      used = usage.manual_call_minutes;
      break;
  }

  const remaining = limit - used;
  const allowed = remaining >= requestedQuantity;

  return { allowed, remaining, limit };
};
