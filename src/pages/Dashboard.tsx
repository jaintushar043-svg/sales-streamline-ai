import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Building2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-hero-gradient flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground text-lg">T</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground">TechMarqX</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your dashboard is ready. Start automating your sales pipeline.
          </p>

          {/* Profile Card */}
          <div className="bg-card rounded-xl border p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold mb-4">Your Profile</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{profile?.full_name || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile?.email || user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{profile?.company_name || "Not set"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="bg-card rounded-xl border p-6 shadow-card">
              <h3 className="font-semibold mb-2">Import Leads</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload CSV or connect LinkedIn to import leads.
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </div>
            <div className="bg-card rounded-xl border p-6 shadow-card">
              <h3 className="font-semibold mb-2">Connect CRM</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sync with Salesforce or HubSpot.
              </p>
              <Button variant="outline" size="sm">Coming Soon</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
