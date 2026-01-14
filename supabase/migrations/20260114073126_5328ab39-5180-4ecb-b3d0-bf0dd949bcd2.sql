-- Add company_linkedin_url field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS company_linkedin_url TEXT;