import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { checkUsageLimit, logUsage } from "../_shared/usage.ts";
import { sanitizePromptInput } from "../_shared/security-utils.ts";

interface EnrichRequest {
  leadIds: string[];
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

    const { leadIds }: EnrichRequest = await req.json();

    if (!leadIds || leadIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No lead IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id, "enrichment", leadIds.length);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Enrichment limit exceeded",
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Fetch leads to enrich
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .in("id", leadIds)
      .eq("user_id", user.id);

    if (fetchError) throw fetchError;
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid leads found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which leads are already enriched
    const { data: existingEnrichments } = await supabase
      .from("enriched_leads")
      .select("lead_id")
      .in("lead_id", leadIds);

    const enrichedIds = new Set(existingEnrichments?.map((e) => e.lead_id) || []);
    const leadsToEnrich = leads.filter((l) => !enrichedIds.has(l.id));

    if (leadsToEnrich.length === 0) {
      return new Response(
        JSON.stringify({ message: "All leads already enriched", enriched: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const enrichedResults: Record<string, unknown>[] = [];

    // Enrich each lead using AI
    for (const lead of leadsToEnrich) {
      // Sanitize all lead fields to prevent prompt injection
      const sanitizedName = sanitizePromptInput(lead.full_name, 100);
      const sanitizedJobTitle = sanitizePromptInput(lead.job_title, 100);
      const sanitizedCompany = sanitizePromptInput(lead.company_name, 100);
      const sanitizedIndustry = sanitizePromptInput(lead.industry, 50);
      const sanitizedCompanySize = sanitizePromptInput(lead.company_size, 30);
      
      const prompt = `Analyze this B2B lead and provide enrichment data:

Lead Information:
- Name: ${sanitizedName}
- Job Title: ${sanitizedJobTitle || "Unknown"}
- Company: ${sanitizedCompany || "Unknown"}
- Industry: ${sanitizedIndustry || "Unknown"}
- Company Size: ${sanitizedCompanySize || "Unknown"}

Provide a JSON response with:
{
  "company_summary": "2-3 sentence summary of what this company likely does",
  "decision_maker_relevance": 0-100 score of how likely this person is a decision maker,
  "lead_score": 0-100 overall lead quality score,
  "buying_signals": ["list", "of", "potential", "buying", "signals"],
  "recommended_approach": "Brief suggestion on how to approach this lead",
  "pain_points": ["potential", "pain", "points"]
}

Return ONLY valid JSON.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "You are a B2B sales intelligence analyst. Analyze leads and provide actionable insights. Return only valid JSON.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.5,
          }),
        });

        if (!aiResponse.ok) continue;

        const aiData = await aiResponse.json();
        const content = aiData.choices[0]?.message?.content || "{}";

        // Parse enrichment data
        let enrichment: Record<string, unknown> = {};
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            enrichment = JSON.parse(jsonMatch[0]);
          }
        } catch {
          enrichment = {
            company_summary: "Unable to analyze",
            decision_maker_relevance: 50,
            lead_score: 50,
          };
        }

        // Store enriched data
        const { data: enrichedLead, error: enrichError } = await supabase
          .from("enriched_leads")
          .insert({
            lead_id: lead.id,
            user_id: user.id,
            company_summary: enrichment.company_summary as string || null,
            decision_maker_relevance: enrichment.decision_maker_relevance as number || 50,
            lead_score: enrichment.lead_score as number || 50,
            enrichment_data: enrichment,
          })
          .select()
          .single();

        if (!enrichError && enrichedLead) {
          enrichedResults.push({
            lead_id: lead.id,
            ...enrichedLead,
          });
        }
      } catch (err) {
        console.error(`Failed to enrich lead ${lead.id}:`, err);
      }
    }

    // Log usage
    await logUsage(user.id, "enrichment", enrichedResults.length, {
      lead_ids: leadIds,
      enriched_count: enrichedResults.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        enriched: enrichedResults.length,
        results: enrichedResults,
        usage: {
          used: enrichedResults.length,
          remaining: usageCheck.remaining - enrichedResults.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Enrich lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
