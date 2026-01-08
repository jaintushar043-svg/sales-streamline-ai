import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Users, Target, Zap, Heart } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "We're on a mission to eliminate manual busywork from sales so reps can focus on what they do best — building relationships.",
  },
  {
    icon: Zap,
    title: "Innovation First",
    description: "We leverage cutting-edge AI and automation to stay ahead of the curve and deliver the best solutions.",
  },
  {
    icon: Users,
    title: "Customer Obsessed",
    description: "Every feature we build starts with a customer problem. Their success is our success.",
  },
  {
    icon: Heart,
    title: "Transparency",
    description: "We believe in honest communication with our team, customers, and partners.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-20 bg-dark-gradient text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-6">
              About TechMarqX
            </h1>
            <p className="text-xl text-primary-foreground/70">
              We're building the future of B2B sales automation — where AI handles the grunt work 
              and sales reps focus on closing deals.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-foreground mb-6">Our Story</h2>
            <div className="prose prose-lg text-muted-foreground">
              <p className="mb-4">
                TechMarqX was founded by a team of sales professionals and engineers who experienced 
                firsthand the frustration of manual lead generation. Hours spent searching LinkedIn, 
                copy-pasting into spreadsheets, and uploading CSVs to CRMs — all before making a single call.
              </p>
              <p className="mb-4">
                We knew there had to be a better way. So we built it.
              </p>
              <p>
                Today, TechMarqX powers sales teams at hundreds of companies, automating the entire 
                lead discovery and enrichment process so reps can spend their time where it matters most: 
                talking to prospects and closing deals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <div key={index} className="bg-card rounded-xl p-6 border shadow-card">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
