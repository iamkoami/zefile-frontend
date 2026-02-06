/**
 * Security utilities for validating URLs and preventing open redirect attacks
 */

/**
 * Allowed payment provider domains
 * Add new payment provider domains here as they are integrated
 */
const ALLOWED_PAYMENT_DOMAINS = [
  "checkout.paystack.com",
  "api.paystack.com",
  "standard.paystack.co",
  "paystack.com",
];

/**
 * Validates that a payment authorization URL is from an allowed domain
 * Prevents open redirect attacks by ensuring we only redirect to trusted payment providers
 *
 * @param url - The URL to validate
 * @returns true if the URL is from an allowed payment domain
 */
export function isValidPaymentRedirectUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Must be HTTPS for payment URLs
    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    // Check if the hostname matches an allowed payment domain
    const hostname = parsedUrl.hostname.toLowerCase();
    return ALLOWED_PAYMENT_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Safely redirects to a payment authorization URL after validation
 * Throws an error if the URL is not from an allowed payment domain
 *
 * @param url - The payment authorization URL to redirect to
 * @throws Error if the URL is not valid or not from an allowed domain
 */
export function safePaymentRedirect(url: string): void {
  if (!isValidPaymentRedirectUrl(url)) {
    throw new Error("Invalid payment authorization URL");
  }
  window.location.href = url;
}
