import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Trash2, 
  Building2, 
  Phone, 
  Mail, 
  AlertTriangle,
  CheckCircle2,
  Linkedin
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import AICallPanel from "./AICallPanel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Lead = Tables<"leads"> & { company_linkedin_url?: string | null };

interface LeadsTableProps {
  leads: Lead[];
  onDeleteLead: (id: string) => void;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const sourceColors: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  apollo: { 
    bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", 
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Verified"
  },
  demo_simulated: { 
    bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", 
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Demo"
  },
  ai_generated: { 
    bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", 
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Demo"
  },
  ai_search: { 
    bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", 
    icon: <AlertTriangle className="h-3 w-3" />,
    label: "Demo"
  },
  csv: { 
    bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", 
    icon: null,
    label: "CSV"
  },
  manual: { 
    bg: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300", 
    icon: null,
    label: "Manual"
  },
};

const LeadsTable = ({ leads, onDeleteLead, isLoading }: LeadsTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-lg font-medium">No leads found</p>
        <p className="text-sm">Import a CSV or add leads manually to get started</p>
      </div>
    );
  }

  // Check if there are any demo leads
  const hasDemoLeads = leads.some(lead => 
    lead.source === "demo_simulated" || 
    lead.source === "ai_generated" || 
    lead.source === "ai_search"
  );

  const formatUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    } catch {
      return url;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {hasDemoLeads && (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-orange-800 dark:text-orange-300">Demo Data Warning</p>
              <p className="text-orange-700 dark:text-orange-400">
                Some leads are AI-generated demo data for testing purposes. They are NOT real contacts. 
                For verified real data, ensure your Apollo.io API key is valid and has sufficient credits.
              </p>
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Company</TableHead>
                <TableHead className="font-semibold">Job Title</TableHead>
                <TableHead className="font-semibold">Industry</TableHead>
                <TableHead className="font-semibold">Contact</TableHead>
                <TableHead className="font-semibold">Source</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const sourceInfo = sourceColors[lead.source || "manual"] || sourceColors.manual;
                const isDemo = lead.source === "demo_simulated" || lead.source === "ai_generated" || lead.source === "ai_search";
                
                return (
                  <TableRow 
                    key={lead.id} 
                    className={`hover:bg-muted/30 transition-colors ${isDemo ? "bg-orange-50/30 dark:bg-orange-950/10" : ""}`}
                  >
                    <TableCell>
                      <div className="font-medium">{lead.full_name}</div>
                      {lead.linkedin_url && (
                        <a
                          href={lead.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <Linkedin className="h-3 w-3" /> Profile
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{lead.company_name || "—"}</div>
                        <div className="flex flex-wrap gap-1">
                          {lead.company_website && (
                            <a
                              href={lead.company_website.startsWith("http") ? lead.company_website : `https://${lead.company_website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {formatUrl(lead.company_website)}
                            </a>
                          )}
                          {(lead as Lead).company_linkedin_url && (
                            <a
                              href={(lead as Lead).company_linkedin_url!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                            >
                              <Linkedin className="h-3 w-3" /> Company
                            </a>
                          )}
                        </div>
                        {lead.company_size && (
                          <div className="text-xs text-muted-foreground">{lead.company_size} employees</div>
                        )}
                        {lead.company_revenue && (
                          <div className="text-xs text-muted-foreground">Rev: {lead.company_revenue}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{lead.job_title || "—"}</TableCell>
                    <TableCell>{lead.industry || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <a href={`mailto:${lead.email}`} className="hover:text-primary truncate max-w-[150px]">
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${lead.phone}`} className="hover:text-primary">
                              {lead.phone}
                            </a>
                          </div>
                        )}
                        {!lead.email && !lead.phone && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge className={`${sourceInfo.bg} flex items-center gap-1`}>
                            {sourceInfo.icon}
                            {sourceInfo.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isDemo ? (
                            <p className="max-w-xs">This is demo/simulated data for testing. NOT a real contact.</p>
                          ) : lead.source === "apollo" ? (
                            <p>Verified data from Apollo.io</p>
                          ) : (
                            <p>Source: {lead.source || "manual"}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status || "new"]}>
                        {(lead.status || "new").charAt(0).toUpperCase() + (lead.status || "new").slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <AICallPanel lead={lead} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteLead(lead.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LeadsTable;