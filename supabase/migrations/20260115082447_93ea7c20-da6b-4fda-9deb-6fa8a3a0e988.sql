-- Create table to track authentication attempts for rate limiting
CREATE TABLE public.auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  attempt_type TEXT NOT NULL, -- 'login', 'signup', 'password_reset'
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Create index for efficient lookups
CREATE INDEX idx_auth_rate_limits_lookup ON public.auth_rate_limits (identifier, attempt_type, attempted_at DESC);

-- Enable RLS but allow inserts from authenticated and anonymous users
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserting rate limit records (needed for tracking)
CREATE POLICY "Allow inserting rate limit records"
ON public.auth_rate_limits
FOR INSERT
WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies - only backend functions should read this data

-- Create function to check rate limit (returns true if rate limited)
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM public.auth_rate_limits
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND success = false
    AND attempted_at > (now() - (p_window_minutes || ' minutes')::interval);
  
  RETURN v_attempt_count >= p_max_attempts;
END;
$$;

-- Create function to record an auth attempt
CREATE OR REPLACE FUNCTION public.record_auth_attempt(
  p_identifier TEXT,
  p_attempt_type TEXT,
  p_success BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.auth_rate_limits (identifier, attempt_type, success)
  VALUES (p_identifier, p_attempt_type, p_success);
  
  -- Clean up old records (older than 24 hours) to prevent table bloat
  DELETE FROM public.auth_rate_limits
  WHERE attempted_at < (now() - interval '24 hours');
END;
$$;

-- Create function to clear rate limit on successful auth
CREATE OR REPLACE FUNCTION public.clear_auth_rate_limit(
  p_identifier TEXT,
  p_attempt_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_rate_limits
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type;
END;
$$;