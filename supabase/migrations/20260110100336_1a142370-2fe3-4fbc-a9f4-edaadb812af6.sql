-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create billing_plans table
CREATE TABLE public.billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_monthly INTEGER NOT NULL DEFAULT 0,
    leads_limit INTEGER NOT NULL DEFAULT 100,
    enrichment_limit INTEGER NOT NULL DEFAULT 50,
    ai_call_minutes INTEGER NOT NULL DEFAULT 0,
    manual_call_minutes INTEGER NOT NULL DEFAULT 0,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.billing_plans (name, price_monthly, leads_limit, enrichment_limit, ai_call_minutes, manual_call_minutes, features) VALUES
('Starter', 99, 500, 100, 0, 60, '["Lead discovery", "CSV export", "Basic filters"]'),
('Pro', 299, 2000, 500, 120, 300, '["CRM sync", "AI enrichment", "Automation", "AI calling"]'),
('Agency', 999, 10000, 2500, 600, 1500, '["Multi-client", "High volume", "Priority support", "Custom integrations"]');

-- Add plan_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.billing_plans(id);

-- Create usage_logs table
CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    usage_type TEXT NOT NULL, -- 'lead_search', 'enrichment', 'ai_call', 'manual_call'
    quantity INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
ON public.usage_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
ON public.usage_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create enriched_leads table
CREATE TABLE public.enriched_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID NOT NULL,
    company_summary TEXT,
    decision_maker_relevance INTEGER DEFAULT 0, -- 0-100
    lead_score INTEGER DEFAULT 0, -- 0-100
    enrichment_data JSONB DEFAULT '{}'::jsonb,
    enriched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (lead_id)
);

ALTER TABLE public.enriched_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enriched leads"
ON public.enriched_leads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enriched leads"
ON public.enriched_leads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enriched leads"
ON public.enriched_leads FOR UPDATE
USING (auth.uid() = user_id);

-- Create crm_connections table
CREATE TABLE public.crm_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    api_key TEXT, -- encrypted in practice
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own CRM connections"
ON public.crm_connections FOR ALL
USING (auth.uid() = user_id);

-- Create calls table
CREATE TABLE public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    call_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'ai_agent'
    call_sid TEXT, -- Twilio call SID
    phone_number TEXT,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed', 'no_answer'
    outcome TEXT, -- 'interested', 'follow_up', 'not_interested', 'wrong_number', 'demo_booked'
    recording_url TEXT,
    transcript TEXT,
    call_summary TEXT,
    notes TEXT,
    ai_script_type TEXT, -- 'cold_outreach', 'follow_up'
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calls"
ON public.calls FOR ALL
USING (auth.uid() = user_id);

-- Create crm_sync_logs table for tracking sync attempts
CREATE TABLE public.crm_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    connection_id UUID REFERENCES public.crm_connections(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    payload JSONB,
    response JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync logs"
ON public.crm_sync_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync logs"
ON public.crm_sync_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add source column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_type ON public.usage_logs(user_id, usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON public.usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON public.calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON public.calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_enriched_leads_user_id ON public.enriched_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_status ON public.crm_sync_logs(status);

-- Function to get user's current month usage
CREATE OR REPLACE FUNCTION public.get_user_usage(_user_id UUID)
RETURNS TABLE (
    leads_searched BIGINT,
    leads_enriched BIGINT,
    ai_call_minutes BIGINT,
    manual_call_minutes BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(SUM(CASE WHEN usage_type = 'lead_search' THEN quantity ELSE 0 END), 0) as leads_searched,
        COALESCE(SUM(CASE WHEN usage_type = 'enrichment' THEN quantity ELSE 0 END), 0) as leads_enriched,
        COALESCE(SUM(CASE WHEN usage_type = 'ai_call' THEN quantity ELSE 0 END), 0) as ai_call_minutes,
        COALESCE(SUM(CASE WHEN usage_type = 'manual_call' THEN quantity ELSE 0 END), 0) as manual_call_minutes
    FROM public.usage_logs
    WHERE user_id = _user_id
    AND created_at >= date_trunc('month', now())
$$;

-- Enable realtime for calls table
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;