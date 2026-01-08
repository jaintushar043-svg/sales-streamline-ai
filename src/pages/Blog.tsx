import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight } from "lucide-react";

const posts = [
  {
    title: "How AI is Transforming B2B Lead Generation in 2024",
    excerpt: "Discover how artificial intelligence is revolutionizing the way sales teams find and qualify prospects.",
    date: "Jan 5, 2024",
    category: "AI & Automation",
    slug: "#",
  },
  {
    title: "5 Ways to Increase Sales Rep Productivity by 2x",
    excerpt: "Practical strategies to help your sales team close more deals without burning out.",
    date: "Dec 28, 2023",
    category: "Sales Tips",
    slug: "#",
  },
  {
    title: "The Complete Guide to LinkedIn Sales Navigator",
    excerpt: "Master LinkedIn Sales Navigator with our comprehensive guide for B2B sales professionals.",
    date: "Dec 15, 2023",
    category: "LinkedIn",
    slug: "#",
  },
  {
    title: "CRM Best Practices: Salesforce vs HubSpot",
    excerpt: "A detailed comparison to help you choose the right CRM for your sales team.",
    date: "Dec 1, 2023",
    category: "CRM",
    slug: "#",
  },
];

const Blog = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="pt-32 pb-20 bg-dark-gradient text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-6">
              Blog
            </h1>
            <p className="text-xl text-primary-foreground/70">
              Insights, tips, and strategies for modern B2B sales teams.
            </p>
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {posts.map((post, index) => (
              <Link 
                key={index} 
                to={post.slug}
                className="group bg-card rounded-xl border shadow-card hover:shadow-card-hover transition-all overflow-hidden"
              >
                <div className="aspect-video bg-muted" />
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                      {post.category}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {post.date}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  <span className="inline-flex items-center text-primary font-medium">
                    Read more
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
