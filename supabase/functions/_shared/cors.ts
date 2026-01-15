// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://sales-streamline-ai.lovable.app',
  'https://id-preview--6ea5b46d-37b8-4684-861e-25e6d2f4e418.lovable.app',
  // Development origins
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://localhost:3000',
];

/**
 * Get CORS headers with origin validation
 * Only allows requests from trusted origins
 */
export const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // Check if the origin is in our allowed list
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    // Allow Lovable preview URLs pattern
    /^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(origin)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Legacy export for backward compatibility - prefer getCorsHeaders
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
