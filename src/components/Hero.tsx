import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Zap, Users, Database } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-dark-gradient" />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(hsl(220 80% 50% / 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, hsl(220 80% 50% / 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 animate-fade-in">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Sales Automation</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight animate-slide-up">
            Turn LinkedIn Into a{" "}
            <span className="text-gradient">Fully Automated</span>{" "}
            Sales Engine
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-primary-foreground/70 max-w-3xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Find decision-makers, enrich data, push to CRM, and make sales calls — 
            without manual work, CSVs, or data entry.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/signup">
              <Button variant="hero" size="xl" className="group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/demo">
              <Button variant="heroOutline" size="xl" className="group">
                <Play className="w-5 h-5" />
                Book 5-Min Demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="glass-card rounded-xl p-6 bg-card/5 border-primary/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-3xl font-bold text-primary-foreground">60-70%</span>
              </div>
              <p className="text-sm text-primary-foreground/60">Sales Time Saved</p>
            </div>
            <div className="glass-card rounded-xl p-6 bg-card/5 border-primary/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-secondary" />
                <span className="text-3xl font-bold text-primary-foreground">2×</span>
              </div>
              <p className="text-sm text-primary-foreground/60">More Calls Per Rep</p>
            </div>
            <div className="glass-card rounded-xl p-6 bg-card/5 border-primary/10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Database className="w-5 h-5 text-accent" />
                <span className="text-3xl font-bold text-primary-foreground">100%</span>
              </div>
              <p className="text-sm text-primary-foreground/60">Clean, Verified Data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
