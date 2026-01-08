import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PainPoints from "@/components/PainPoints";
import HowItWorks from "@/components/HowItWorks";
import Comparison from "@/components/Comparison";
import DataEnrichment from "@/components/DataEnrichment";
import VoipSection from "@/components/VoipSection";
import Integrations from "@/components/Integrations";
import Pricing from "@/components/Pricing";
import WhoIsFor from "@/components/WhoIsFor";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <PainPoints />
      <HowItWorks />
      <Comparison />
      <DataEnrichment />
      <VoipSection />
      <Integrations />
      <Pricing />
      <WhoIsFor />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
