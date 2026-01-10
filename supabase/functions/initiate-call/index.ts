import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { checkUsageLimit, logUsage } from "../_shared/usage.ts";

interface CallRequest {
  leadId: string;
  callType: "manual" | "ai_agent";
  scriptType?: "cold_outreach" | "follow_up";
  phoneNumber?: string;
}

const AI_SCRIPTS = {
  cold_outreach: `You are Alex, an AI Sales Development Representative calling from TechMarqX.

GOAL: Qualify the lead, understand their pain points, and book a demo.

CALL FLOW:
1. INTRO: "Hi {{first_name}}, this is Alex calling from TechMarqX. Did I catch you at a bad time?"
2. If busy: "No worries — when should I call you back?"
3. If available: "Quick reason for calling — we help B2B teams automate LinkedIn lead generation, CRM sync, and first sales calls using AI."
4. QUALIFICATION: "Are you currently doing outbound sales or LinkedIn outreach?"
5. PAIN DISCOVERY: "How are you managing lead research and CRM updates today? Manual or automated?"
6. VALUE PITCH: "TechMarqX automatically finds decision-makers, enriches their data, pushes them into your CRM, and even makes the first call using AI. Your reps only talk to interested prospects."
7. CTA: "Would it make sense to show you this in a quick 10-minute demo?"
8. If yes: "Perfect. What day works best for you?"
9. If no: "No problem at all. Can I send you a short overview email in case it's useful later?"
10. END: "Thanks {{first_name}}. Have a great day!"

RULES:
- Be polite, confident, human-like
- Short sentences, no robotic tone
- Never sound like a bot
- If lead says "busy", ask for callback time`,

  follow_up: `You are Alex, an AI Sales Development Representative following up from TechMarqX.

GOAL: Follow up on previous interest and book a demo.

CALL FLOW:
1. INTRO: "Hi {{first_name}}, this is Alex from TechMarqX. We spoke briefly before about automating your sales outreach. How have you been?"
2. RECONNECT: "I wanted to follow up because I know you were interested in streamlining your lead generation process."
3. CHECK-IN: "Has anything changed since we last spoke? Are you still looking to automate your LinkedIn outreach?"
4. VALUE REMINDER: "Just as a reminder, we help teams save 60-70% of their time on lead research and CRM data entry."
5. CTA: "I'd love to show you exactly how it works. Do you have 10 minutes this week for a quick demo?"
6. HANDLE OBJECTIONS gracefully
7. END: "Great, I'll send you a calendar invite. Thanks for your time!"

RULES:
- Reference previous conversation
- Be warm and personable
- Don't be pushy`,
};

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

    const { leadId, callType, scriptType, phoneNumber }: CallRequest = await req.json();

    // Check usage limits
    const usageType = callType === "ai_agent" ? "ai_call" : "manual_call";
    const usageCheck = await checkUsageLimit(user.id, usageType, 1);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `${callType === "ai_agent" ? "AI calling" : "Manual calling"} limit exceeded`,
          remaining: usageCheck.remaining,
          limit: usageCheck.limit,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Fetch lead information
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetPhone = phoneNumber || lead.phone;
    if (!targetPhone) {
      return new Response(
        JSON.stringify({ error: "No phone number available for this lead" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create call record
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        call_type: callType,
        phone_number: targetPhone,
        status: "pending",
        ai_script_type: scriptType,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (callError) throw callError;

    // For AI agent calls, prepare the script
    let aiScript = null;
    if (callType === "ai_agent" && scriptType) {
      aiScript = AI_SCRIPTS[scriptType]
        .replace(/\{\{first_name\}\}/g, lead.full_name.split(" ")[0])
        .replace(/\{\{company\}\}/g, lead.company_name || "your company");
    }

    // In a real implementation, this would:
    // 1. Initiate a Twilio call
    // 2. For AI calls, connect to a speech-to-text/text-to-speech pipeline
    // 3. For manual calls, connect to the user's phone
    
    // For now, we'll return the call details and script
    return new Response(
      JSON.stringify({
        success: true,
        call: {
          id: call.id,
          status: "initiated",
          lead: {
            name: lead.full_name,
            company: lead.company_name,
            phone: targetPhone,
          },
          type: callType,
          script: aiScript,
        },
        message: callType === "ai_agent" 
          ? "AI agent call initiated. The AI will follow the provided script."
          : "Manual call initiated. Connect to proceed.",
        usage: {
          remaining: usageCheck.remaining - 1,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Initiate call error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
