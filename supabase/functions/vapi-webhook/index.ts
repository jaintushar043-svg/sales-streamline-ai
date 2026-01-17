import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VapiWebhookPayload {
  message: {
    type: string;
    call?: {
      id: string;
      status?: string;
      endedReason?: string;
      transcript?: string;
      recordingUrl?: string;
      summary?: string;
      startedAt?: string;
      endedAt?: string;
      cost?: number;
      metadata?: {
        userId?: string;
        leadId?: string;
        scriptType?: string;
      };
    };
    transcript?: string;
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
      summary?: string;
      messages?: Array<{
        role: string;
        message: string;
        time: number;
      }>;
    };
    analysis?: {
      summary?: string;
      successEvaluation?: string;
    };
    endedReason?: string;
    cost?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: VapiWebhookPayload = await req.json();
    console.log("Vapi webhook received:", JSON.stringify(payload, null, 2));

    const message = payload.message;
    const messageType = message?.type;
    const callData = message?.call;

    if (!messageType) {
      console.log("No message type in webhook");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const vapiCallId = callData?.id;

    if (!vapiCallId) {
      console.log("No call ID in webhook payload");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the call record by vapi_call_id
    const { data: existingCall, error: findError } = await supabase
      .from("calls")
      .select("*")
      .eq("vapi_call_id", vapiCallId)
      .maybeSingle();

    if (findError) {
      console.error("Error finding call:", findError);
    }

    switch (messageType) {
      case "call-started":
      case "status-update": {
        console.log(`Call ${vapiCallId} status update:`, callData?.status);
        
        if (existingCall) {
          const newStatus = callData?.status === "in-progress" ? "in_progress" : callData?.status;
          await supabase
            .from("calls")
            .update({
              status: newStatus || "in_progress",
              started_at: callData?.startedAt || new Date().toISOString(),
            })
            .eq("id", existingCall.id);
        }
        break;
      }

      case "transcript": {
        // Partial transcript update during the call
        console.log("Transcript update received");
        if (existingCall && message.transcript) {
          await supabase
            .from("calls")
            .update({
              transcript: message.transcript,
            })
            .eq("id", existingCall.id);
        }
        break;
      }

      case "end-of-call-report":
      case "call-ended": {
        console.log(`Call ${vapiCallId} ended:`, message.endedReason || callData?.endedReason);
        
        // Extract data from various possible locations in the payload
        const transcript = message.artifact?.transcript || callData?.transcript || "";
        const recordingUrl = message.artifact?.recordingUrl || callData?.recordingUrl;
        const summary = message.analysis?.summary || message.artifact?.summary || callData?.summary;
        const endedReason = message.endedReason || callData?.endedReason;
        
        // Calculate duration
        let durationSeconds = 0;
        if (callData?.startedAt && callData?.endedAt) {
          const startTime = new Date(callData.startedAt).getTime();
          const endTime = new Date(callData.endedAt).getTime();
          durationSeconds = Math.round((endTime - startTime) / 1000);
        }

        // Determine outcome based on transcript analysis
        let outcome = "unknown";
        const transcriptLower = transcript.toLowerCase();
        if (transcriptLower.includes("book") || transcriptLower.includes("schedule") || transcriptLower.includes("calendar")) {
          if (transcriptLower.includes("sounds good") || transcriptLower.includes("let's do it") || transcriptLower.includes("works for me")) {
            outcome = "demo_booked";
          }
        }
        if (transcriptLower.includes("not interested") || transcriptLower.includes("no thank you") || transcriptLower.includes("don't call")) {
          outcome = "not_interested";
        }
        if (endedReason === "customer-did-not-answer") {
          outcome = "no_answer";
        }
        if (endedReason === "voicemail") {
          outcome = "voicemail";
        }

        if (existingCall) {
          await supabase
            .from("calls")
            .update({
              status: "completed",
              transcript: transcript,
              recording_url: recordingUrl,
              vapi_recording_url: recordingUrl,
              ai_summary: summary,
              call_summary: summary,
              outcome: outcome,
              ended_at: callData?.endedAt || new Date().toISOString(),
              duration_seconds: durationSeconds,
              metadata: {
                ...existingCall.metadata,
                ended_reason: endedReason,
                cost: message.cost || callData?.cost,
                success_evaluation: message.analysis?.successEvaluation,
              },
            })
            .eq("id", existingCall.id);

          // Log usage for billing
          const userId = existingCall.user_id;
          if (userId && durationSeconds > 0) {
            const minutes = Math.ceil(durationSeconds / 60);
            await supabase.from("usage_logs").insert({
              user_id: userId,
              usage_type: "ai_call",
              quantity: minutes,
              metadata: {
                call_id: existingCall.id,
                vapi_call_id: vapiCallId,
                duration_seconds: durationSeconds,
                outcome: outcome,
              },
            });
          }

          // Update lead status based on outcome
          if (existingCall.lead_id) {
            let newLeadStatus = "contacted";
            if (outcome === "demo_booked") {
              newLeadStatus = "qualified";
            } else if (outcome === "not_interested") {
              newLeadStatus = "not_interested";
            }

            await supabase
              .from("leads")
              .update({ 
                status: newLeadStatus, 
                updated_at: new Date().toISOString() 
              })
              .eq("id", existingCall.lead_id);
          }
        }
        break;
      }

      case "speech-update": {
        // Real-time speech updates - could be used for live transcript display
        console.log("Speech update received");
        break;
      }

      case "function-call": {
        // Handle any custom function calls from the AI
        console.log("Function call received:", message);
        break;
      }

      default:
        console.log("Unhandled webhook type:", messageType);
    }

    return new Response(
      JSON.stringify({ received: true, type: messageType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Vapi webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
