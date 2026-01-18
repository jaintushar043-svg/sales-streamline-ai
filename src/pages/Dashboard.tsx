import { useAuth } from "@/hooks/useAuth";
import { useLeads } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Building2, Download, Users, TrendingUp, FileSpreadsheet, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LeadFilters from "@/components/dashboard/LeadFilters";
import LeadsTable from "@/components/dashboard/LeadsTable";
import CSVImport from "@/components/dashboard/CSVImport";
import LeadSearch from "@/components/dashboard/LeadSearch";
import CRMSync from "@/components/dashboard/CRMSync";

interface Profile {
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  subscription_tier: string | null;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  const {
    leads,
    allLeads,
    isLoading,
    isImporting,
    searchQuery,
    setSearchQuery,
    industryFilter,
    setIndustryFilter,
    statusFilter,
    setStatusFilter,
    clearFilters,
    importLeads,
    deleteLead,
    exportToCSV,
    refetch,
  } = useLeads({ userId: user?.id });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Stats
  const stats = [
    {
      label: "Total Leads",
      value: allLeads.length,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "New Leads",
      value: allLeads.filter((l) => l.status === "new").length,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Qualified",
      value: allLeads.filter((l) => l.status === "qualified").length,
      icon: Building2,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Converted",
      value: allLeads.filter((l) => l.status === "converted").length,
      icon: FileSpreadsheet,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-hero-gradient flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-lg">T</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground">TechMarqX</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {profile?.full_name || user?.email}
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Manage your leads and automate your sales pipeline.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl border p-4 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Leads Section */}
        <div className="bg-card rounded-xl border shadow-card">
          <div className="p-6 border-b">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">Your Leads</h2>
                <p className="text-sm text-muted-foreground">
                  {leads.length} of {allLeads.length} leads shown
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LeadSearch onLeadsFound={refetch} />
                <CRMSync leads={leads} userId={user?.id} />
                <Button variant="outline" onClick={exportToCSV} disabled={leads.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <CSVImport onImport={importLeads} isImporting={isImporting} />
              </div>
            </div>
          </div>

          <div className="p-6 border-b bg-muted/30">
            <LeadFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              industryFilter={industryFilter}
              onIndustryChange={setIndustryFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onClearFilters={clearFilters}
            />
          </div>

          <div className="p-6">
            <LeadsTable leads={leads} onDeleteLead={deleteLead} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
