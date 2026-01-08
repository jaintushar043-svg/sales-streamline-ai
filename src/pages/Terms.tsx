import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-12 bg-dark-gradient text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Terms of Service
            </h1>
            <p className="text-primary-foreground/70">Last updated: January 1, 2024</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h2 className="font-display text-2xl font-bold text-foreground">Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using TechMarqX's services, you agree to be bound by these Terms of Service. 
              If you disagree with any part of the terms, you may not access the service.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Use of Service</h2>
            <p className="text-muted-foreground">
              You may use our service only for lawful purposes and in accordance with these Terms. 
              You agree not to use the service in any way that violates applicable laws or regulations.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Accounts</h2>
            <p className="text-muted-foreground">
              When you create an account, you must provide accurate and complete information. 
              You are responsible for safeguarding your account credentials and for any activities under your account.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Subscription & Billing</h2>
            <p className="text-muted-foreground">
              Some features require a paid subscription. You agree to pay all fees associated with your 
              subscription plan. Fees are non-refundable except as required by law.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              TechMarqX shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of the service.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at legal@techmarqx.com.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Terms;
