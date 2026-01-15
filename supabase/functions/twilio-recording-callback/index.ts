import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { validateTwilioSignature, parseFormDataForValidation } from "../_shared/twilio-validation.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");

    if (!callId) {
      return new Response("Missing callId", { status: 400 });
    }

    // Parse form data and validate Twilio signature
    const { formData, params } = await parseFormDataForValidation(req);
    
    if (!validateTwilioSignature(req, params)) {
      console.error("Invalid Twilio signature for recording callback");
      return new Response("Unauthorized", { status: 403 });
    }

    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingDuration = formData.get("RecordingDuration") as string;

    console.log(`Recording for call ${callId}:`, { recordingUrl, recordingSid, recordingDuration });

    const supabase = createServiceClient();

    // Update call with recording URL
    await supabase
      .from("calls")
      .update({
        recording_url: recordingUrl ? `${recordingUrl}.mp3` : null,
        metadata: {
          recording_sid: recordingSid,
          recording_duration: recordingDuration,
        },
      })
      .eq("id", callId);

    return new Response("OK", { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" } 
    });
  } catch (error: unknown) {
    console.error("Recording callback error:", error);
    return new Response("Error", { status: 500 });
  }
});
