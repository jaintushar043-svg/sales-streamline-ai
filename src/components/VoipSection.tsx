import { Phone, Mic, Clock, FileText, UserCheck, PlayCircle } from "lucide-react";

const voipFeatures = [
  {
    icon: UserCheck,
    title: "Auto-assign to Sales Rep",
    description: "Leads automatically route to the right rep",
  },
  {
    icon: PlayCircle,
    title: "Click-to-Call",
    description: "One click to dial directly from CRM",
  },
  {
    icon: Mic,
    title: "Call Recording",
    description: "Every call recorded for quality & training",
  },
  {
    icon: Clock,
    title: "Status Updates",
    description: "Call status syncs to CRM in real-time",
  },
  {
    icon: FileText,
    title: "Notes Auto-Logged",
    description: "AI transcribes and logs call notes",
  },
];

const VoipSection = () => {
  return (
    <section className="py-24 bg-dark-gradient text-primary-foreground relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, hsl(var(--primary)) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Phone Mockup */}
            <div className="order-2 lg:order-1">
              <div className="relative max-w-sm mx-auto">
                {/* Glow */}
                <div className="absolute inset-0 bg-primary/30 rounded-3xl blur-3xl" />
                
                {/* Phone */}
                <div className="relative bg-foreground/10 backdrop-blur-xl rounded-3xl p-4 border border-primary/20">
                  <div className="bg-card rounded-2xl overflow-hidden">
                    {/* Call UI */}
                    <div className="p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-hero-gradient flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                        JS
                      </div>
                      <h4 className="font-display text-xl font-bold text-foreground">John Smith</h4>
                      <p className="text-sm text-muted-foreground mb-2">VP of Sales, TechCorp</p>
                      <p className="text-2xl font-mono font-bold text-primary mb-6">00:45</p>

                      {/* Call Controls */}
                      <div className="flex justify-center gap-4">
                        <button className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Mic className="w-5 h-5 text-foreground" />
                        </button>
                        <button className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center">
                          <Phone className="w-6 h-6 text-destructive-foreground rotate-[135deg]" />
                        </button>
                        <button className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-5 h-5 text-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="border-t p-4 bg-muted/50">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">AI Call Notes</p>
                      <p className="text-sm text-foreground">
                        "Interested in Pro plan. Follow up next Tuesday. Needs approval from CFO..."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 rounded-full px-4 py-2 mb-6">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">VOIP Integration</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
                Calling Automation That's a <span className="text-gradient">Game Changer</span>
              </h2>
              <p className="text-lg text-primary-foreground/70 mb-8">
                After CRM sync, your sales rep just talks — the system handles everything else.
              </p>

              <div className="space-y-4">
                {voipFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-card/5 rounded-xl border border-primary/10 hover:bg-card/10 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{feature.title}</p>
                      <p className="text-sm text-primary-foreground/60">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VoipSection;
