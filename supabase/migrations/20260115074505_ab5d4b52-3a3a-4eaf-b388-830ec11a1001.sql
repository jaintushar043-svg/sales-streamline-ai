-- Enable the vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- Create a function to encrypt and store an API key in vault
-- Returns the vault secret ID (UUID) to store in crm_connections
CREATE OR REPLACE FUNCTION public.encrypt_crm_api_key(
  p_api_key TEXT,
  p_connection_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id UUID;
  v_secret_name TEXT;
BEGIN
  -- Generate a unique name for this secret
  v_secret_name := 'crm_api_key_' || p_connection_id::TEXT;
  
  -- Insert the secret into vault
  INSERT INTO vault.secrets (name, secret)
  VALUES (v_secret_name, p_api_key)
  RETURNING id INTO v_secret_id;
  
  RETURN v_secret_id;
END;
$$;

-- Create a function to retrieve and decrypt an API key from vault
-- Only accessible via service role (SECURITY DEFINER runs as owner)
CREATE OR REPLACE FUNCTION public.decrypt_crm_api_key(
  p_secret_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decrypted TEXT;
BEGIN
  -- Retrieve the decrypted secret from vault
  SELECT decrypted_secret INTO v_decrypted
  FROM vault.decrypted_secrets
  WHERE id = p_secret_id;
  
  RETURN v_decrypted;
END;
$$;

-- Create a function to delete a vault secret
CREATE OR REPLACE FUNCTION public.delete_crm_api_key(
  p_secret_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM vault.secrets WHERE id = p_secret_id;
  RETURN FOUND;
END;
$$;

-- Create a function to update a vault secret
CREATE OR REPLACE FUNCTION public.update_crm_api_key(
  p_secret_id UUID,
  p_new_api_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE vault.secrets 
  SET secret = p_new_api_key, updated_at = NOW()
  WHERE id = p_secret_id;
  
  RETURN FOUND;
END;
$$;

-- Add a column to track if the api_key contains a vault secret ID vs plain text
-- This allows gradual migration of existing connections
ALTER TABLE public.crm_connections 
ADD COLUMN IF NOT EXISTS api_key_encrypted BOOLEAN DEFAULT FALSE;

-- Grant execute permissions on these functions to authenticated users
-- The functions themselves use SECURITY DEFINER to access vault
GRANT EXECUTE ON FUNCTION public.encrypt_crm_api_key(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_crm_api_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_crm_api_key(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_crm_api_key(UUID, TEXT) TO service_role;

-- Revoke direct access from anon and authenticated - only service_role can decrypt
REVOKE EXECUTE ON FUNCTION public.decrypt_crm_api_key(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_crm_api_key(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_crm_api_key(UUID, TEXT) FROM anon, authenticated;