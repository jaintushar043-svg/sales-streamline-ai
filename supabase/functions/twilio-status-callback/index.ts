import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { logUsage } from "../_shared/usage.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");

    if (!callId) {
      return new Response("Missing callId", { status: 400 });
    }

    // Parse form data from Twilio
    const formData = await req.formData();
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const callSid = formData.get("CallSid") as string;

    console.log(`Call ${callId} status update:`, { callStatus, callDuration, callSid });

    const supabase = createServiceClient();

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      "queued": "pending",
      "ringing": "ringing",
      "in-progress": "in_progress",
      "completed": "completed",
      "busy": "failed",
      "failed": "failed",
      "no-answer": "no_answer",
      "canceled": "cancelled",
    };

    const updateData: Record<string, unknown> = {
      status: statusMap[callStatus] || callStatus,
    };

    if (callStatus === "completed" && callDuration) {
      updateData.duration_seconds = parseInt(callDuration, 10);
      updateData.ended_at = new Date().toISOString();

      // Get call record to log usage
      const { data: callRecord } = await supabase
        .from("calls")
        .select("user_id, call_type")
        .eq("id", callId)
        .single();

      if (callRecord) {
        const usageMinutes = Math.ceil(parseInt(callDuration, 10) / 60);
        const usageType = callRecord.call_type === "ai_agent" ? "ai_call" : "manual_call";
        await logUsage(callRecord.user_id, usageType, usageMinutes, {
          call_id: callId,
          call_sid: callSid,
          duration_seconds: parseInt(callDuration, 10),
        });
      }
    }

    if (["failed", "busy", "no-answer", "canceled"].includes(callStatus)) {
      updateData.ended_at = new Date().toISOString();
      updateData.outcome = callStatus === "no-answer" ? "no_answer" : "failed";
    }

    await supabase
      .from("calls")
      .update(updateData)
      .eq("id", callId);

    return new Response("OK", { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" } 
    });
  } catch (error: unknown) {
    console.error("Status callback error:", error);
    return new Response("Error", { status: 500 });
  }
});
