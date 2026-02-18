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

/**
 * Build a custom domain URL from shortCode and custom domain
 * Example: buildCustomDomainUrl("aBc12XyZ45", "files.acme.com") -> "https://files.acme.com/z-aBc12XyZ45"
 */
export function buildCustomDomainUrl(shortCode: string, customDomain: string): string {
  const prefix = getShortCodePrefix();
  return `https://${customDomain}/${prefix}${shortCode}`;
}

/**
 * Build display URL for custom domain (no protocol)
 * Example: buildCustomDomainDisplayUrl("aBc12XyZ45", "files.acme.com") -> "files.acme.com/z-aBc12XyZ45"
 */
export function buildCustomDomainDisplayUrl(shortCode: string, customDomain: string): string {
  const prefix = getShortCodePrefix();
  return `${customDomain}/${prefix}${shortCode}`;
}

/**
 * Network types for share tracking
 */
export type ShareNetwork = 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'telegram' | 'email';

/**
 * Build a share URL with network tracking hint
 * The z_network param tells the redirect handler which network the user came from
 */
export function buildShareUrl(shortCode: string, network: ShareNetwork): string {
  const baseUrl = buildShortUrl(shortCode);
  return `${baseUrl}?z_network=${network}`;
}

/**
 * Get the share URL for a specific network
 * Opens the appropriate share dialog with the transfer link
 */
export function getShareLink(
  shortCode: string,
  network: ShareNetwork,
  options?: { title?: string; message?: string }
): string {
  const shareUrl = buildShareUrl(shortCode, network);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(options?.title || '');
  const encodedMessage = encodeURIComponent(options?.message || '');

  switch (network) {
    case 'whatsapp':
      // WhatsApp supports text with URL
      const whatsappText = options?.message
        ? `${options.message} ${shareUrl}`
        : shareUrl;
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;

    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    case 'twitter':
      // Twitter/X supports text with URL
      const tweetText = options?.message
        ? `${options.message} ${shareUrl}`
        : shareUrl;
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    case 'telegram':
      // Telegram supports URL and text separately
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`;

    case 'email':
      // Email with subject and body
      const subject = options?.title || 'Check out this file transfer';
      const body = options?.message
        ? `${options.message}\n\n${shareUrl}`
        : `Download your files here:\n${shareUrl}`;
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    default:
      return shareUrl;
  }
}

/**
 * Open share dialog for a specific network
 * Uses window.open for social networks, location.href for email
 */
export function openShareDialog(
  shortCode: string,
  network: ShareNetwork,
  options?: { title?: string; message?: string }
): void {
  const shareLink = getShareLink(shortCode, network, options);

  if (network === 'email') {
    window.location.href = shareLink;
  } else {
    // Open in popup window for social networks
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    window.open(
      shareLink,
      'share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );
  }
}
