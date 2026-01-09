-- Create leads table for storing imported and discovered leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  job_title TEXT,
  linkedin_url TEXT,
  company_website TEXT,
  company_size TEXT,
  industry TEXT,
  email TEXT,
  phone TEXT,
  company_revenue TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Users can only view their own leads
CREATE POLICY "Users can view their own leads"
ON public.leads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own leads
CREATE POLICY "Users can insert their own leads"
ON public.leads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own leads
CREATE POLICY "Users can update their own leads"
ON public.leads
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own leads
CREATE POLICY "Users can delete their own leads"
ON public.leads
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();