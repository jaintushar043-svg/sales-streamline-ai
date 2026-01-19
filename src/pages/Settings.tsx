import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Key, 
  Phone, 
  Database, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Eye, 
  EyeOff,
  Shield,
  ArrowLeft,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface IntegrationStatus {
  apollo: { configured: boolean; valid: boolean | null; testing: boolean };
  vapi: { configured: boolean; valid: boolean | null; testing: boolean };
  hubspot: { configured: boolean; valid: boolean | null; testing: boolean; enabled: boolean };
  airtable: { configured: boolean; valid: boolean | null; testing: boolean; enabled: boolean };
  sheets: { configured: boolean; valid: boolean | null; testing: boolean; enabled: boolean };
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    apollo: { configured: false, valid: null, testing: false },
    vapi: { configured: false, valid: null, testing: false },
    hubspot: { configured: false, valid: null, testing: false, enabled: false },
    airtable: { configured: false, valid: null, testing: false, enabled: false },
    sheets: { configured: false, valid: null, testing: false, enabled: false },
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    checkIntegrationStatus();
  }, []);

  const checkIntegrationStatus = async () => {
    setLoading(true);
    try {
      // Check integration status via edge function
      const { data, error } = await supabase.functions.invoke("check-integrations");
      
      if (error) {
        console.error("Failed to check integrations:", error);
        // Set defaults - assume not configured
        setIntegrations({
          apollo: { configured: false, valid: null, testing: false },
          vapi: { configured: false, valid: null, testing: false },
          hubspot: { configured: false, valid: null, testing: false, enabled: false },
          airtable: { configured: false, valid: null, testing: false, enabled: false },
          sheets: { configured: false, valid: null, testing: false, enabled: false },
        });
      } else if (data) {
        setIntegrations({
          apollo: { configured: data.apollo?.configured || false, valid: null, testing: false },
          vapi: { configured: data.vapi?.configured || false, valid: null, testing: false },
          hubspot: { configured: data.hubspot?.configured || false, valid: null, testing: false, enabled: data.hubspot?.enabled || false },
          airtable: { configured: data.airtable?.configured || false, valid: null, testing: false, enabled: data.airtable?.enabled || false },
          sheets: { configured: data.sheets?.configured || false, valid: null, testing: false, enabled: data.sheets?.enabled || false },
        });
      }
    } catch (error) {
      console.error("Error checking integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const testIntegration = async (integration: keyof IntegrationStatus) => {
    setIntegrations(prev => ({
      ...prev,
      [integration]: { ...prev[integration], testing: true, valid: null }
    }));

    try {
      const { data, error } = await supabase.functions.invoke("test-integration", {
        body: { integration }
      });

      if (error) throw error;

      setIntegrations(prev => ({
        ...prev,
        [integration]: { ...prev[integration], testing: false, valid: data?.valid || false }
      }));

      if (data?.valid) {
        toast.success(`${integration.charAt(0).toUpperCase() + integration.slice(1)} connection verified!`);
      } else {
        toast.error(`${integration.charAt(0).toUpperCase() + integration.slice(1)} connection failed`, {
          description: data?.error || "Please check your API key"
        });
      }
    } catch (error) {
      console.error(`Error testing ${integration}:`, error);
      setIntegrations(prev => ({
        ...prev,
        [integration]: { ...prev[integration], testing: false, valid: false }
      }));
      toast.error(`Failed to test ${integration} connection`);
    }
  };

  const maskApiKey = (key: string | undefined): string => {
    if (!key) return "Not configured";
    if (key.length <= 8) return "****" + key.slice(-4);
    return "****" + key.slice(-4);
  };

  const IntegrationCard = ({ 
    name, 
    description, 
    icon: Icon, 
    integration,
    hasToggle = false 
  }: { 
    name: string; 
    description: string; 
    icon: React.ComponentType<{ className?: string }>;
    integration: keyof IntegrationStatus;
    hasToggle?: boolean;
  }) => {
    const status = integrations[integration];
    
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{name}</CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {status.configured ? (
                status.valid === true ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : status.valid === false ? (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="h-3 w-3 mr-1" />
                    Invalid
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Key className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Not Configured
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">
                {showKeys[integration] ? "••••••••" : maskApiKey(status.configured ? "configured" : undefined)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeys(prev => ({ ...prev, [integration]: !prev[integration] }))}
            >
              {showKeys[integration] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testIntegration(integration)}
              disabled={!status.configured || status.testing}
            >
              {status.testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            
            {hasToggle && (
              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor={`${integration}-toggle`} className="text-sm">
                  {(status as { enabled?: boolean }).enabled ? "Enabled" : "Disabled"}
                </Label>
                <Switch
                  id={`${integration}-toggle`}
                  checked={(status as { enabled?: boolean }).enabled || false}
                  disabled={!status.configured}
                />
              </div>
            )}
          </div>

          {!status.configured && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">API key not configured</p>
                  <p className="text-xs mt-1">
                    Contact your administrator to add the {name} API key in project secrets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Settings
              </h1>
              <p className="text-muted-foreground">Manage your integrations and API keys</p>
            </div>
          </div>

          <Tabs defaultValue="integrations" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="integrations" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="integrations" className="space-y-6">
              {/* Lead Generation */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Lead Generation
                </h2>
                <IntegrationCard
                  name="Apollo.io"
                  description="Access verified B2B contact data and company information"
                  icon={Database}
                  integration="apollo"
                />
              </div>

              <Separator />

              {/* Voice AI */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Voice AI
                </h2>
                <IntegrationCard
                  name="Vapi.ai"
                  description="AI-powered voice agents for outbound calls"
                  icon={Phone}
                  integration="vapi"
                />
              </div>

              <Separator />

              {/* CRM Integrations */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  CRM Integrations
                </h2>
                <div className="grid gap-4">
                  <IntegrationCard
                    name="HubSpot"
                    description="Sync leads and call data with HubSpot CRM"
                    icon={Database}
                    integration="hubspot"
                    hasToggle
                  />
                  <IntegrationCard
                    name="Airtable"
                    description="Export leads to Airtable bases"
                    icon={Database}
                    integration="airtable"
                    hasToggle
                  />
                  <IntegrationCard
                    name="Google Sheets"
                    description="Sync data with Google Sheets"
                    icon={Database}
                    integration="sheets"
                    hasToggle
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>
                    Manage security and privacy settings for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">API Keys Secured</p>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                          All API keys are stored encrypted and never exposed to the frontend. 
                          They are only accessible in secure backend functions.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-400">Webhook Verification</p>
                        <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                          All incoming webhooks are verified using HMAC signatures to prevent 
                          unauthorized access and replay attacks.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-purple-700 dark:text-purple-400">Row-Level Security</p>
                        <p className="text-sm text-purple-600 dark:text-purple-500 mt-1">
                          Database access is protected by row-level security policies. 
                          Users can only access their own data.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SettingsPage;
