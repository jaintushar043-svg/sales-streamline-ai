import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient, getUserFromAuth } from "../_shared/supabase.ts";
import { checkUsageLimit, logUsage } from "../_shared/usage.ts";

interface TwilioCallRequest {
  leadId: string;
  toPhoneNumber: string;
  callType: "manual" | "ai_agent";
  scriptType?: "cold_outreach" | "follow_up" | "demo_booking";
}

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

    const { leadId, toPhoneNumber, callType, scriptType }: TwilioCallRequest = await req.json();

    // Check usage limits
    const usageType = callType === "ai_agent" ? "ai_call" : "manual_call";
    const usageCheck = await checkUsageLimit(user.id, usageType, 1);

    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Usage limit exceeded", 
          remaining: usageCheck.remaining,
          limit: usageCheck.limit 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createServiceClient();

    // Fetch lead info for personalization
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    // Create call record
    const { data: callRecord, error: callError } = await supabase
      .from("calls")
      .insert({
        user_id: user.id,
        lead_id: leadId,
        call_type: callType,
        phone_number: toPhoneNumber,
        status: "initiating",
        ai_script_type: scriptType || null,
      })
      .select()
      .single();

    if (callError) throw callError;

    // Build TwiML for the call
    const twimlUrl = callType === "ai_agent" 
      ? `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-ai-handler?callId=${callRecord.id}&leadName=${encodeURIComponent(lead?.full_name || "there")}&companyName=${encodeURIComponent(lead?.company_name || "your company")}&scriptType=${scriptType || "cold_outreach"}`
      : undefined;

    // Make Twilio API call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const callParams = new URLSearchParams({
      To: toPhoneNumber,
      From: twilioPhoneNumber,
      Record: "true",
      RecordingStatusCallback: `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-recording-callback?callId=${callRecord.id}`,
      StatusCallback: `${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-status-callback?callId=${callRecord.id}`,
      StatusCallbackEvent: "initiated ringing answered completed",
    });

    if (twimlUrl) {
      callParams.set("Url", twimlUrl);
    } else {
      // For manual calls, just connect
      callParams.set("Twiml", `<Response><Say>Connecting you now.</Say><Dial>${toPhoneNumber}</Dial></Response>`);
    }

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: callParams.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      
      // Update call status to failed
      await supabase
        .from("calls")
        .update({ status: "failed", notes: JSON.stringify(twilioData) })
        .eq("id", callRecord.id);

      return new Response(
        JSON.stringify({ error: "Failed to initiate call", details: twilioData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update call with Twilio SID
    await supabase
      .from("calls")
      .update({ 
        call_sid: twilioData.sid,
        status: "pending",
        started_at: new Date().toISOString(),
      })
      .eq("id", callRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        callId: callRecord.id,
        callSid: twilioData.sid,
        status: twilioData.status,
        remainingMinutes: usageCheck.remaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Twilio call error:", error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
