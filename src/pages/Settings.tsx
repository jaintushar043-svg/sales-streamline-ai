import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Key,
  Phone,
  Database,
  Settings as SettingsIcon,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Building2,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");

  // API key verification states
  const [apolloStatus, setApolloStatus] = useState<"unknown" | "valid" | "invalid" | "checking">("unknown");
  const [vapiStatus, setVapiStatus] = useState<"unknown" | "valid" | "invalid" | "checking">("unknown");
  const [twilioStatus, setTwilioStatus] = useState<"unknown" | "valid" | "invalid" | "checking">("unknown");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      // Load profile data
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name || "");
      setCompanyName(data.company_name || "");
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          full_name: fullName,
          company_name: companyName,
          email: email,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Profile saved successfully");
    } catch (error) {
      toast.error("Failed to save profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const verifyApolloKey = async () => {
    setApolloStatus("checking");
    try {
      const { data, error } = await supabase.functions.invoke("apollo-search", {
        body: { country: "United States", limit: 1 },
      });

      if (error || data?.error?.includes("access credentials")) {
        setApolloStatus("invalid");
        toast.error("Apollo API key is invalid or not configured");
      } else {
        setApolloStatus("valid");
        toast.success("Apollo API key is valid");
      }
    } catch {
      setApolloStatus("invalid");
    }
  };

  const verifyVapiKey = async () => {
    setVapiStatus("checking");
    try {
      // Make a simple test call to check if VAPI key works
      const { data, error } = await supabase.functions.invoke("vapi-outbound-call", {
        body: { leadId: "test-verify", phoneNumber: "+1234567890", scriptType: "cold_outreach" },
      });

      // If error says Vapi not configured, key is missing
      if (data?.error?.includes("Vapi API key not configured")) {
        setVapiStatus("invalid");
        toast.error("Vapi API key is not configured");
      } else if (data?.error?.includes("Lead not found")) {
        // This is expected - key is valid, just no lead found
        setVapiStatus("valid");
        toast.success("Vapi API key is valid");
      } else if (error) {
        setVapiStatus("invalid");
        toast.error("Vapi API key verification failed");
      } else {
        setVapiStatus("valid");
        toast.success("Vapi API key is valid");
      }
    } catch {
      setVapiStatus("invalid");
    }
  };

  const StatusBadge = ({ status }: { status: "unknown" | "valid" | "invalid" | "checking" }) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Connected</Badge>;
      case "invalid":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Not Configured</Badge>;
      case "checking":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking...</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Settings
              </h1>
              <p className="text-sm text-muted-foreground">Configure your account and integrations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Key className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Profile
                </CardTitle>
                <CardDescription>
                  Manage your personal and company information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Inc."
                  />
                </div>
                <Button onClick={saveProfile} disabled={isSaving} className="mt-4">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            {/* Apollo.io Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      Apollo.io
                      <StatusBadge status={apolloStatus} />
                    </CardTitle>
                    <CardDescription>
                      Lead database for finding verified B2B contacts
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" rel="noopener noreferrer">
                      Get API Key <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Apollo.io account to search for real, verified leads. Without this, lead search will not work.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={verifyApolloKey} disabled={apolloStatus === "checking"}>
                    {apolloStatus === "checking" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Verify Connection
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to Apollo.io → Settings → Integrations → API</li>
                    <li>Generate a new API key</li>
                    <li>Copy the API key</li>
                    <li>Contact support to add your key securely</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Vapi.ai Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-green-500" />
                      Vapi.ai (Voice AI)
                      <StatusBadge status={vapiStatus} />
                    </CardTitle>
                    <CardDescription>
                      AI-powered voice calling for automated sales outreach
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.vapi.ai/account" target="_blank" rel="noopener noreferrer">
                      Get API Key <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect Vapi.ai to enable AI-powered voice calls. Your AI agent will automatically call leads and have natural conversations.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={verifyVapiKey} disabled={vapiStatus === "checking"}>
                    {vapiStatus === "checking" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Verify Connection
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Go to Vapi.ai Dashboard → Account</li>
                    <li>Copy your Private API Key</li>
                    <li>Add a phone number to your Vapi account</li>
                    <li>Contact support to add your key securely</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Twilio Integration (Optional) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-red-500" />
                      Twilio (Optional)
                      <StatusBadge status={twilioStatus} />
                    </CardTitle>
                    <CardDescription>
                      Alternative phone provider for SMS and manual calls
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.twilio.com/" target="_blank" rel="noopener noreferrer">
                      Get Credentials <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Optional: Connect Twilio for SMS notifications and backup calling. Not required if using Vapi.ai.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch disabled />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive email alerts for important events</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Call Recordings</p>
                    <p className="text-sm text-muted-foreground">Store recordings of AI calls for review</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete All Leads</p>
                    <p className="text-sm text-muted-foreground">Permanently delete all your lead data</p>
                  </div>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    Delete Leads
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
