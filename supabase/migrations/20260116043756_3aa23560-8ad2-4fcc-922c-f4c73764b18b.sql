-- ============================================================
-- SECURITY FIX: Comprehensive database security hardening
-- ============================================================

-- ============================================================
-- 1. FIX SECURITY DEFINER VIEW - Use security_invoker instead
-- ============================================================
-- Drop the old view that implicitly uses SECURITY DEFINER
DROP VIEW IF EXISTS public.crm_connections_secure;

-- Recreate view with security_invoker=on
-- This ensures the view respects the querying user's RLS policies
-- rather than bypassing them with the view owner's privileges
CREATE VIEW public.crm_connections_secure
WITH (security_invoker = on) AS
SELECT 
    id,
    user_id,
    name,
    webhook_url,
    is_active,
    last_sync_at,
    sync_errors,
    created_at,
    updated_at,
    api_key_encrypted,
    -- SECURITY: Never expose actual API key - only boolean indicator
    CASE 
        WHEN api_key IS NOT NULL AND api_key != '' THEN TRUE 
        ELSE FALSE 
    END AS has_api_key,
    -- SECURITY: Masked version for display (last 4 chars only)
    CASE 
        WHEN api_key IS NOT NULL AND length(api_key) > 4 THEN 
            '****' || right(api_key, 4)
        WHEN api_key IS NOT NULL THEN 
            '****'
        ELSE NULL 
    END AS api_key_masked
FROM public.crm_connections;
-- Note: RLS on crm_connections base table enforces auth.uid() = user_id

-- Grant access to authenticated users only
GRANT SELECT ON public.crm_connections_secure TO authenticated;

-- Document the security decision
COMMENT ON VIEW public.crm_connections_secure IS 
'SECURITY: View with security_invoker=on that masks API keys. 
Respects RLS policies of the querying user. Never exposes actual api_key column.
Only returns has_api_key (boolean) and api_key_masked (****xxxx format).
Use this view for ALL client-side queries to crm_connections.';

-- ============================================================
-- 2. VERIFY AND STRENGTHEN LEADS TABLE RLS
-- ============================================================
-- Verify RLS is enabled (this is idempotent)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (prevents bypass)
ALTER TABLE public.leads FORCE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with consistent naming and rules
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;

-- SECURITY: Strict RLS policies - only authenticated users can access their own data
-- No anon access, no public access, service role access is controlled by Supabase
CREATE POLICY "leads_select_own"
ON public.leads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "leads_insert_own"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads_update_own"
ON public.leads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads_delete_own"
ON public.leads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Document security decisions
COMMENT ON TABLE public.leads IS 
'SECURITY: Core business asset - contact database.
RLS FORCED: All access requires authentication.
Policies: Only auth.uid() = user_id access allowed.
No anon/public access. Service role access is backend-only.';

-- ============================================================
-- 3. STRENGTHEN CRM_CONNECTIONS RLS
-- ============================================================
-- Verify RLS is enabled and forced
ALTER TABLE public.crm_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_connections FORCE ROW LEVEL SECURITY;

-- Drop and recreate policies with explicit role targeting
DROP POLICY IF EXISTS "Users can view their own CRM connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Users can insert their own CRM connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Users can update their own CRM connections" ON public.crm_connections;
DROP POLICY IF EXISTS "Users can delete their own CRM connections" ON public.crm_connections;

-- SECURITY: Only authenticated users, strictly their own data
CREATE POLICY "crm_connections_select_own"
ON public.crm_connections FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "crm_connections_insert_own"
ON public.crm_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crm_connections_update_own"
ON public.crm_connections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crm_connections_delete_own"
ON public.crm_connections FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Document security decisions
COMMENT ON TABLE public.crm_connections IS 
'SECURITY: Stores CRM integration configs with encrypted API keys.
api_key column contains Vault secret IDs, NOT plaintext keys.
RLS FORCED: Only authenticated users access their own connections.
Use crm_connections_secure view for client queries (masks api_key).
Decryption via decrypt_crm_api_key() in edge functions only.';

-- ============================================================
-- 4. STRENGTHEN OTHER SENSITIVE TABLES
-- ============================================================

-- profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON TABLE public.profiles IS 
'SECURITY: User PII (email, name, company).
RLS FORCED: Only authenticated users access their own profile.';

-- calls table
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own calls" ON public.calls;

CREATE POLICY "calls_select_own"
ON public.calls FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "calls_insert_own"
ON public.calls FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calls_update_own"
ON public.calls FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "calls_delete_own"
ON public.calls FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON TABLE public.calls IS 
'SECURITY: Call recordings, transcripts, and phone numbers.
RLS FORCED: Only authenticated users access their own calls.';

-- enriched_leads table  
ALTER TABLE public.enriched_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enriched_leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enriched leads" ON public.enriched_leads;
DROP POLICY IF EXISTS "Users can insert their own enriched leads" ON public.enriched_leads;
DROP POLICY IF EXISTS "Users can update their own enriched leads" ON public.enriched_leads;

CREATE POLICY "enriched_leads_select_own"
ON public.enriched_leads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "enriched_leads_insert_own"
ON public.enriched_leads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enriched_leads_update_own"
ON public.enriched_leads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "enriched_leads_delete_own"
ON public.enriched_leads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON TABLE public.enriched_leads IS 
'SECURITY: Proprietary lead intelligence and scoring.
RLS FORCED: Only authenticated users access their own data.';

-- crm_sync_logs table
ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sync_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sync logs" ON public.crm_sync_logs;
DROP POLICY IF EXISTS "Users can insert their own sync logs" ON public.crm_sync_logs;

CREATE POLICY "crm_sync_logs_select_own"
ON public.crm_sync_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "crm_sync_logs_insert_own"
ON public.crm_sync_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crm_sync_logs_update_own"
ON public.crm_sync_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

COMMENT ON TABLE public.crm_sync_logs IS 
'SECURITY: CRM sync history with payloads.
RLS FORCED: Only authenticated users access their own logs.';

-- usage_logs table
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own usage" ON public.usage_logs;
DROP POLICY IF EXISTS "Users can view their own usage" ON public.usage_logs;

CREATE POLICY "usage_logs_select_own"
ON public.usage_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "usage_logs_insert_own"
ON public.usage_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.usage_logs IS 
'SECURITY: User activity and billing data.
RLS FORCED: Only authenticated users access their own usage.';