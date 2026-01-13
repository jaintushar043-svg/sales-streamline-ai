import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { checkUsageLimit, logUsage } from "../_shared/usage.ts";

interface ApolloSearchRequest {
  country: string;
  city?: string;
  industry?: string;
  companySize?: string;
  jobTitles?: string[];
  revenueTier?: string;
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

    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");

    if (!apolloApiKey) {
      return new Response(
        JSON.stringify({ error: "Apollo API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { country, city, industry, companySize, jobTitles, revenueTier, limit = 25 }: ApolloSearchRequest = await req.json();

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id, "lead_search", limit);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Lead search limit exceeded",
          remaining: usageCheck.remaining,
          limit: usageCheck.limit
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Apollo API request
    const apolloParams: Record<string, unknown> = {
      api_key: apolloApiKey,
      per_page: Math.min(limit, 100),
      page: 1,
    };

    // Location filters
    if (country) {
      apolloParams.person_locations = city ? [`${city}, ${country}`] : [country];
    }

    // Industry filter
    if (industry) {
      const industryMapping: Record<string, string[]> = {
        "SaaS": ["computer software", "information technology and services"],
        "FinTech": ["financial services", "banking", "insurance"],
        "HealthTech": ["health, wellness and fitness", "hospital & health care", "medical devices"],
        "EdTech": ["e-learning", "education management", "higher education"],
        "E-Commerce": ["retail", "consumer goods", "internet"],
        "Manufacturing": ["manufacturing", "industrial automation", "machinery"],
        "Real Estate": ["real estate", "commercial real estate", "construction"],
        "Consulting": ["management consulting", "business consulting", "professional services"],
        "Marketing & Advertising": ["marketing and advertising", "public relations and communications"],
        "Logistics": ["logistics and supply chain", "transportation/trucking/railroad", "warehousing"],
      };
      apolloParams.organization_industry_tag_ids = industryMapping[industry] || [industry.toLowerCase()];
    }

    // Job titles filter
    if (jobTitles && jobTitles.length > 0) {
      apolloParams.person_titles = jobTitles;
    }

    // Company size filter
    if (companySize) {
      const sizeMapping: Record<string, string[]> = {
        "1-10": ["1-10"],
        "11-50": ["11-50"],
        "51-200": ["51-200"],
        "201-500": ["201-500"],
        "501-1000": ["501-1000"],
        "1001-5000": ["1001-5000"],
        "5001+": ["5001-10000", "10001+"],
      };
      apolloParams.organization_num_employees_ranges = sizeMapping[companySize] || [companySize];
    }

    // Revenue filter
    if (revenueTier) {
      const revenueMapping: Record<string, [number, number]> = {
        "$0-1M": [0, 1000000],
        "$1M-10M": [1000000, 10000000],
        "$10M-50M": [10000000, 50000000],
        "$50M-100M": [50000000, 100000000],
        "$100M-500M": [100000000, 500000000],
        "$500M+": [500000000, 10000000000],
      };
      const range = revenueMapping[revenueTier];
      if (range) {
        apolloParams.organization_revenue_min = range[0];
        apolloParams.organization_revenue_max = range[1];
      }
    }

    console.log("Apollo search params:", JSON.stringify(apolloParams, null, 2));

    // Make Apollo API request
    const apolloResponse = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(apolloParams),
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error("Apollo API error:", errorText);
      
      // Fallback to AI-generated data if Apollo fails
      return await generateFallbackLeads(user.id, { country, city, industry, companySize, jobTitles, revenueTier, limit });
    }

    const apolloData = await apolloResponse.json();
    console.log(`Apollo returned ${apolloData.people?.length || 0} results`);

    if (!apolloData.people || apolloData.people.length === 0) {
      // Fallback to AI-generated data if no results
      return await generateFallbackLeads(user.id, { country, city, industry, companySize, jobTitles, revenueTier, limit });
    }

    const supabase = createServiceClient();

    // Transform Apollo data to our lead format
    const leads = apolloData.people.map((person: {
      id: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      email?: string;
      phone_numbers?: Array<{ sanitized_number?: string }>;
      title?: string;
      linkedin_url?: string;
      organization?: {
        name?: string;
        website_url?: string;
        linkedin_url?: string;
        estimated_num_employees?: number;
        industry?: string;
        annual_revenue?: number;
      };
      city?: string;
      state?: string;
      country?: string;
    }) => ({
      user_id: user.id,
      full_name: person.first_name && person.last_name 
        ? `${person.first_name} ${person.last_name}` 
        : person.name || "Unknown",
      email: person.email || null,
      phone: person.phone_numbers?.[0]?.sanitized_number || null,
      job_title: person.title || null,
      linkedin_url: person.linkedin_url || null,
      company_name: person.organization?.name || null,
      company_website: person.organization?.website_url || null,
      company_size: person.organization?.estimated_num_employees 
        ? categorizeCompanySize(person.organization.estimated_num_employees)
        : null,
      industry: person.organization?.industry || industry || null,
      company_revenue: person.organization?.annual_revenue
        ? categorizeRevenue(person.organization.annual_revenue)
        : revenueTier || null,
      source: "apollo",
      status: "new",
    }));

    // Insert leads into database
    const { data: insertedLeads, error: insertError } = await supabase
      .from("leads")
      .insert(leads)
      .select();

    if (insertError) {
      console.error("Error inserting leads:", insertError);
      throw insertError;
    }

    // Log usage
    await logUsage(user.id, "lead_search", insertedLeads?.length || 0, {
      source: "apollo",
      country,
      city,
      industry,
    });

    return new Response(
      JSON.stringify({
        success: true,
        leads: insertedLeads,
        count: insertedLeads?.length || 0,
        source: "apollo",
        remaining: usageCheck.remaining - (insertedLeads?.length || 0),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Apollo search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function categorizeCompanySize(employees: number): string {
  if (employees <= 10) return "1-10";
  if (employees <= 50) return "11-50";
  if (employees <= 200) return "51-200";
  if (employees <= 500) return "201-500";
  if (employees <= 1000) return "501-1000";
  if (employees <= 5000) return "1001-5000";
  return "5001+";
}

function categorizeRevenue(revenue: number): string {
  if (revenue < 1000000) return "$0-1M";
  if (revenue < 10000000) return "$1M-10M";
  if (revenue < 50000000) return "$10M-50M";
  if (revenue < 100000000) return "$50M-100M";
  if (revenue < 500000000) return "$100M-500M";
  return "$500M+";
}

async function generateFallbackLeads(
  userId: string,
  params: ApolloSearchRequest
): Promise<Response> {
  console.log("Using AI fallback for lead generation");
  
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createServiceClient();

  const prompt = `Generate ${params.limit || 10} realistic B2B sales leads with the following criteria:
- Location: ${params.city ? `${params.city}, ` : ""}${params.country || "United States"}
- Industry: ${params.industry || "Technology"}
- Company Size: ${params.companySize || "50-200 employees"}
- Target Job Titles: ${params.jobTitles?.join(", ") || "Decision makers"}
- Revenue Tier: ${params.revenueTier || "$10M-50M"}

Return a JSON array with these exact fields for each lead:
- full_name: Realistic full name appropriate for the region
- email: Professional email (firstname.lastname@company.com format)
- phone: Valid phone number format for the country
- job_title: One of the target titles
- company_name: Realistic company name
- company_website: Website URL
- linkedin_url: LinkedIn profile URL format
- company_size: Employee range
- industry: The industry
- company_revenue: Revenue tier

IMPORTANT: Generate realistic, diverse data. Include proper international phone formats.
Return ONLY the JSON array, no markdown or explanation.`;

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a B2B lead data generator. Generate realistic, professional lead data." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
    }),
  });

  if (!aiResponse.ok) {
    throw new Error("Failed to generate leads with AI");
  }

  const aiData = await aiResponse.json();
  let leadsContent = aiData.choices[0]?.message?.content || "[]";

  // Clean up response
  leadsContent = leadsContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  
  let parsedLeads;
  try {
    parsedLeads = JSON.parse(leadsContent);
  } catch {
    console.error("Failed to parse AI response:", leadsContent);
    parsedLeads = [];
  }

  const leads = parsedLeads.map((lead: Record<string, unknown>) => ({
    ...lead,
    user_id: userId,
    source: "ai_generated",
    status: "new",
  }));

  const { data: insertedLeads, error: insertError } = await supabase
    .from("leads")
    .insert(leads)
    .select();

  if (insertError) throw insertError;

  await logUsage(userId, "lead_search", insertedLeads?.length || 0, {
    source: "ai_fallback",
    country: params.country,
    industry: params.industry,
  });

  return new Response(
    JSON.stringify({
      success: true,
      leads: insertedLeads,
      count: insertedLeads?.length || 0,
      source: "ai_generated",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
