/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitizes user input to prevent prompt injection attacks
 * Removes control characters, newlines, and potentially dangerous patterns
 */
export const sanitizePromptInput = (
  input: string | undefined | null,
  maxLength: number = 100
): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    // Remove newlines, tabs, and carriage returns that could break prompt structure
    .replace(/[\r\n\t]/g, ' ')
    // Remove potential prompt injection patterns
    .replace(/[`]/g, "'")
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, maxLength)
    .trim();
};

/**
 * Validates that a URL is safe for server-side requests (anti-SSRF)
 * Blocks internal networks, localhost, and metadata endpoints
 */
export const validateWebhookUrl = (url: string): { valid: boolean; error?: string } => {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS webhooks are allowed for security' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost and loopback
    const blockedHostnames = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
      // AWS metadata
      '169.254.169.254',
      // GCP metadata
      'metadata.google.internal',
      'metadata.goog',
      // Azure metadata
      '169.254.169.254',
      // Kubernetes
      'kubernetes.default',
      'kubernetes.default.svc',
    ];
    
    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: 'This hostname is not allowed' };
    }
    
    // Block private IP ranges
    const privateIpPatterns = [
      /^10\./,                          // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
      /^192\.168\./,                     // 192.168.0.0/16
      /^127\./,                          // 127.0.0.0/8
      /^169\.254\./,                     // Link-local
      /^0\./,                            // 0.0.0.0/8
    ];
    
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Private IP addresses are not allowed' };
      }
    }
    
    // Block internal TLDs
    const blockedTlds = ['.local', '.internal', '.localhost', '.corp'];
    for (const tld of blockedTlds) {
      if (hostname.endsWith(tld)) {
        return { valid: false, error: 'Internal domains are not allowed' };
      }
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
};

/**
 * Sanitizes transcript or long-form text for AI processing
 * More permissive than prompt input but still removes injection patterns
 */
export const sanitizeTranscript = (
  input: string | undefined | null,
  maxLength: number = 50000
): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove backticks that could escape prompts
    .replace(/`/g, "'")
    // Limit length
    .slice(0, maxLength)
    .trim();
};
