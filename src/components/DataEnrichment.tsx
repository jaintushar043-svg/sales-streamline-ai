import { User, Building, Linkedin, Globe, Users, Briefcase, Mail, Phone } from "lucide-react";

const enrichmentFields = [
  { icon: User, label: "Name", value: "John Smith" },
  { icon: Building, label: "Company", value: "TechCorp Inc." },
  { icon: Linkedin, label: "LinkedIn URL", value: "linkedin.com/in/..." },
  { icon: Globe, label: "Company Website", value: "techcorp.com" },
  { icon: Users, label: "Company Size", value: "51-200 employees" },
  { icon: Briefcase, label: "Industry", value: "Software/SaaS" },
  { icon: Mail, label: "Work Email", value: "john@techcorp.com" },
  { icon: Phone, label: "Phone", value: "+1 (555) 123-4567" },
];

const DataEnrichment = () => {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 mb-6">
                <Mail className="w-4 h-4 text-secondary" />
                <span className="text-sm font-medium text-secondary">Data Enrichment</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Every Lead Comes <span className="text-gradient">Fully Enriched</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                No more manual research. Every contact includes verified business data, 
                ready for outreach. This is what makes your leads worth premium pricing.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Verified Work Emails</p>
                    <p className="text-sm text-muted-foreground">Real-time email validation</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Direct Phone Numbers</p>
                    <p className="text-sm text-muted-foreground">Mobile & direct lines when available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Building className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Complete Company Intel</p>
                    <p className="text-sm text-muted-foreground">Size, industry, tech stack & more</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-hero-gradient rounded-3xl blur-2xl opacity-20" />
              <div className="relative bg-card rounded-2xl border shadow-card-hover p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                  <div className="w-16 h-16 rounded-full bg-hero-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    JS
                  </div>
                  <div>
                    <h4 className="font-display text-xl font-bold text-foreground">John Smith</h4>
                    <p className="text-muted-foreground">VP of Sales at TechCorp Inc.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {enrichmentFields.map((field, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                        <field.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{field.label}</p>
                        <p className="text-sm font-medium text-foreground truncate">{field.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shimmer effect */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="shimmer absolute inset-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DataEnrichment;
