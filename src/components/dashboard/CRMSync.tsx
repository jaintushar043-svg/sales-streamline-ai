import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Loader2, Settings, Plus, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;
type CRMConnection = Tables<"crm_connections">;

interface CRMSyncProps {
  leads: Lead[];
  userId: string | undefined;
}

const CRM_PRESETS = [
  { name: "HubSpot", webhookPlaceholder: "https://api.hubapi.com/crm/v3/objects/contacts" },
  { name: "Salesforce", webhookPlaceholder: "https://yourorg.my.salesforce.com/services/data/v52.0/sobjects/Contact" },
  { name: "Pipedrive", webhookPlaceholder: "https://api.pipedrive.com/v1/persons" },
  { name: "Zoho CRM", webhookPlaceholder: "https://www.zohoapis.com/crm/v2/Contacts" },
  { name: "Close CRM", webhookPlaceholder: "https://api.close.com/api/v1/lead" },
  { name: "Custom Webhook", webhookPlaceholder: "https://your-webhook-url.com/leads" },
];

/**
 * Validates webhook URL to prevent SSRF attacks
 * Only allows HTTPS and blocks internal/private networks
 */
const validateWebhookUrl = (url: string): { valid: boolean; error?: string } => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS webhooks are allowed for security' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost and common internal hostnames
    const blockedHostnames = [
      'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]',
      '169.254.169.254', 'metadata.google.internal', 'metadata.goog',
      'kubernetes.default', 'kubernetes.default.svc',
    ];
    
    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: 'This hostname is not allowed' };
    }
    
    // Block private IP ranges
    const privateIpPatterns = [
      /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./, /^127\./, /^169\.254\./, /^0\./,
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
    }
    
    // Block internal TLDs
    const blockedTlds = ['.local', '.internal', '.localhost', '.corp'];
    for (const tld of blockedTlds) {
      if (hostname.endsWith(tld)) {
        return { valid: false, error: 'Internal domains are not allowed' };
      }
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

const CRMSync = ({ leads, userId }: CRMSyncProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [webhookUrlError, setWebhookUrlError] = useState<string>("");
  
  // Connection settings
  const [connections, setConnections] = useState<CRMConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [crmPreset, setCrmPreset] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connectionName, setConnectionName] = useState("");
  
  // Lead selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchConnections();
    }
  }, [userId]);

  const fetchConnections = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("crm_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    setConnections(data || []);
    if (data && data.length > 0) {
      setSelectedConnectionId(data[0].id);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedLeadIds(leads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleLeadSelect = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, leadId]);
    } else {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
      setSelectAll(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!webhookUrl || !connectionName) {
      toast.error("Please enter connection name and webhook URL");
      return;
    }

    // Validate webhook URL before saving
    const urlValidation = validateWebhookUrl(webhookUrl);
    if (!urlValidation.valid) {
      setWebhookUrlError(urlValidation.error || "Invalid URL");
      toast.error(urlValidation.error || "Invalid webhook URL");
      return;
    }
    setWebhookUrlError("");

    if (!userId) {
      toast.error("Please log in to save connection");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("crm_connections")
        .insert({
          user_id: userId,
          name: connectionName,
          webhook_url: webhookUrl,
          api_key: apiKey || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("CRM connection saved!");
      setConnections(prev => [data, ...prev]);
      setSelectedConnectionId(data.id);
      setIsSettingsOpen(false);
      
      // Reset form
      setCrmPreset("");
      setWebhookUrl("");
      setApiKey("");
      setConnectionName("");
      setWebhookUrlError("");
    } catch (error) {
      console.error("Error saving connection:", error);
      toast.error("Failed to save CRM connection");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    if (selectedLeadIds.length === 0) {
      toast.error("Please select at least one lead to sync");
      return;
    }

    if (!selectedConnectionId && connections.length === 0) {
      toast.error("Please configure a CRM connection first");
      setIsSettingsOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const response = await supabase.functions.invoke("sync-crm", {
        body: {
          leadIds: selectedLeadIds,
          connectionId: selectedConnectionId || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (data.success) {
        toast.success(`Synced ${data.synced} leads to CRM!`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} leads failed to sync`);
        }
        setIsOpen(false);
        setSelectedLeadIds([]);
        setSelectAll(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("CRM sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync leads");
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedPreset = CRM_PRESETS.find(p => p.name === crmPreset);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Push to CRM
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Sync Leads to CRM
            </DialogTitle>
            <DialogDescription>
              Select leads to push to your connected CRM system.
            </DialogDescription>
          </DialogHeader>

          {/* Connection Selector */}
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">CRM Connection:</Label>
              {connections.length > 0 ? (
                <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select connection" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {conn.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-sm text-muted-foreground">No connections configured</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Connection
            </Button>
          </div>

          {/* Lead Selection */}
          <div className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <Checkbox
                id="selectAll"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="selectAll" className="text-sm font-medium cursor-pointer">
                Select All ({leads.length} leads)
              </Label>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
              {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No leads available</p>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={lead.id}
                      checked={selectedLeadIds.includes(lead.id)}
                      onCheckedChange={(checked) => handleLeadSelect(lead.id, !!checked)}
                    />
                    <Label htmlFor={lead.id} className="flex-1 cursor-pointer">
                      <div className="font-medium text-sm">{lead.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {lead.company_name} • {lead.job_title || "No title"}
                      </div>
                    </Label>
                  </div>
                ))
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              {selectedLeadIds.length} lead{selectedLeadIds.length !== 1 ? "s" : ""} selected
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-hero-gradient hover:opacity-90" 
              onClick={handleSync}
              disabled={isSyncing || selectedLeadIds.length === 0}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Sync {selectedLeadIds.length} Lead{selectedLeadIds.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Add CRM Connection
            </DialogTitle>
            <DialogDescription>
              Configure a webhook to automatically sync leads to your CRM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>CRM Platform</Label>
              <Select value={crmPreset} onValueChange={(v) => {
                setCrmPreset(v);
                const preset = CRM_PRESETS.find(p => p.name === v);
                if (preset && v !== "Custom Webhook") {
                  setConnectionName(v);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your CRM" />
                </SelectTrigger>
                <SelectContent>
                  {CRM_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>{preset.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connection Name</Label>
              <Input
                placeholder="e.g., Production HubSpot"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                placeholder={selectedPreset?.webhookPlaceholder || "https://your-webhook-url.com/leads"}
                value={webhookUrl}
                onChange={(e) => {
                  setWebhookUrl(e.target.value);
                  if (webhookUrlError) {
                    const validation = validateWebhookUrl(e.target.value);
                    if (validation.valid) setWebhookUrlError("");
                    else setWebhookUrlError(validation.error || "Invalid URL");
                  }
                }}
                className={webhookUrlError ? "border-red-500" : ""}
              />
              {webhookUrlError ? (
                <p className="text-xs text-red-500">{webhookUrlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enter your CRM's HTTPS API endpoint or webhook URL for receiving leads
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>API Key (Optional)</Label>
              <Input
                type="password"
                placeholder="Your CRM API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If your CRM requires authentication, enter the API key here
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSaveConnection}
              disabled={isSaving || !webhookUrl || !connectionName}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Connection
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CRMSync;
