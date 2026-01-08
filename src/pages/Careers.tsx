import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase } from "lucide-react";

const openings = [
  {
    title: "Senior Full-Stack Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Account Executive",
    department: "Sales",
    location: "New York, NY",
    type: "Full-time",
  },
  {
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Remote",
    type: "Full-time",
  },
];

const Careers = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-20 bg-dark-gradient text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-6">
              Join Our Team
            </h1>
            <p className="text-xl text-primary-foreground/70">
              Help us revolutionize B2B sales. We're looking for passionate people 
              who want to make an impact.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">Why TechMarqX?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="font-semibold text-foreground mb-2">Remote-First</h3>
              <p className="text-muted-foreground">Work from anywhere in the world</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="font-semibold text-foreground mb-2">Equity</h3>
              <p className="text-muted-foreground">Share in our success with stock options</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="font-semibold text-foreground mb-2">Full Benefits</h3>
              <p className="text-muted-foreground">Health, dental, vision & 401k</p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">Open Positions</h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {openings.map((job, index) => (
              <div key={index} className="bg-card rounded-xl p-6 border shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold text-foreground">{job.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {job.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline">Apply Now</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Careers;
