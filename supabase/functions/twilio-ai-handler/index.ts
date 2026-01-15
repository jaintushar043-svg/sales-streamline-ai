import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { validateTwilioSignature, parseFormDataForValidation } from "../_shared/twilio-validation.ts";

// AI Sales Script Templates
const SCRIPTS = {
  cold_outreach: {
    intro: "Hi {leadName}, this is Alex from TechMarqX. I noticed {companyName} has been growing rapidly, and I wanted to share how we've helped similar companies streamline their sales outreach. Do you have a quick moment?",
    pitch: "We help B2B sales teams automate lead discovery and outreach, typically saving 20+ hours per week while improving conversion rates by 35%.",
    qualification: "Are you currently handling lead generation in-house, or working with any tools for prospecting?",
    pain_discovery: "What would you say is your biggest challenge when it comes to finding and reaching the right decision-makers?",
    cta: "I'd love to show you exactly how this works in a quick 15-minute demo. Would tomorrow or Thursday work better for you?",
  },
  follow_up: {
    intro: "Hi {leadName}, it's Alex from TechMarqX following up. We spoke briefly about how we could help {companyName} with your sales outreach. Is this still a priority for you?",
    pitch: "Just wanted to circle back - we've had some exciting updates that I think would be really relevant for your team.",
    qualification: "Have you had a chance to think about what we discussed?",
    pain_discovery: "Has anything changed in terms of your outreach challenges since we last spoke?",
    cta: "I'd love to get that demo scheduled. What does your calendar look like this week?",
  },
  demo_booking: {
    intro: "Hi {leadName}, this is Alex from TechMarqX. I understand you're interested in seeing how our platform can help {companyName}. I'm calling to get that demo scheduled.",
    pitch: "Our demo takes about 15 minutes and I'll show you exactly how you can start generating qualified leads within your first week.",
    qualification: "What specific challenges are you hoping our platform can help solve?",
    pain_discovery: "Perfect. And who else from your team should we include in the demo?",
    cta: "Great. Let me check my calendar - would tomorrow at 2 PM or Thursday at 10 AM work better for you?",
  },
};

serve(async (req) => {
  try {
    // For POST requests (Twilio callbacks), validate the signature
    if (req.method === "POST") {
      const { params } = await parseFormDataForValidation(req);
      
      if (!validateTwilioSignature(req, params)) {
        console.error("Invalid Twilio signature for AI handler");
        return new Response("Unauthorized", { status: 403 });
      }
    }

    const url = new URL(req.url);
    const callId = url.searchParams.get("callId");
    const leadName = url.searchParams.get("leadName") || "there";
    const companyName = url.searchParams.get("companyName") || "your company";
    const scriptType = url.searchParams.get("scriptType") as keyof typeof SCRIPTS || "cold_outreach";

    const script = SCRIPTS[scriptType] || SCRIPTS.cold_outreach;
    const introText = script.intro
      .replace("{leadName}", leadName)
      .replace("{companyName}", companyName);

    // Generate TwiML for AI-powered conversation
    // This uses Twilio's <Gather> with speech recognition
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${introText}</Say>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="${Deno.env.get("SUPABASE_URL")}/functions/v1/twilio-ai-response?callId=${callId}&amp;stage=intro&amp;scriptType=${scriptType}&amp;leadName=${encodeURIComponent(leadName)}&amp;companyName=${encodeURIComponent(companyName)}">
    <Say voice="Polly.Matthew">I'll wait for your response.</Say>
  </Gather>
  <Say voice="Polly.Matthew">I didn't catch that. Let me leave my contact information. You can reach us at info@techmarqx.com. Have a great day!</Say>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error: unknown) {
    console.error("AI handler error:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>I apologize, we're experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
    return new Response(errorTwiml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
