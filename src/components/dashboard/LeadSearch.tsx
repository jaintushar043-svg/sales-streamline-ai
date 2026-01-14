import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Loader2, Globe, Building2, Users, Briefcase, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadSearchProps {
  onLeadsFound: () => void;
}

const COUNTRIES = [
  { value: "usa", label: "United States", cities: ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle", "Boston", "Denver", "Miami", "Dallas"] },
  { value: "india", label: "India", cities: ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Noida", "Gurugram"] },
  { value: "uae", label: "UAE", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { value: "uk", label: "United Kingdom", cities: ["London", "Manchester", "Birmingham", "Edinburgh", "Leeds", "Bristol"] },
  { value: "germany", label: "Germany", cities: ["Berlin", "Munich", "Frankfurt", "Hamburg", "Düsseldorf", "Cologne"] },
  { value: "canada", label: "Canada", cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"] },
  { value: "australia", label: "Australia", cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"] },
  { value: "singapore", label: "Singapore", cities: ["Singapore"] },
  { value: "netherlands", label: "Netherlands", cities: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"] },
  { value: "france", label: "France", cities: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"] },
];

const INDUSTRIES = [
  "SaaS",
  "FinTech",
  "HealthTech",
  "EdTech",
  "E-commerce",
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Real Estate",
  "Manufacturing",
  "Consulting",
  "Marketing & Advertising",
  "Logistics & Supply Chain",
  "Retail",
  "Insurance",
  "Legal Services",
  "HR & Recruitment",
  "Cybersecurity",
  "AI & Machine Learning",
  "Cloud Computing",
];

const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 employees (Startup)" },
  { value: "11-50", label: "11-50 employees (Small)" },
  { value: "51-200", label: "51-200 employees (Medium)" },
  { value: "201-500", label: "201-500 employees (Mid-Market)" },
  { value: "501-1000", label: "501-1000 employees (Large)" },
  { value: "1001-5000", label: "1001-5000 employees (Enterprise)" },
  { value: "5000+", label: "5000+ employees (Global)" },
];

const REVENUE_TIERS = [
  { value: "0-1M", label: "Less than $1M" },
  { value: "1M-5M", label: "$1M - $5M" },
  { value: "5M-10M", label: "$5M - $10M" },
  { value: "10M-50M", label: "$10M - $50M" },
  { value: "50M-100M", label: "$50M - $100M" },
  { value: "100M-500M", label: "$100M - $500M" },
  { value: "500M+", label: "$500M+" },
];

const JOB_TITLES = [
  "CEO",
  "CTO",
  "CFO",
  "COO",
  "CMO",
  "VP of Sales",
  "VP of Marketing",
  "VP of Engineering",
  "Director of Sales",
  "Director of Marketing",
  "Director of Operations",
  "Head of Growth",
  "Head of Business Development",
  "Sales Manager",
  "Marketing Manager",
  "Product Manager",
  "Founder",
  "Co-Founder",
  "Managing Director",
  "General Manager",
];

const LeadSearch = ({ onLeadsFound }: LeadSearchProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Search criteria
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [revenueTier, setRevenueTier] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [leadCount, setLeadCount] = useState("25");

  const selectedCountry = COUNTRIES.find(c => c.value === country);
  const cities = selectedCountry?.cities || [];

  const handleSearch = async () => {
    if (!country && !industry && !jobTitle && !customJobTitle) {
      toast.error("Please select at least one search criteria");
      return;
    }

    setIsSearching(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Please log in to search leads");
        return;
      }

      // First try Apollo for real data, falls back to AI if Apollo fails
      const response = await supabase.functions.invoke("apollo-search", {
        body: {
          country: selectedCountry?.label || "",
          city: city && city !== "all" ? city : undefined,
          industry,
          companySize,
          jobTitles: (customJobTitle || jobTitle) ? [customJobTitle || jobTitle] : undefined,
          revenueTier: revenueTier ? `$${revenueTier}` : undefined,
          limit: parseInt(leadCount),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Search failed");
      }

      const data = response.data;
      if (data.success) {
        const source = data.source === "apollo" ? "Apollo.io (Verified)" : "Demo Mode";
        const isDemo = data.source !== "apollo";
        
        if (isDemo && data.warning) {
          toast.warning("Demo Data Generated", {
            description: data.warning,
            duration: 8000,
          });
        } else {
          toast.success(`Found ${data.count} leads from ${source}!`, {
            description: data.source === "apollo" 
              ? "Real verified business contacts from Apollo.io" 
              : "Demo leads for testing - not real contacts",
          });
        }
        
        onLeadsFound();
        setIsOpen(false);
        // Reset form
        setCountry("");
        setCity("");
        setIndustry("");
        setCompanySize("");
        setRevenueTier("");
        setJobTitle("");
        setCustomJobTitle("");
      } else {
        throw new Error(data.error || "Search failed");
      }
    } catch (error) {
      console.error("Lead search error:", error);
      if (error instanceof Error && error.message.includes("429")) {
        toast.error("Search limit exceeded. Please upgrade your plan.");
      } else if (error instanceof Error && error.message.includes("402")) {
        toast.error("Please add credits to continue searching.");
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to search leads");
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-hero-gradient hover:opacity-90">
          <Search className="w-4 h-4 mr-2" />
          Find Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            AI Lead Discovery
          </DialogTitle>
          <DialogDescription>
            Search for B2B leads matching your ideal customer profile. Our AI will find and enrich leads automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Location Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Location
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="country" className="text-xs text-muted-foreground">Country</Label>
                <Select value={country} onValueChange={(v) => { setCountry(v); setCity(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                <Select value={city} onValueChange={setCity} disabled={!country}>
                  <SelectTrigger>
                    <SelectValue placeholder={country ? "Select city" : "Select country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Industry Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Industry
            </div>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="w-4 h-4 text-muted-foreground" />
                Company Size
              </div>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger>
                  <SelectValue placeholder="Any size" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Revenue
              </div>
              <Select value={revenueTier} onValueChange={setRevenueTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Any revenue" />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_TIERS.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Title Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Target Job Title
            </div>
            <Select value={jobTitle} onValueChange={setJobTitle}>
              <SelectTrigger>
                <SelectValue placeholder="Select job title" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TITLES.map((title) => (
                  <SelectItem key={title} value={title}>{title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Or enter custom job title..."
              value={customJobTitle}
              onChange={(e) => setCustomJobTitle(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Lead Count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of Leads</Label>
            <Select value={leadCount} onValueChange={setLeadCount}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 leads</SelectItem>
                <SelectItem value="25">25 leads</SelectItem>
                <SelectItem value="50">50 leads</SelectItem>
                <SelectItem value="100">100 leads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-hero-gradient hover:opacity-90" 
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Leads
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadSearch;
