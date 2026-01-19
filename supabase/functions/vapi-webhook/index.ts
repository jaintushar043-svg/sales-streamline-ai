import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-signature",
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
    timestamp?: number;
  };
}

// Verify Vapi webhook signature using HMAC-SHA256
async function verifyVapiSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) {
    console.warn("No signature provided in request");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const data = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
    const expectedSignature = new TextDecoder().decode(encodeHex(new Uint8Array(signatureBuffer)));
    
    // Simple comparison (constant time not strictly needed for HMAC but good practice)
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Check for replay attacks using timestamp
function isReplayAttack(timestamp: number | undefined): boolean {
  if (!timestamp) return false; // Skip check if no timestamp
  
  const now = Date.now();
  const requestTime = timestamp;
  const fiveMinutes = 5 * 60 * 1000;
  
  return Math.abs(now - requestTime) > fiveMinutes;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Vapi webhook received - Method: ${req.method}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    console.error(`[${requestId}] Invalid method: ${req.method}`);
    return new Response(
      JSON.stringify({ error: "Method not allowed", requestId }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature if secret is configured
    const vapiWebhookSecret = Deno.env.get("VAPI_WEBHOOK_SECRET");
    
    if (vapiWebhookSecret) {
      const signature = req.headers.get("x-vapi-signature");
      
      if (!verifyVapiSignature(rawBody, signature, vapiWebhookSecret)) {
        console.error(`[${requestId}] Invalid webhook signature - rejecting request`);
        return new Response(
          JSON.stringify({ error: "Invalid signature", requestId }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[${requestId}] Webhook signature verified successfully`);
    } else {
      console.warn(`[${requestId}] VAPI_WEBHOOK_SECRET not configured - signature verification skipped`);
    }

    // Parse payload
    let payload: VapiWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse webhook payload:`, parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Webhook payload type:`, payload.message?.type);

    // Check for replay attacks
    if (isReplayAttack(payload.message?.timestamp)) {
      console.error(`[${requestId}] Potential replay attack detected - timestamp too old`);
      return new Response(
        JSON.stringify({ error: "Request timestamp expired", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = payload.message;
    const messageType = message?.type;
    const callData = message?.call;

    if (!messageType) {
      console.log(`[${requestId}] No message type in webhook`);
      return new Response(JSON.stringify({ received: true, requestId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase environment variables`);
      return new Response(
        JSON.stringify({ error: "Server configuration error", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const vapiCallId = callData?.id;

    if (!vapiCallId) {
      console.log(`[${requestId}] No call ID in webhook payload`);
      return new Response(JSON.stringify({ received: true, requestId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the call record by vapi_call_id (idempotent lookup)
    const { data: existingCall, error: findError } = await supabase
      .from("calls")
      .select("*")
      .eq("vapi_call_id", vapiCallId)
      .maybeSingle();

    if (findError) {
      console.error(`[${requestId}] Error finding call:`, findError);
    }

    console.log(`[${requestId}] Processing ${messageType} for call ${vapiCallId}, existing record: ${existingCall?.id || 'none'}`);

    switch (messageType) {
      case "call-started":
      case "status-update": {
        console.log(`[${requestId}] Call ${vapiCallId} status update:`, callData?.status);
        
        if (existingCall) {
          const newStatus = callData?.status === "in-progress" ? "in_progress" : callData?.status;
          const { error: updateError } = await supabase
            .from("calls")
            .update({
              status: newStatus || "in_progress",
              started_at: callData?.startedAt || existingCall.started_at || new Date().toISOString(),
            })
            .eq("id", existingCall.id);
            
          if (updateError) {
            console.error(`[${requestId}] Failed to update call status:`, updateError);
          }
        }
        break;
      }

      case "transcript": {
        console.log(`[${requestId}] Transcript update received`);
        if (existingCall && message.transcript) {
          const { error: updateError } = await supabase
            .from("calls")
            .update({
              transcript: message.transcript,
            })
            .eq("id", existingCall.id);
            
          if (updateError) {
            console.error(`[${requestId}] Failed to update transcript:`, updateError);
          }
        }
        break;
      }

      case "end-of-call-report":
      case "call-ended": {
        console.log(`[${requestId}] Call ${vapiCallId} ended:`, message.endedReason || callData?.endedReason);
        
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
          const { error: updateError } = await supabase
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
                ...(typeof existingCall.metadata === 'object' ? existingCall.metadata : {}),
                ended_reason: endedReason,
                cost: message.cost || callData?.cost,
                success_evaluation: message.analysis?.successEvaluation,
              },
            })
            .eq("id", existingCall.id);

          if (updateError) {
            console.error(`[${requestId}] Failed to update call end data:`, updateError);
          }

          // Log usage for billing (idempotent - check if already logged)
          const userId = existingCall.user_id;
          if (userId && durationSeconds > 0) {
            // Check if usage already logged for this call
            const { data: existingUsage } = await supabase
              .from("usage_logs")
              .select("id")
              .eq("user_id", userId)
              .eq("usage_type", "ai_call")
              .contains("metadata", { call_id: existingCall.id })
              .maybeSingle();

            if (!existingUsage) {
              const minutes = Math.ceil(durationSeconds / 60);
              const { error: usageError } = await supabase.from("usage_logs").insert({
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
              
              if (usageError) {
                console.error(`[${requestId}] Failed to log usage:`, usageError);
              }
            } else {
              console.log(`[${requestId}] Usage already logged for call ${existingCall.id}`);
            }
          }

          // Update lead status based on outcome
          if (existingCall.lead_id) {
            let newLeadStatus = "contacted";
            if (outcome === "demo_booked") {
              newLeadStatus = "qualified";
            } else if (outcome === "not_interested") {
              newLeadStatus = "not_interested";
            }

            const { error: leadError } = await supabase
              .from("leads")
              .update({ 
                status: newLeadStatus, 
                updated_at: new Date().toISOString() 
              })
              .eq("id", existingCall.lead_id);
              
            if (leadError) {
              console.error(`[${requestId}] Failed to update lead status:`, leadError);
            }
          }
        }
        break;
      }

      case "speech-update": {
        console.log(`[${requestId}] Speech update received`);
        break;
      }

      case "function-call": {
        console.log(`[${requestId}] Function call received:`, message);
        break;
      }

      default:
        console.log(`[${requestId}] Unhandled webhook type:`, messageType);
    }

    return new Response(
      JSON.stringify({ received: true, type: messageType, requestId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Vapi webhook error:`, error);
    console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : "N/A");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
