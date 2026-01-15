import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { validateTwilioSignature, parseFormDataForValidation } from "../_shared/twilio-validation.ts";

const SCRIPT_STAGES = ["intro", "pitch", "qualification", "pain", "cta", "close"];

const SCRIPTS = {
  cold_outreach: {
    pitch: "That's great to hear. We help B2B sales teams automate lead discovery and outreach, typically saving 20+ hours per week while improving conversion rates by 35%.",
    qualification: "Are you currently handling lead generation in-house, or working with any tools for prospecting?",
    pain: "What would you say is your biggest challenge when it comes to finding and reaching the right decision-makers?",
    cta: "I'd love to show you exactly how this works in a quick 15-minute demo. Would tomorrow or Thursday work better for you?",
    close: "Perfect! I'll send you a calendar invite right away. You'll receive an email shortly with all the details. Thanks so much for your time, and I look forward to speaking with you then!",
  },
  follow_up: {
    pitch: "Just wanted to circle back - we've had some exciting updates that I think would be really relevant for your team.",
    qualification: "Have you had a chance to think about what we discussed?",
    pain: "Has anything changed in terms of your outreach challenges since we last spoke?",
    cta: "I'd love to get that demo scheduled. What does your calendar look like this week?",
    close: "Excellent! I'll get that calendar invite over to you right away. Looking forward to showing you the platform!",
  },
  demo_booking: {
    pitch: "Our demo takes about 15 minutes and I'll show you exactly how you can start generating qualified leads within your first week.",
    qualification: "What specific challenges are you hoping our platform can help solve?",
    pain: "Perfect. And who else from your team should we include in the demo?",
    cta: "Great. Let me check my calendar - would tomorrow at 2 PM or Thursday at 10 AM work better for you?",
    close: "Wonderful! I'm sending the invite now. See you then!",
  },
};

const OBJECTION_HANDLERS: Record<string, string> = {
  "not interested": "I completely understand. Just curious - is it the timing that's not right, or is lead generation not a priority for you right now?",
  "too busy": "I hear you, I know how packed schedules can get. What if we scheduled something for next week? It's just 15 minutes and could save your team hours.",
  "already have a solution": "That's great that you're already investing in this area. What's working well for you? I'd love to share how we've helped similar companies enhance their existing setup.",
  "not the right person": "I appreciate you letting me know. Who would be the best person to speak with about your sales and lead generation strategy?",
  "send email": "Absolutely, I can do that. But let me ask - what specific information would be most valuable for you? That way I can make sure I'm sending something relevant.",
  "how much": "Great question. Our pricing depends on your team size and needs. The demo would help me understand exactly what you need so I can give you accurate pricing. Plus, we have flexible plans starting from just a few hundred a month.",
};

serve(async (req) => {
  try {
    // Validate Twilio signature
    const { formData, params } = await parseFormDataForValidation(req);
    
    if (!validateTwilioSignature(req, params)) {
      console.error("Invalid Twilio signature for AI response");
      return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");
    const currentStage = url.searchParams.get("stage") || "intro";
    const scriptType = url.searchParams.get("scriptType") as keyof typeof SCRIPTS || "cold_outreach";
    const leadName = url.searchParams.get("leadName") || "there";
    const companyName = url.searchParams.get("companyName") || "your company";

    const speechResult = (formData.get("SpeechResult") as string) || "";
    const confidence = formData.get("Confidence") as string;

    console.log(`Call ${callId} - Stage: ${currentStage}, Speech: "${speechResult}", Confidence: ${confidence}`);

    const supabase = createServiceClient();

    // Store transcript
    if (callId && speechResult) {
      const { data: existingCall } = await supabase
        .from("calls")
        .select("transcript")
        .eq("id", callId)
        .single();

      const existingTranscript = existingCall?.transcript || "";
      const newTranscript = `${existingTranscript}\n[User - ${currentStage}]: ${speechResult}`;

      await supabase
        .from("calls")
        .update({ transcript: newTranscript.trim() })
        .eq("id", callId);
    }

    const script = SCRIPTS[scriptType] || SCRIPTS.cold_outreach;
    const speechLower = speechResult.toLowerCase();

    // Check for objections first
    let responseText = "";
    let nextStage = currentStage;

    // Detect objections
    const objectionMatch = Object.entries(OBJECTION_HANDLERS).find(([key]) => 
      speechLower.includes(key) || 
      (key === "not interested" && (speechLower.includes("no") || speechLower.includes("not now"))) ||
      (key === "too busy" && speechLower.includes("busy"))
    );

    if (objectionMatch) {
      responseText = objectionMatch[1];
      // Stay at current stage after handling objection
    } else if (speechLower.includes("yes") || speechLower.includes("sure") || speechLower.includes("okay") || speechLower.includes("tell me more")) {
      // Positive response - move to next stage
      const currentIndex = SCRIPT_STAGES.indexOf(currentStage);
      nextStage = SCRIPT_STAGES[Math.min(currentIndex + 1, SCRIPT_STAGES.length - 1)];
      responseText = script[nextStage as keyof typeof script] || script.close;
    } else if (speechLower.includes("demo") || speechLower.includes("schedule") || speechLower.includes("meeting")) {
      // Jump to CTA
      nextStage = "cta";
      responseText = script.cta;
    } else {
      // Default: acknowledge and continue script
      const currentIndex = SCRIPT_STAGES.indexOf(currentStage);
      nextStage = SCRIPT_STAGES[Math.min(currentIndex + 1, SCRIPT_STAGES.length - 1)];
      responseText = `I appreciate that. ${script[nextStage as keyof typeof script] || script.close}`;
    }

    // Check if we should end the call
    const shouldEnd = nextStage === "close" || 
      speechLower.includes("goodbye") || 
      speechLower.includes("not interested") ||
      speechLower.includes("take me off");

    let twiml: string;

    if (shouldEnd && nextStage === "close") {
      // Successful close
      if (callId) {
        await supabase
          .from("calls")
          .update({ outcome: "demo_booked" })
          .eq("id", callId);
      }

      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${script.close}</Say>
  <Hangup/>
</Response>`;
    } else if (shouldEnd) {
      // Unsuccessful end
      if (callId) {
        await supabase
          .from("calls")
          .update({ outcome: "not_interested" })
          .eq("id", callId);
      }

      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">I understand. Thank you for your time today. If anything changes, feel free to reach out to us at info@techmarqx.com. Have a great day!</Say>
  <Hangup/>
</Response>`;
    } else {
      // Continue conversation
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${responseText}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-ai-response?callId=${callId}&amp;stage=${nextStage}&amp;scriptType=${scriptType}&amp;leadName=${encodeURIComponent(leadName)}&amp;companyName=${encodeURIComponent(companyName)}">
    <Say voice="Polly.Matthew">Go ahead, I'm listening.</Say>
  </Gather>
  <Say voice="Polly.Matthew">I didn't catch that. Let me know if you're still there.</Say>
  <Gather input="speech" timeout="3" speechTimeout="auto" action="${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-ai-response?callId=${callId}&amp;stage=${nextStage}&amp;scriptType=${scriptType}&amp;leadName=${encodeURIComponent(leadName)}&amp;companyName=${encodeURIComponent(companyName)}">
  </Gather>
  <Say voice="Polly.Matthew">Thank you for your time. Feel free to reach out if you have any questions. Goodbye!</Say>
  <Hangup/>
</Response>`;
    }

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error: unknown) {
    console.error("AI response error:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I apologize, we're experiencing technical difficulties. Thank you for your time.</Say>
  <Hangup/>
</Response>`;
    return new Response(errorTwiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
