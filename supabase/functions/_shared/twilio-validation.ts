import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

/**
 * Validates that a request is genuinely from Twilio by checking the X-Twilio-Signature header.
 * 
 * How Twilio signature validation works:
 * 1. Twilio concatenates the full URL with all POST parameters sorted by name
 * 2. Twilio signs the result with HMAC-SHA1 using your Auth Token
 * 3. The signature is sent in the X-Twilio-Signature header
 * 
 * @param req The incoming request object
 * @param formDataParams The form data parameters as a record
 * @returns boolean indicating if the signature is valid
 */
export function validateTwilioSignature(
  req: Request,
  formDataParams: Record<string, string>
): boolean {
  const twilioSignature = req.headers.get("X-Twilio-Signature");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

  // If no auth token is configured, we can't validate (development mode)
  if (!authToken) {
    console.warn("TWILIO_AUTH_TOKEN not configured - skipping signature validation");
    return true; // Allow in development when token isn't set
  }

  // If no signature provided, reject
  if (!twilioSignature) {
    console.error("Missing X-Twilio-Signature header");
    return false;
  }

  // Get the full URL (Twilio uses the complete URL including query params)
  const url = req.url;

  // Sort parameters alphabetically and concatenate key-value pairs
  const sortedParams = Object.keys(formDataParams)
    .sort()
    .map(key => `${key}${formDataParams[key] || ''}`)
    .join('');

  // Concatenate URL and sorted parameters
  const signatureData = url + sortedParams;

  // Generate HMAC-SHA1 signature
  const hmac = createHmac("sha1", authToken);
  hmac.update(signatureData);
  const expectedSignature = hmac.digest("base64");

  // Compare signatures
  const isValid = twilioSignature === expectedSignature;

  if (!isValid) {
    console.error("Twilio signature validation failed", {
      received: twilioSignature,
      expected: expectedSignature,
      url: url,
    });
  }

  return isValid;
}

/**
 * Parse form data and return as a record for signature validation
 */
export async function parseFormDataForValidation(
  req: Request
): Promise<{ formData: FormData; params: Record<string, string> }> {
  // Clone the request since formData() consumes the body
  const clonedReq = req.clone();
  const formData = await clonedReq.formData();
  
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  return { formData, params };
}
