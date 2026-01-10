import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { checkUsageLimit, logUsage } from "../_shared/usage.ts";

interface SearchCriteria {
  industry?: string;
  companySize?: string;
  jobTitle?: string;
  location?: string;
  country?: string;
  limit?: number;
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

    const criteria: SearchCriteria = await req.json();
    const searchLimit = criteria.limit || 25;

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id, "lead_search", searchLimit);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Usage limit exceeded",
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI to generate realistic lead data based on criteria
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const prompt = `Generate ${searchLimit} realistic B2B lead profiles matching these criteria:
- Industry: ${criteria.industry || "Any"}
- Company Size: ${criteria.companySize || "Any"}
- Job Title: ${criteria.jobTitle || "Decision maker"}
- Location: ${criteria.location || criteria.country || "USA"}

For each lead, provide:
- full_name: Realistic full name
- job_title: Job title matching criteria
- company_name: Realistic company name
- company_size: Employee range (e.g., "51-200")
- industry: Industry category
- location: City, State format
- email: Work email (use common B2B email patterns)
- phone: Phone number with area code
- linkedin_url: LinkedIn profile URL format
- company_website: Company website URL
- company_revenue: Revenue range (e.g., "$10M-$50M")

Return ONLY a JSON array of leads. No explanations.`;

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
            content: "You are a B2B lead data generator. Generate realistic, diverse business contact information. Return only valid JSON arrays.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || "[]";

    // Parse the JSON from AI response
    let leads: Record<string, unknown>[] = [];
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        leads = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      leads = [];
    }

    // Store leads in database
    const supabase = createServiceClient();
    const leadsToInsert = leads.slice(0, searchLimit).map((lead) => ({
      user_id: user.id,
      full_name: lead.full_name || "Unknown",
      job_title: lead.job_title,
      company_name: lead.company_name,
      company_size: lead.company_size,
      industry: lead.industry || criteria.industry,
      email: lead.email,
      phone: lead.phone,
      linkedin_url: lead.linkedin_url,
      company_website: lead.company_website,
      company_revenue: lead.company_revenue,
      status: "new",
      source: "ai_search",
    }));

    const { data: insertedLeads, error: insertError } = await supabase
      .from("leads")
      .insert(leadsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    // Log usage
    await logUsage(user.id, "lead_search", insertedLeads?.length || 0, {
      criteria,
      count: insertedLeads?.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        leads: insertedLeads,
        count: insertedLeads?.length || 0,
        usage: {
          used: insertedLeads?.length || 0,
          remaining: usageCheck.remaining - (insertedLeads?.length || 0),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Search leads error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
