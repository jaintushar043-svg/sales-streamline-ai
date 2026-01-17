-- Add Vapi-specific columns to calls table
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS vapi_call_id TEXT,
ADD COLUMN IF NOT EXISTS vapi_recording_url TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Create index for faster lookups by vapi_call_id
CREATE INDEX IF NOT EXISTS idx_calls_vapi_call_id ON public.calls(vapi_call_id);

-- Add comment explaining the columns
COMMENT ON COLUMN public.calls.vapi_call_id IS 'Vapi.ai call identifier for tracking';
COMMENT ON COLUMN public.calls.vapi_recording_url IS 'URL to the call recording from Vapi';
COMMENT ON COLUMN public.calls.ai_summary IS 'AI-generated summary of the call conversation';