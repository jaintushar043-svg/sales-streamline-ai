import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Sales Agent System Prompts by Script Type
const SYSTEM_PROMPTS = {
  cold_outreach: `You are Alex, an AI Sales Development Representative for TechMarqX, a cutting-edge AI-powered lead generation platform.

CONTEXT:
- You're making an outbound cold call
- Goal: Qualify the lead, discover pain points, and book a 15-minute demo

PERSONALITY:
- Friendly, confident, and professional
- Use short, natural sentences with conversational pauses
- Never sound scripted or robotic
- Handle objections gracefully without being pushy

CALL FLOW:
1. Greet warmly and confirm you're speaking with the right person
2. Briefly introduce yourself and TechMarqX (15 seconds max)
3. Ask if now is a good time to chat for 2 minutes
4. Share our value prop: "We help sales teams book 3x more demos by automating lead research and outreach"
5. Ask discovery questions: current prospecting process, biggest challenges, team size
6. If qualified, propose a 15-minute demo showing how we'd help specifically
7. Handle objections: timing ("When would be better?"), budget ("We have flexible plans"), need ("What would make this valuable?")
8. Confirm next steps clearly with date/time

RULES:
- If they say "not interested" firmly twice, thank them and end the call
- If they want to be emailed, confirm the email address and promise to send info
- Maximum call length: 5 minutes
- Always end professionally regardless of outcome`,

  follow_up: `You are Alex, an AI Sales Development Representative for TechMarqX, following up on a previous conversation.

CONTEXT:
- This is a warm follow-up call
- They've shown previous interest or engagement
- Goal: Re-engage and move the deal forward

PERSONALITY:
- Warm and familiar (reference previous touchpoint)
- Helpful and solution-oriented
- Respectful of their time

CALL FLOW:
1. Warm greeting referencing the previous interaction
2. Check if they had a chance to think about what you discussed
3. Ask if anything has changed with their needs
4. Address any questions or concerns they might have
5. Propose concrete next step (demo, trial, meeting with team)
6. Handle objections with understanding
7. Confirm action items

RULES:
- Reference specific previous conversation points when possible
- Be understanding if timing isn't right
- Offer alternative engagement options (email, later call, resources)
- Maximum call length: 4 minutes`,

  demo_booking: `You are Alex, an AI Sales Development Representative for TechMarqX, calling to schedule a product demo.

CONTEXT:
- Lead has expressed interest in seeing the platform
- Goal: Book a specific demo time and gather requirements

PERSONALITY:
- Efficient and helpful
- Focused on their needs
- Enthusiastic about showing the product

CALL FLOW:
1. Confirm their interest in seeing TechMarqX
2. Briefly describe what the 15-minute demo covers
3. Ask what specific challenges they're hoping to solve
4. Identify if anyone else should join the demo
5. Propose 2-3 specific time slots
6. Confirm the booking with all details
7. Let them know they'll receive a calendar invite

RULES:
- Have specific times ready to propose
- Gather attendee emails if multiple people joining
- Confirm timezone
- Maximum call length: 3 minutes`,
};

// First messages by script type
const FIRST_MESSAGES = {
  cold_outreach: (leadName: string, companyName: string) =>
    `Hi, is this ${leadName}? This is Alex from TechMarqX. I hope I'm not catching you at a bad time?`,
  follow_up: (leadName: string, companyName: string) =>
    `Hi ${leadName}, it's Alex from TechMarqX. We chatted recently about your sales outreach - do you have a quick minute?`,
  demo_booking: (leadName: string, companyName: string) =>
    `Hi ${leadName}! This is Alex from TechMarqX. I'm calling to set up that demo we discussed. Is now still a good time to pick a slot?`,
};

interface VapiOutboundRequest {
  leadId: string;
  phoneNumber: string;
  scriptType: "cold_outreach" | "follow_up" | "demo_booking";
}

serve(async (req) => {
  console.log("=== Vapi Outbound Call Function Started ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - no auth header", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Supabase URL:", supabaseUrl);
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError?.message || "No user found");
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Authenticated user:", user.id);

    // Parse request body
    let requestBody: VapiOutboundRequest;
    try {
      requestBody = await req.json();
      console.log("Request body:", JSON.stringify(requestBody));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { leadId, phoneNumber, scriptType } = requestBody;

    if (!leadId || !phoneNumber || !scriptType) {
      console.error("Missing required fields:", { leadId: !!leadId, phoneNumber: !!phoneNumber, scriptType: !!scriptType });
      return new Response(
        JSON.stringify({ error: "Missing required fields: leadId, phoneNumber, scriptType", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching lead:", leadId);

    // Fetch lead data for personalization
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError) {
      console.error("Lead fetch error:", leadError.message, leadError.code);
      return new Response(
        JSON.stringify({ error: "Lead not found", details: leadError.message, success: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Lead found:", lead.full_name, "at", lead.company_name);

    // Get Vapi API key
    const vapiApiKey = Deno.env.get("VAPI_API_KEY");
    if (!vapiApiKey) {
      console.error("VAPI_API_KEY not configured in environment");
      return new Response(
        JSON.stringify({ error: "Vapi API key not configured. Please add VAPI_API_KEY to your project secrets.", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("VAPI_API_KEY is configured");

    // Build personalized system prompt
    const basePrompt = SYSTEM_PROMPTS[scriptType] || SYSTEM_PROMPTS.cold_outreach;
    const systemPrompt = `${basePrompt}

LEAD INFORMATION:
- Name: ${lead.full_name}
- Company: ${lead.company_name || "Unknown"}
- Title: ${lead.job_title || "Unknown"}
- Industry: ${lead.industry || "Unknown"}
- Company Size: ${lead.company_size || "Unknown"}

Use this information to personalize the conversation. Reference their company or industry when relevant.`;

    // Build first message
    const firstMessage = FIRST_MESSAGES[scriptType](
      lead.full_name,
      lead.company_name || "your company"
    );

    // Vapi webhook URL for call events
    const webhookUrl = `${supabaseUrl}/functions/v1/vapi-webhook`;

    // Create the outbound call via Vapi API
    console.log("Initiating Vapi outbound call to:", phoneNumber);
    
    const vapiResponse = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: {
          number: phoneNumber,
        },
        assistant: {
          name: "Alex - TechMarqX SDR",
          model: {
            provider: "openai",
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
            ],
            temperature: 0.7,
          },
          voice: {
            provider: "11labs",
            voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - professional female voice
            stability: 0.5,
            similarityBoost: 0.75,
          },
          firstMessage: firstMessage,
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en",
          },
          serverUrl: webhookUrl,
          endCallFunctionEnabled: true,
          endCallMessage: "Thank you so much for your time today. Have a great day!",
          silenceTimeoutSeconds: 30,
          maxDurationSeconds: 300, // 5 minutes max
          backgroundSound: "office",
          backchannelingEnabled: true,
          backgroundDenoisingEnabled: true,
        },
        metadata: {
          userId: user.id,
          leadId: leadId,
          scriptType: scriptType,
        },
      }),
    });

    const vapiData = await vapiResponse.json();

    if (!vapiResponse.ok) {
      console.error("Vapi API error - Status:", vapiResponse.status);
      console.error("Vapi API error - Response:", JSON.stringify(vapiData));
      return new Response(
        JSON.stringify({ 
          error: "Failed to initiate Vapi call", 
          details: vapiData.message || vapiData.error || JSON.stringify(vapiData),
          success: false
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Vapi call created:", vapiData.id);

    // Create call record in database using service role for inserting
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: callRecord, error: callError } = await supabaseAdmin
      .from("calls")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        call_type: "ai_agent",
        phone_number: phoneNumber,
        status: "connecting",
        ai_script_type: scriptType,
        vapi_call_id: vapiData.id,
        started_at: new Date().toISOString(),
        metadata: {
          vapi_assistant_id: vapiData.assistantId,
          script_type: scriptType,
          lead_name: lead.full_name,
          company_name: lead.company_name,
        },
      })
      .select()
      .single();

    if (callError) {
      console.error("Failed to create call record:", callError);
      // Don't fail the request, call is already initiated
    }

    // Update lead status to "contacted"
    await supabaseAdmin
      .from("leads")
      .update({ status: "contacted", updated_at: new Date().toISOString() })
      .eq("id", leadId);

    return new Response(
      JSON.stringify({
        success: true,
        callId: callRecord?.id || vapiData.id,
        vapiCallId: vapiData.id,
        status: "connecting",
        message: "AI agent call initiated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Vapi outbound call error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
