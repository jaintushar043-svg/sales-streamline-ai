import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { ParsedLead } from "@/components/dashboard/CSVImport";

type Lead = Tables<"leads">;

interface UseLeadsOptions {
  userId: string | undefined;
}

export const useLeads = ({ userId }: UseLeadsOptions) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All Industries");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const fetchLeads = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [userId]);

  const importLeads = async (parsedLeads: ParsedLead[]) => {
    if (!userId) {
      toast.error("You must be logged in to import leads");
      return;
    }

    setIsImporting(true);
    try {
      const leadsToInsert = parsedLeads.map((lead) => ({
        ...lead,
        user_id: userId,
        status: "new" as const,
      }));

      const { data, error } = await supabase
        .from("leads")
        .insert(leadsToInsert)
        .select();

      if (error) throw error;

      setLeads((prev) => [...(data || []), ...prev]);
      toast.success(`Successfully imported ${data?.length || 0} leads`);
    } catch (error) {
      console.error("Error importing leads:", error);
      toast.error("Failed to import leads");
    } finally {
      setIsImporting(false);
    }
  };

  const deleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;

      setLeads((prev) => prev.filter((lead) => lead.id !== leadId));
      toast.success("Lead deleted");
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast.error("Failed to delete lead");
    }
  };

  const exportToCSV = () => {
    if (filteredLeads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = [
      "Full Name",
      "Company",
      "Job Title",
      "Industry",
      "Company Size",
      "Email",
      "Phone",
      "LinkedIn URL",
      "Company Website",
      "Company Revenue",
      "Status",
      "Created At",
    ];

    const rows = filteredLeads.map((lead) => [
      lead.full_name,
      lead.company_name || "",
      lead.job_title || "",
      lead.industry || "",
      lead.company_size || "",
      lead.email || "",
      lead.phone || "",
      lead.linkedin_url || "",
      lead.company_website || "",
      lead.company_revenue || "",
      lead.status || "new",
      new Date(lead.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast.success(`Exported ${filteredLeads.length} leads`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setIndustryFilter("All Industries");
    setStatusFilter("All Statuses");
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableFields = [
          lead.full_name,
          lead.company_name,
          lead.email,
          lead.job_title,
        ].filter(Boolean);

        if (!searchableFields.some((field) => field?.toLowerCase().includes(query))) {
          return false;
        }
      }

      // Industry filter
      if (industryFilter !== "All Industries" && lead.industry !== industryFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "All Statuses" && lead.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [leads, searchQuery, industryFilter, statusFilter]);

  return {
    leads: filteredLeads,
    allLeads: leads,
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
    refetch: fetchLeads,
  };
};
