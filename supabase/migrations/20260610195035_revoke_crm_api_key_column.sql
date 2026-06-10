-- Prevent clients from reading the raw api_key column directly.
-- Clients must use the crm_connections_secure view (masked) instead.
-- Edge functions use service_role which is unaffected.
REVOKE SELECT (api_key) ON public.crm_connections FROM authenticated;
REVOKE SELECT (api_key) ON public.crm_connections FROM anon;

-- Re-grant SELECT on all other columns to authenticated so RLS-scoped reads still work.
GRANT SELECT (
  id, user_id, name, webhook_url, is_active, last_sync_at,
  sync_errors, created_at, updated_at, api_key_encrypted
) ON public.crm_connections TO authenticated;
