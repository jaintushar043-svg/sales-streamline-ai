import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Phone, Loader2, Bot, User, PhoneCall, PhoneOff, MessageSquare, Clock, CheckCircle2, FlaskConical, Zap, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { RealtimeChannel } from "@supabase/supabase-js";

type Lead = Tables<"leads">;

interface AICallPanelProps {
  lead: Lead;
}

const CALL_SCRIPTS = {
  cold_outreach: {
    name: "Cold Outreach",
    description: "First-time call to qualify the lead and book a demo",
    aiDescription: "AI will introduce TechMarqX, qualify the lead, discover pain points, and attempt to book a demo.",
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
    aiDescription: "AI will reference previous interactions, check for changes in needs, and push for next steps.",
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
    aiDescription: "AI will confirm interest, gather requirements, and book a specific demo time.",
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
  const [scriptType, setScriptType] = useState<"cold_outreach" | "follow_up" | "demo_booking">("cold_outreach");
  const [isInitiating, setIsInitiating] = useState(false);
  const [callState, setCallState] = useState<"idle" | "connecting" | "in_progress" | "ended">("idle");
  const [callData, setCallData] = useState<{
    id: string;
    vapiCallId?: string;
    transcript?: string;
    summary?: string;
    outcome?: string;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [demoMode, setDemoMode] = useState(false); // Default to real mode now
  const [callDuration, setCallDuration] = useState(0);
  const [demoTranscript, setDemoTranscript] = useState<string[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  const selectedScript = CALL_SCRIPTS[scriptType];

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "in_progress") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Subscribe to real-time call updates
  const subscribeToCallUpdates = useCallback((callId: string) => {
    console.log("Subscribing to call updates for:", callId);
    
    const channel = supabase
      .channel(`call-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `id=eq.${callId}`,
        },
        (payload) => {
          console.log("Call update received:", payload.new);
          const updatedCall = payload.new as Record<string, unknown>;
          
          // Update call state based on status
          const status = updatedCall.status as string;
          if (status === "in_progress") {
            setCallState("in_progress");
          } else if (status === "completed" || status === "failed") {
            setCallState("ended");
            setCallData((prev) => prev ? {
              ...prev,
              transcript: updatedCall.transcript as string || prev.transcript,
              summary: updatedCall.ai_summary as string || updatedCall.call_summary as string,
              outcome: updatedCall.outcome as string,
            } : null);
            
            // Update duration if available
            if (updatedCall.duration_seconds) {
              setCallDuration(updatedCall.duration_seconds as number);
            }
          }
          
          // Update transcript in real-time
          if (updatedCall.transcript) {
            setLiveTranscript(updatedCall.transcript as string);
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);
    return channel;
  }, []);

  // Cleanup realtime subscription
  useEffect(() => {
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [realtimeChannel]);

  // Demo mode transcript simulation
  useEffect(() => {
    if (!demoMode || callState !== "in_progress") return;
    
    const demoMessages = [
      { delay: 2000, speaker: "AI", text: `Hi, is this ${lead.full_name}? This is Alex from TechMarqX. I hope I'm not catching you at a bad time?` },
      { delay: 5000, speaker: "Lead", text: "Yes, this is them. How can I help you?" },
      { delay: 8000, speaker: "AI", text: `Great to connect! I noticed ${lead.company_name} is in the ${lead.industry || "tech"} space. We help companies like yours streamline their sales outreach with AI.` },
      { delay: 12000, speaker: "Lead", text: "Interesting, tell me more." },
      { delay: 15000, speaker: "AI", text: "Our AI-powered platform can help your team book 3x more demos with qualified leads. Would you be open to a quick 15-minute demo?" },
      { delay: 19000, speaker: "Lead", text: "Sure, that sounds useful. What times work?" },
      { delay: 22000, speaker: "AI", text: "Excellent! I have availability tomorrow at 2 PM or Thursday at 10 AM. Which works better for you?" },
    ];

    const timeouts: NodeJS.Timeout[] = [];
    demoMessages.forEach(({ delay, speaker, text }) => {
      const timeout = setTimeout(() => {
        setDemoTranscript((prev) => [...prev, `[${speaker}]: ${text}`]);
      }, delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [demoMode, callState, lead]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInitiateCall = async () => {
    if (!lead.phone) {
      toast.error("This lead doesn't have a phone number");
      return;
    }

    setIsInitiating(true);
    setCallState("connecting");
    setCallDuration(0);
    setDemoTranscript([]);
    setLiveTranscript("");

    try {
      if (demoMode) {
        // Simulate connection delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        setCallData({
          id: `demo-${Date.now()}`,
        });
        setCallState("in_progress");
        toast.success("Demo call started", {
          description: `Simulating AI call to ${lead.phone}...`,
          icon: <FlaskConical className="w-4 h-4" />,
        });
      } else {
        // Use Vapi.ai for real AI voice calls
        console.log("Initiating Vapi call for lead:", lead.id);
        console.log("Phone:", lead.phone);
        console.log("Script type:", scriptType);
        
        const response = await supabase.functions.invoke("vapi-outbound-call", {
          body: {
            leadId: lead.id,
            phoneNumber: lead.phone,
            scriptType,
          },
        });

        console.log("Edge function response:", response);

        // Handle network or invocation errors
        if (response.error) {
          console.error("Vapi call invocation error:", response.error);
          const errorMsg = response.error.message || "Failed to reach edge function";
          throw new Error(errorMsg);
        }

        const data = response.data;
        console.log("Vapi call response data:", data);
        
        // Check for error in response data
        if (!data) {
          throw new Error("No response from edge function");
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.success) {
          setCallData({
            id: data.callId,
            vapiCallId: data.vapiCallId,
          });
          
          // Subscribe to real-time updates for this call
          subscribeToCallUpdates(data.callId);
          
          setCallState("in_progress");
          toast.success("AI Agent call initiated", {
            description: `Vapi AI is calling ${lead.phone}...`,
            icon: <Zap className="w-4 h-4" />,
          });
        } else {
          throw new Error(data.error || "Failed to initiate call");
        }
      }
    } catch (error) {
      console.error("Call initiation error:", error);
      setCallState("idle");
      
      const errorMessage = error instanceof Error ? error.message : "Failed to initiate call";
      
      if (errorMessage.includes("429") || errorMessage.includes("limit")) {
        toast.error("Call limit exceeded. Please upgrade your plan.");
      } else if (errorMessage.includes("Vapi API key")) {
        toast.error("Vapi not configured", {
          description: "Please add your VAPI_API_KEY in the project secrets.",
        });
      } else if (errorMessage.includes("Unauthorized")) {
        toast.error("Please log in to make calls");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsInitiating(false);
    }
  };

  const handleEndCall = async () => {
    if (!callData?.id) return;

    try {
      if (demoMode) {
        setCallState("ended");
        setCallData((prev) => prev ? {
          ...prev,
          outcome: "demo_completed",
          summary: "Demo call completed. In production, this would be a real AI conversation.",
        } : null);
        toast.success("Demo call completed", {
          description: "In production, calls are handled entirely by Vapi AI.",
          icon: <FlaskConical className="w-4 h-4" />,
        });
        return;
      }

      // For real calls, Vapi handles the call end automatically
      // We just update our local state - the webhook will update the database
      const response = await supabase.functions.invoke("complete-call", {
        body: {
          callId: callData.id,
          outcome: "completed",
          notes,
          durationSeconds: callDuration,
        },
      });

      if (response.error) {
        console.error("Error completing call:", response.error);
      }

      setCallState("ended");
      toast.success("Call completed and logged");
    } catch (error) {
      console.error("Error ending call:", error);
      setCallState("ended");
    }
  };

  const resetCall = () => {
    setCallState("idle");
    setCallData(null);
    setNotes("");
    setCallDuration(0);
    setDemoTranscript([]);
    setLiveTranscript("");
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      setRealtimeChannel(null);
    }
  };

  const formatOutcome = (outcome: string | undefined) => {
    switch (outcome) {
      case "demo_booked":
        return { label: "Demo Booked", color: "bg-green-500" };
      case "not_interested":
        return { label: "Not Interested", color: "bg-red-500" };
      case "callback_scheduled":
        return { label: "Callback Scheduled", color: "bg-blue-500" };
      case "voicemail":
        return { label: "Voicemail", color: "bg-yellow-500" };
      case "no_answer":
        return { label: "No Answer", color: "bg-gray-500" };
      default:
        return { label: "Completed", color: "bg-primary" };
    }
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
            AI Voice Agent Call
            <Badge variant="secondary" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              Powered by Vapi
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Start an AI-powered voice call to {lead.full_name}
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
            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-600" />
                <div>
                  <Label htmlFor="demo-mode" className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Demo Mode
                  </Label>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    Simulate calls without making real phone calls
                  </p>
                </div>
              </div>
              <Switch
                id="demo-mode"
                checked={demoMode}
                onCheckedChange={setDemoMode}
              />
            </div>

            {/* AI Voice Info */}
            {!demoMode && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                <Volume2 className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Real AI Voice Agent</p>
                  <p className="text-xs text-muted-foreground">
                    AI agent "Alex" will speak naturally and respond in real-time
                  </p>
                </div>
              </div>
            )}

            {/* Script Selection */}
            <div className="space-y-4">
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
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-sm">{selectedScript.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{selectedScript.aiDescription}</p>
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
                    Start AI Call
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
            <h3 className="text-lg font-semibold mb-2">
              {demoMode ? "Starting Demo..." : "Connecting AI Agent..."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {demoMode 
                ? "Simulating AI agent connection" 
                : "Vapi AI is dialing the phone number"}
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
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {demoMode ? "Demo Call In Progress" : "AI Agent Speaking"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(callDuration)}</span>
                  {demoMode && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      <FlaskConical className="w-3 h-3 mr-1" />
                      Demo
                    </Badge>
                  )}
                  {!demoMode && (
                    <Badge variant="outline" className="text-primary border-primary/50">
                      <Zap className="w-3 h-3 mr-1" />
                      Live
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Live Transcript */}
            {(demoMode ? demoTranscript.length > 0 : liveTranscript) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Live Transcript
                </Label>
                <div className="bg-muted/30 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                  {demoMode ? (
                    <div className="space-y-2">
                      {demoTranscript.map((line, i) => (
                        <p key={i} className={`text-xs ${line.startsWith("[AI]") ? "text-primary" : "text-muted-foreground"}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <pre className="text-xs whitespace-pre-wrap">{liveTranscript || "Waiting for transcript..."}</pre>
                  )}
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
            
            {callData?.outcome && (
              <Badge className={`${formatOutcome(callData.outcome).color} text-white mb-4`}>
                {formatOutcome(callData.outcome).label}
              </Badge>
            )}
            
            {callData?.summary && (
              <div className="text-left bg-muted/30 rounded-lg p-4 mt-4 mb-4">
                <Label className="text-xs text-muted-foreground">AI Summary</Label>
                <p className="text-sm mt-1">{callData.summary}</p>
              </div>
            )}
            
            {callData?.transcript && (
              <div className="text-left bg-muted/30 rounded-lg p-4 mb-4">
                <Label className="text-xs text-muted-foreground">Full Transcript</Label>
                <pre className="text-xs mt-2 whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {callData.transcript}
                </pre>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mb-4">
              Duration: {formatDuration(callDuration)}
            </p>
            
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AICallPanel;
