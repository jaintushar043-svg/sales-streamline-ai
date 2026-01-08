import { Building2, Users, Briefcase, Home, TrendingUp } from "lucide-react";

const audiences = [
  { icon: Users, label: "B2B Sales Teams" },
  { icon: Building2, label: "SaaS Companies" },
  { icon: Briefcase, label: "Recruitment Agencies" },
  { icon: TrendingUp, label: "Growth & Lead Gen Agencies" },
  { icon: Home, label: "Real Estate" },
];

const WhoIsFor = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Built For Teams Who Sell B2B
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            If you sell B2B — this is built for you.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {audiences.map((audience, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 px-6 py-4 bg-card rounded-xl border shadow-sm hover:shadow-card transition-shadow"
              >
                <audience.icon className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{audience.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhoIsFor;
