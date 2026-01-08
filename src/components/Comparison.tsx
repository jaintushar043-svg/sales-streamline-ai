import { Check, X } from "lucide-react";

const comparisons = [
  {
    traditional: "Manual LinkedIn search",
    ours: "Automated discovery",
  },
  {
    traditional: "CSV uploads",
    ours: "Direct CRM sync",
  },
  {
    traditional: "Wrong leads",
    ours: "Decision makers only",
  },
  {
    traditional: "CRM as storage",
    ours: "CRM as action engine",
  },
];

const Comparison = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What Makes Us <span className="text-gradient">Different</span>
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl border shadow-card overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-2 bg-muted">
              <div className="p-6 text-center border-r">
                <span className="font-semibold text-muted-foreground">Traditional Tools</span>
              </div>
              <div className="p-6 text-center bg-primary/5">
                <span className="font-semibold text-primary">TechMarqX</span>
              </div>
            </div>

            {/* Rows */}
            {comparisons.map((item, index) => (
              <div key={index} className={`grid grid-cols-2 ${index < comparisons.length - 1 ? 'border-b' : ''}`}>
                <div className="p-6 flex items-center gap-3 border-r">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <span className="text-muted-foreground">{item.traditional}</span>
                </div>
                <div className="p-6 flex items-center gap-3 bg-primary/5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{item.ours}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Comparison;
