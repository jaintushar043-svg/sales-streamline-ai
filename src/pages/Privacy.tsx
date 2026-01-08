import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-12 bg-dark-gradient text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-primary-foreground/70">Last updated: January 1, 2024</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h2 className="font-display text-2xl font-bold text-foreground">Introduction</h2>
            <p className="text-muted-foreground">
              TechMarqX ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our service.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, such as when you create an account, 
              use our services, or contact us for support. This may include:
            </p>
            <ul className="text-muted-foreground list-disc pl-6 space-y-2">
              <li>Name and email address</li>
              <li>Company information</li>
              <li>Payment information</li>
              <li>Usage data and analytics</li>
            </ul>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use the information we collect to provide, maintain, and improve our services, 
              process transactions, send communications, and comply with legal obligations.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="font-display text-2xl font-bold text-foreground mt-8">Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about this Privacy Policy, please contact us at privacy@techmarqx.com.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Privacy;
