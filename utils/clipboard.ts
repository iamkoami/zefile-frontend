/**
 * Clipboard Utility
 * Handles copying text to clipboard with fallback for older browsers
 */

import { toast } from '@/components/shared/Toast';

export interface CopyToClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

/**
 * Copy text to clipboard with toast feedback
 * Uses modern Clipboard API with fallback to execCommand
 */
export async function copyToClipboard(
  text: string,
  options: CopyToClipboardOptions = {}
): Promise<boolean> {
  const {
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy to clipboard',
    showToast = true,
  } = options;

  try {
    // Modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      if (showToast) {
        toast.success(successMessage);
      }
      return true;
    }

    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (success) {
      if (showToast) {
        toast.success(successMessage);
      }
      return true;
    } else {
      throw new Error('execCommand failed');
    }
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    if (showToast) {
      toast.error(errorMessage);
    }
    return false;
  }
}

/**
 * Get the short link domain from environment
 * Returns the configured domain or fallback to zefile.co
 */
export function getShortLinkDomain(): string {
  return process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'zefile.co';
}

/**
 * Get the short code prefix from environment
 * Returns the configured prefix or fallback to 'z-'
 */
export function getShortCodePrefix(): string {
  return process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || 'z-';
}

/**
 * Build full short URL from shortCode (includes prefix)
 * Backend stores shortCode WITHOUT prefix, this function adds it
 * Example: shortCode "aBc12XyZ45" -> "https://zefile.co/z-aBc12XyZ45"
 */
export function buildShortUrl(shortCode: string): string {
  const domain = getShortLinkDomain();
  const prefix = getShortCodePrefix();
  const protocol = domain.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${domain}/${prefix}${shortCode}`;
}

/**
 * Build display URL (domain + prefix + shortCode, no protocol)
 * For displaying in UI input fields
 * Example: shortCode "aBc12XyZ45" -> "zefile.co/z-aBc12XyZ45"
 */
export function buildDisplayUrl(shortCode: string): string {
  const domain = getShortLinkDomain();
  const prefix = getShortCodePrefix();
  return `${domain}/${prefix}${shortCode}`;
}

/**
 * Copy transfer link to clipboard
 * Generates the short URL from transfer shortCode
 */
export async function copyTransferLink(
  shortCode: string,
  successMessage?: string,
  errorMessage?: string
): Promise<boolean> {
  if (!shortCode) {
    toast.error('No link available for this transfer');
    return false;
  }

  // Backend stores shortCode WITHOUT prefix, buildShortUrl adds it
  const shortUrl = buildShortUrl(shortCode);
  return copyToClipboard(shortUrl, {
    successMessage: successMessage ?? 'Link copied to clipboard',
    errorMessage: errorMessage ?? 'Failed to copy link',
  });
}
