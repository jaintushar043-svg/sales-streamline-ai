import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, Lock, Eye, Server } from "lucide-react";

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "All data is encrypted in transit and at rest using industry-standard AES-256 encryption.",
  },
  {
    icon: Shield,
    title: "SOC 2 Type II Certified",
    description: "We maintain SOC 2 Type II certification, demonstrating our commitment to security controls.",
  },
  {
    icon: Eye,
    title: "Access Controls",
    description: "Role-based access controls ensure only authorized personnel can access sensitive data.",
  },
  {
    icon: Server,
    title: "Secure Infrastructure",
    description: "Our infrastructure is hosted on AWS with multi-region redundancy and 99.9% uptime SLA.",
  },
];

const Security = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-20 bg-dark-gradient text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-6">
              Security
            </h1>
            <p className="text-xl text-primary-foreground/70">
              Your data security is our top priority. Learn how we protect your information.
            </p>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="bg-card rounded-xl p-8 border shadow-card">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl font-bold text-foreground mb-6">Compliance & Certifications</h2>
            <p className="text-muted-foreground mb-8">
              We maintain compliance with major security and privacy standards to ensure your data is handled responsibly.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="bg-card rounded-lg px-6 py-4 border shadow-sm">
                <span className="font-semibold text-foreground">SOC 2 Type II</span>
              </div>
              <div className="bg-card rounded-lg px-6 py-4 border shadow-sm">
                <span className="font-semibold text-foreground">GDPR Compliant</span>
              </div>
              <div className="bg-card rounded-lg px-6 py-4 border shadow-sm">
                <span className="font-semibold text-foreground">CCPA Compliant</span>
              </div>
              <div className="bg-card rounded-lg px-6 py-4 border shadow-sm">
                <span className="font-semibold text-foreground">ISO 27001</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Security;
