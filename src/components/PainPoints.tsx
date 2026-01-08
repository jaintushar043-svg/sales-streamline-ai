import { AlertCircle, Clock, FileSpreadsheet, Phone, Database } from "lucide-react";

const painPoints = [
  {
    icon: Clock,
    text: "Searching LinkedIn profiles manually",
  },
  {
    icon: FileSpreadsheet,
    text: "Copy-pasting data into Excel",
  },
  {
    icon: Database,
    text: "Uploading CSVs into CRM",
  },
  {
    icon: Phone,
    text: "Calling from disconnected tools",
  },
];

const PainPoints = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Section Badge */}
          <div className="inline-flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-full px-4 py-2 mb-6">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">The Problem</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Your Sales Team Is{" "}
            <span className="text-destructive">Wasting Time</span> On:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 max-w-3xl mx-auto">
            {painPoints.map((point, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-6 bg-card rounded-xl border shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <point.icon className="w-6 h-6 text-destructive" />
                </div>
                <p className="text-left font-medium text-foreground">{point.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-muted rounded-xl border-2 border-dashed border-destructive/30">
            <p className="text-lg font-semibold text-foreground">
              ⛔ Sales reps doing data entry ≠ revenue growth
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PainPoints;
