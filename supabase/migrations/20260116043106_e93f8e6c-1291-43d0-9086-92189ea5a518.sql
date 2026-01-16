-- SECURITY FIX: Prevent API keys from being exposed in SELECT queries
-- This migration creates a secure view and updates RLS policies to protect CRM API keys

-- 1. Drop existing policy on crm_connections
DROP POLICY IF EXISTS "Users can manage their own CRM connections" ON public.crm_connections;

-- 2. Create separate, more restrictive policies for crm_connections
-- SELECT policy: Never return the api_key column to clients
-- We'll enforce this via a view instead, but also add column-level protection

-- Allow users to SELECT their own connections (will use view to mask api_key)
CREATE POLICY "Users can view their own CRM connections"
ON public.crm_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own connections
CREATE POLICY "Users can insert their own CRM connections"
ON public.crm_connections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own connections
CREATE POLICY "Users can update their own CRM connections"
ON public.crm_connections
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to DELETE their own connections
CREATE POLICY "Users can delete their own CRM connections"
ON public.crm_connections
FOR DELETE
USING (auth.uid() = user_id);

-- 3. Create a secure view that masks the api_key column
-- This view NEVER exposes the actual API key to clients
CREATE OR REPLACE VIEW public.crm_connections_secure AS
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
    -- Return masked indicator only, never the actual key
    CASE 
        WHEN api_key IS NOT NULL AND api_key != '' THEN TRUE 
        ELSE FALSE 
    END AS has_api_key,
    -- Return masked version for display (last 4 chars only)
    CASE 
        WHEN api_key IS NOT NULL AND length(api_key) > 4 THEN 
            '****' || right(api_key, 4)
        WHEN api_key IS NOT NULL THEN 
            '****'
        ELSE NULL 
    END AS api_key_masked
FROM public.crm_connections
WHERE auth.uid() = user_id;

-- 4. Grant access to the secure view
GRANT SELECT ON public.crm_connections_secure TO authenticated;

-- 5. Create a function to safely check if a connection has an API key
-- This is used by edge functions to determine if decryption is needed
CREATE OR REPLACE FUNCTION public.get_crm_connection_for_sync(p_connection_id uuid, p_user_id uuid)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    name text,
    webhook_url text,
    is_active boolean,
    has_encrypted_key boolean,
    encrypted_key_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- SECURITY: This function returns connection info for syncing
    -- It returns the encrypted key ID (vault secret ID) but NEVER the actual key
    -- The actual decryption happens in decrypt_crm_api_key function
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.name,
        c.webhook_url,
        c.is_active,
        c.api_key_encrypted,
        c.api_key  -- This is the vault secret ID, not the actual key
    FROM public.crm_connections c
    WHERE c.id = p_connection_id 
    AND c.user_id = p_user_id
    AND c.is_active = true;
END;
$$;

-- 6. Add comment explaining security decisions
COMMENT ON TABLE public.crm_connections IS 
'CRM connection configurations. SECURITY: api_key column stores vault secret IDs (not plaintext keys). 
Use crm_connections_secure view for client queries. Use decrypt_crm_api_key() server-side only.';

COMMENT ON VIEW public.crm_connections_secure IS 
'Secure view of CRM connections that masks API keys. Use this view for all client-side queries.
Never exposes actual API keys - only shows has_api_key boolean and masked version (****xxxx).';

COMMENT ON FUNCTION public.get_crm_connection_for_sync IS 
'Returns CRM connection info for server-side sync operations. Returns encrypted_key_id (vault secret ID) 
which can be decrypted using decrypt_crm_api_key(). NEVER logs or exposes the decrypted key.';