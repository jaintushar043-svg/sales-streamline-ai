import { Search, Brain, Zap, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Enter Target Criteria",
    description: "Industry • Company Size • Job Title • Location",
    color: "primary",
  },
  {
    number: "02",
    icon: Brain,
    title: "AI Finds & Qualifies Leads",
    description: "Decision makers only • Clean & deduplicated data",
    color: "secondary",
  },
  {
    number: "03",
    icon: Zap,
    title: "One-Click CRM Sync + Call Ready",
    description: "Push to Salesforce, HubSpot & start calling instantly",
    color: "accent",
  },
];

const HowItWorks = () => {
  return (
    <section id="features" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple Process</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to transform your sales process
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-30" style={{ transform: 'translateY(-50%)' }} />
            
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-card rounded-2xl p-8 border shadow-card hover:shadow-card-hover transition-all duration-300 h-full hover:-translate-y-1">
                  {/* Step Number */}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${
                    step.color === 'primary' ? 'bg-primary/10 text-primary' :
                    step.color === 'secondary' ? 'bg-secondary/10 text-secondary' :
                    'bg-accent/10 text-accent'
                  }`}>
                    <step.icon className="w-7 h-7" />
                  </div>

                  {/* Step Label */}
                  <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                    step.color === 'primary' ? 'text-primary' :
                    step.color === 'secondary' ? 'text-secondary' :
                    'text-accent'
                  }`}>
                    Step {step.number}
                  </div>

                  <h3 className="font-display text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <div className="w-8 h-8 rounded-full bg-card border shadow-sm flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
