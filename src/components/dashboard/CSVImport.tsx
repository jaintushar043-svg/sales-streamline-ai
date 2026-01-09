import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface CSVImportProps {
  onImport: (leads: ParsedLead[]) => Promise<void>;
  isImporting: boolean;
}

export interface ParsedLead {
  full_name: string;
  company_name?: string;
  job_title?: string;
  linkedin_url?: string;
  company_website?: string;
  company_size?: string;
  industry?: string;
  email?: string;
  phone?: string;
  company_revenue?: string;
}

const requiredFields = ["full_name"];
const optionalFields = [
  "company_name",
  "job_title",
  "linkedin_url",
  "company_website",
  "company_size",
  "industry",
  "email",
  "phone",
  "company_revenue",
];

const CSVImport = ({ onImport, isImporting }: CSVImportProps) => {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);

      if (parsed.length < 2) {
        toast.error("CSV must have at least a header row and one data row");
        return;
      }

      setHeaders(parsed[0]);
      setCsvData(parsed.slice(1));

      // Auto-map matching headers
      const autoMapping: Record<string, string> = {};
      const allFields = [...requiredFields, ...optionalFields];

      parsed[0].forEach((header) => {
        const normalized = header.toLowerCase().replace(/[\s_-]+/g, "_");
        const match = allFields.find(
          (field) =>
            field === normalized ||
            field.includes(normalized) ||
            normalized.includes(field.replace("_", ""))
        );
        if (match) {
          autoMapping[match] = header;
        }
      });

      setMapping(autoMapping);
      setStep("mapping");
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!mapping.full_name) {
      toast.error("Please map the Full Name field");
      return;
    }

    const leads: ParsedLead[] = csvData.map((row) => {
      const lead: ParsedLead = { full_name: "" };

      Object.entries(mapping).forEach(([field, header]) => {
        const index = headers.indexOf(header);
        if (index !== -1 && row[index]) {
          (lead as any)[field] = row[index];
        }
      });

      return lead;
    }).filter((lead) => lead.full_name);

    if (leads.length === 0) {
      toast.error("No valid leads found in CSV");
      return;
    }

    await onImport(leads);
    setOpen(false);
    resetState();
  };

  const resetState = () => {
    setCsvData([]);
    setHeaders([]);
    setMapping({});
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Leads from CSV
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Click to upload CSV file</p>
              <p className="text-sm text-muted-foreground mt-1">
                CSV should include name, company, email, and other lead data
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Map your CSV columns</p>
                <p className="text-muted-foreground">
                  Found {csvData.length} rows. Match your columns to lead fields.
                </p>
              </div>
            </div>

            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
              {[...requiredFields, ...optionalFields].map((field) => (
                <div key={field} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-medium flex items-center gap-1">
                    {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    {requiredFields.includes(field) && (
                      <span className="text-destructive">*</span>
                    )}
                  </div>
                  <Select
                    value={mapping[field] || ""}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field]: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Skip —</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mapping[field] && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={!mapping.full_name || isImporting}>
                {isImporting ? "Importing..." : `Import ${csvData.length} Leads`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CSVImport;
