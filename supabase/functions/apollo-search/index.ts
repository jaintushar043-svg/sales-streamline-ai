import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
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
  const requestId = crypto.randomUUID();
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  console.log(`[${requestId}] Apollo search request - Method: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.error(`[${requestId}] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: "Method not allowed", success: false, requestId }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const user = await getUserFromAuth(authHeader);

    if (!user) {
      console.error(`[${requestId}] Unauthorized - no valid user`);
      return new Response(
        JSON.stringify({ error: "Unauthorized", success: false, requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    const apolloApiKey = Deno.env.get("APOLLO_API_KEY");

    if (!apolloApiKey) {
      console.error(`[${requestId}] APOLLO_API_KEY not configured`);
      return new Response(
        JSON.stringify({ 
          error: "Apollo API key not configured. Please add your Apollo API key in Settings → Integrations.", 
          success: false,
          requestId 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestBody: ApolloSearchRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", success: false, requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { country, city, industry, companySize, jobTitles, revenueTier, limit = 25 } = requestBody;

    console.log(`[${requestId}] Search params:`, { country, city, industry, companySize, jobTitles: jobTitles?.length, limit });

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id, "lead_search", limit);
    if (!usageCheck.allowed) {
      console.warn(`[${requestId}] Usage limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: "Lead search limit exceeded. Please upgrade your plan.",
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
          success: false,
          requestId
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Apollo API request
    const apolloParams: Record<string, unknown> = {
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

    console.log(`[${requestId}] Apollo API request params:`, JSON.stringify(apolloParams, null, 2));

    // Make Apollo API request with proper authentication
    const apolloResponse = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apolloApiKey,
      },
      body: JSON.stringify(apolloParams),
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error(`[${requestId}] Apollo API error - Status ${apolloResponse.status}:`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Apollo API error: ${apolloResponse.status}. Please check your API key is valid and has credits.`,
          details: errorText,
          success: false,
          requestId
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apolloData = await apolloResponse.json();
    console.log(`[${requestId}] Apollo returned ${apolloData.people?.length || 0} results`);

    if (!apolloData.people || apolloData.people.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          leads: [],
          count: 0,
          source: "apollo",
          message: "No leads found matching your criteria. Try broadening your search filters.",
          requestId
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Transform Apollo data to our lead format
    const leads = apolloData.people.map((person: {
      id: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      email?: string;
      phone_numbers?: Array<{ sanitized_number?: string; raw_number?: string }>;
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
      phone: person.phone_numbers?.[0]?.sanitized_number || person.phone_numbers?.[0]?.raw_number || null,
      job_title: person.title || null,
      linkedin_url: person.linkedin_url || null,
      company_name: person.organization?.name || null,
      company_website: person.organization?.website_url ? 
        (person.organization.website_url.startsWith("http") ? person.organization.website_url : `https://${person.organization.website_url}`) 
        : null,
      company_linkedin_url: person.organization?.linkedin_url || null,
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
      console.error(`[${requestId}] Error inserting leads:`, insertError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to save leads to database",
          details: insertError.message,
          success: false,
          requestId
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log usage
    await logUsage(user.id, "lead_search", insertedLeads?.length || 0, {
      source: "apollo",
      country,
      city,
      industry,
    });

    console.log(`[${requestId}] Successfully inserted ${insertedLeads?.length || 0} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        leads: insertedLeads,
        count: insertedLeads?.length || 0,
        source: "apollo",
        remaining: usageCheck.remaining - (insertedLeads?.length || 0),
        requestId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error(`[${requestId}] Apollo search error:`, error);
    console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : "N/A");
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
        requestId
      }),
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
