import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Loader2, Bot, User, PhoneCall, PhoneOff, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

interface AICallPanelProps {
  lead: Lead;
}

const CALL_SCRIPTS = {
  cold_outreach: {
    name: "Cold Outreach",
    description: "First-time call to qualify the lead and book a demo",
    steps: [
      "Introduce yourself as Alex from TechMarqX",
      "Check if it's a good time to talk",
      "Pitch TechMarqX value proposition",
      "Ask qualification questions",
      "Discover pain points",
      "Offer demo booking",
      "Handle objections gracefully",
      "End call professionally",
    ],
  },
  follow_up: {
    name: "Follow-Up Call",
    description: "Follow up on previous interest to move deal forward",
    steps: [
      "Reconnect with warm greeting",
      "Reference previous conversation",
      "Check if needs have changed",
      "Remind of value proposition",
      "Push for demo or next step",
      "Handle any concerns",
      "Confirm next action",
    ],
  },
  demo_booking: {
    name: "Demo Booking",
    description: "Direct call to schedule a product demo",
    steps: [
      "Confirm interest in seeing the platform",
      "Highlight 15-minute demo format",
      "Ask about specific challenges",
      "Identify additional stakeholders",
      "Propose specific time slots",
      "Confirm booking details",
    ],
  },
};

const AICallPanel = ({ lead }: AICallPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [callType, setCallType] = useState<"ai_agent" | "manual">("ai_agent");
  const [scriptType, setScriptType] = useState<"cold_outreach" | "follow_up" | "demo_booking">("cold_outreach");
  const [isInitiating, setIsInitiating] = useState(false);
  const [callState, setCallState] = useState<"idle" | "connecting" | "in_progress" | "ended">("idle");
  const [callData, setCallData] = useState<{
    id: string;
    script: string;
  } | null>(null);
  const [notes, setNotes] = useState("");

  const selectedScript = CALL_SCRIPTS[scriptType];

  const handleInitiateCall = async () => {
    if (!lead.phone) {
      toast.error("This lead doesn't have a phone number");
      return;
    }

    setIsInitiating(true);
    setCallState("connecting");

    try {
      // Use real Twilio integration
      const response = await supabase.functions.invoke("twilio-call", {
        body: {
          leadId: lead.id,
          toPhoneNumber: lead.phone,
          callType,
          scriptType,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (data.success) {
        setCallData({
          id: data.callId,
          script: CALL_SCRIPTS[scriptType]?.steps.join("\n• ") || "",
        });
        setCallState("in_progress");
        toast.success("Call initiated via Twilio", {
          description: `Calling ${lead.phone}...`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Call initiation error:", error);
      setCallState("idle");
      if (error instanceof Error && error.message.includes("429")) {
        toast.error("Call limit exceeded. Please upgrade your plan.");
      } else if (error instanceof Error && error.message.includes("Twilio credentials")) {
        toast.error("Twilio not configured. Please add your Twilio credentials.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to initiate call");
      }
    } finally {
      setIsInitiating(false);
    }
  };

  const handleEndCall = async () => {
    if (!callData?.id) return;

    try {
      const response = await supabase.functions.invoke("complete-call", {
        body: {
          callId: callData.id,
          outcome: "completed",
          notes,
          durationSeconds: 180, // Simulated duration
        },
      });

      if (response.error) {
        console.error("Error completing call:", response.error);
      }

      setCallState("ended");
      toast.success("Call completed and logged");
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  const resetCall = () => {
    setCallState("idle");
    setCallData(null);
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetCall();
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary hover:bg-primary/10"
          disabled={!lead.phone}
        >
          <Phone className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            AI Sales Call
          </DialogTitle>
          <DialogDescription>
            Initiate an AI-powered sales call to {lead.full_name}
          </DialogDescription>
        </DialogHeader>

        {/* Lead Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{lead.full_name}</h3>
              <p className="text-sm text-muted-foreground">{lead.job_title} at {lead.company_name}</p>
              <p className="text-sm font-mono mt-1">{lead.phone}</p>
            </div>
          </div>
        </div>

        {callState === "idle" && (
          <>
            {/* Call Type Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Call Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={callType === "ai_agent" ? "default" : "outline"}
                    className={callType === "ai_agent" ? "bg-hero-gradient" : ""}
                    onClick={() => setCallType("ai_agent")}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    AI Agent Call
                  </Button>
                  <Button
                    variant={callType === "manual" ? "default" : "outline"}
                    onClick={() => setCallType("manual")}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Manual Call
                  </Button>
                </div>
              </div>

              {callType === "ai_agent" && (
                <div className="space-y-2">
                  <Label>Call Script</Label>
                  <Select value={scriptType} onValueChange={(v) => setScriptType(v as typeof scriptType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                      <SelectItem value="follow_up">Follow-Up Call</SelectItem>
                      <SelectItem value="demo_booking">Demo Booking</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="bg-muted/30 rounded-lg p-4 mt-3">
                    <h4 className="font-medium text-sm mb-2">{selectedScript.name}</h4>
                    <p className="text-xs text-muted-foreground mb-3">{selectedScript.description}</p>
                    <div className="space-y-2">
                      {selectedScript.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px] px-1.5">{i + 1}</Badge>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-hero-gradient hover:opacity-90" 
                onClick={handleInitiateCall}
                disabled={isInitiating}
              >
                {isInitiating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 mr-2" />
                    Start Call
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {callState === "connecting" && (
          <div className="py-12 text-center">
            <div className="animate-pulse">
              <PhoneCall className="w-16 h-16 mx-auto text-primary mb-4" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connecting Call...</h3>
            <p className="text-sm text-muted-foreground">
              {callType === "ai_agent" ? "Preparing AI agent script" : "Connecting to phone line"}
            </p>
          </div>
        )}

        {callState === "in_progress" && (
          <div className="space-y-4">
            {/* Call Status */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium text-green-700 dark:text-green-400">Call In Progress</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>00:00</span>
                </div>
              </div>
            </div>

            {/* AI Script Display */}
            {callType === "ai_agent" && callData?.script && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  AI Agent Script
                </Label>
                <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{callData.script}</pre>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Call Notes</Label>
              <Textarea
                placeholder="Add notes about the call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              variant="destructive" 
              className="w-full" 
              onClick={handleEndCall}
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              End Call
            </Button>
          </div>
        )}

        {callState === "ended" && (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Call Completed</h3>
            <p className="text-sm text-muted-foreground mb-6">
              The call has been logged and the lead status updated.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button className="flex-1" onClick={resetCall}>
                Make Another Call
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AICallPanel;
