import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface LeadFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  industryFilter: string;
  onIndustryChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

const industries = [
  "All Industries",
  "SaaS",
  "Technology",
  "Finance",
  "Healthcare",
  "Real Estate",
  "E-commerce",
  "Manufacturing",
  "Consulting",
];

const statuses = [
  "All Statuses",
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
];

const LeadFilters = ({
  searchQuery,
  onSearchChange,
  industryFilter,
  onIndustryChange,
  statusFilter,
  onStatusChange,
  onClearFilters,
}: LeadFiltersProps) => {
  const hasFilters = searchQuery || industryFilter !== "All Industries" || statusFilter !== "All Statuses";

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search leads by name, company, email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <div className="flex gap-2 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        
        <Select value={industryFilter} onValueChange={onIndustryChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status === "All Statuses" ? status : status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};

export default LeadFilters;
