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
import { ExternalLink, Trash2, Building2, Phone, Mail } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Lead = Tables<"leads">;

interface LeadsTableProps {
  leads: Lead[];
  onDeleteLead: (id: string) => void;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
  lost: "bg-red-100 text-red-800",
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

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Company</TableHead>
            <TableHead className="font-semibold">Job Title</TableHead>
            <TableHead className="font-semibold">Industry</TableHead>
            <TableHead className="font-semibold">Contact</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="hover:bg-muted/30 transition-colors">
              <TableCell>
                <div className="font-medium">{lead.full_name}</div>
                {lead.linkedin_url && (
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </TableCell>
              <TableCell>
                <div>{lead.company_name || "—"}</div>
                {lead.company_website && (
                  <a
                    href={lead.company_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    {new URL(lead.company_website).hostname}
                  </a>
                )}
                {lead.company_size && (
                  <div className="text-xs text-muted-foreground">{lead.company_size} employees</div>
                )}
              </TableCell>
              <TableCell>{lead.job_title || "—"}</TableCell>
              <TableCell>{lead.industry || "—"}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  {lead.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <a href={`mailto:${lead.email}`} className="hover:text-primary">
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
                <Badge className={statusColors[lead.status || "new"]}>
                  {(lead.status || "new").charAt(0).toUpperCase() + (lead.status || "new").slice(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteLead(lead.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTable;
