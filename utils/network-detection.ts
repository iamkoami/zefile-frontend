/**
 * Network Detection Utility
 *
 * Detects traffic source from referrer and user-agent for transfer link tracking.
 * Used to identify where users come from when accessing transfer links.
 *
 * @see Story 18.1: Network Detection Utility
 */

export type NetworkType =
  | 'direct'
  | 'whatsapp'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'instagram'
  | 'telegram'
  | 'email'
  | 'other';

/**
 * Referrer patterns mapped to network types
 * Order matters for patterns that might overlap
 */
const REFERRER_PATTERNS: Record<string, NetworkType> = {
  // Facebook
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'm.facebook.com': 'facebook',
  'l.facebook.com': 'facebook',
  'lm.facebook.com': 'facebook',

  // Twitter/X
  'twitter.com': 'twitter',
  'x.com': 'twitter',
  't.co': 'twitter',
  'mobile.twitter.com': 'twitter',

  // WhatsApp
  'whatsapp.com': 'whatsapp',
  'wa.me': 'whatsapp',
  'web.whatsapp.com': 'whatsapp',
  'api.whatsapp.com': 'whatsapp',

  // LinkedIn
  'linkedin.com': 'linkedin',
  'lnkd.in': 'linkedin',

  // Instagram
  'instagram.com': 'instagram',
  'l.instagram.com': 'instagram',

  // Telegram
  't.me': 'telegram',
  'telegram.org': 'telegram',
  'telegram.me': 'telegram',

  // Email clients
  'mail.google.com': 'email',
  'outlook.com': 'email',
  'outlook.live.com': 'email',
  'outlook.office.com': 'email',
  'outlook.office365.com': 'email',
  'mail.yahoo.com': 'email',
  'mail.aol.com': 'email',
  'protonmail.com': 'email',
  'proton.me': 'email',
};

/**
 * User-agent patterns for in-app browser detection
 * These take precedence over referrer detection as they're more accurate
 */
const USER_AGENT_PATTERNS: Array<{ pattern: RegExp; network: NetworkType }> = [
  // Facebook in-app browser
  { pattern: /FBAN|FBAV|FB_IAB|FBIOS|FBSS/i, network: 'facebook' },

  // Instagram in-app browser
  { pattern: /Instagram/i, network: 'instagram' },

  // Twitter in-app browser
  { pattern: /Twitter/i, network: 'twitter' },

  // LinkedIn in-app browser
  { pattern: /LinkedInApp/i, network: 'linkedin' },

  // Snapchat in-app browser
  { pattern: /Snapchat/i, network: 'other' },

  // Pinterest in-app browser
  { pattern: /Pinterest/i, network: 'other' },
];

/**
 * Detect network type from referrer URL
 *
 * @param referrer - The document.referrer value
 * @returns The detected network type or null if not detected
 */
export function detectNetworkFromReferrer(referrer: string): NetworkType | null {
  if (!referrer) return null;

  const referrerLower = referrer.toLowerCase();

  for (const [pattern, network] of Object.entries(REFERRER_PATTERNS)) {
    if (referrerLower.includes(pattern)) {
      return network;
    }
  }

  return null;
}

/**
 * Detect network type from user-agent string
 * This detects in-app browsers from social media apps
 *
 * @param userAgent - The navigator.userAgent value
 * @returns The detected network type or null if not detected
 */
export function detectNetworkFromUserAgent(userAgent: string): NetworkType | null {
  if (!userAgent) return null;

  for (const { pattern, network } of USER_AGENT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return network;
    }
  }

  return null;
}

/**
 * Detect network type from current browser context
 *
 * Priority:
 * 1. User-agent detection (most accurate for in-app browsers)
 * 2. Referrer detection (for web-to-web navigation)
 * 3. Default to 'direct' if nothing detected
 *
 * @returns The detected network type
 */
export function detectNetwork(): NetworkType {
  // User-agent detection takes precedence (more accurate for in-app browsers)
  if (typeof navigator !== 'undefined') {
    const uaNetwork = detectNetworkFromUserAgent(navigator.userAgent);
    if (uaNetwork) return uaNetwork;
  }

  // Fall back to referrer detection
  if (typeof document !== 'undefined') {
    const referrerNetwork = detectNetworkFromReferrer(document.referrer);
    if (referrerNetwork) return referrerNetwork;
  }

  // Default to direct if nothing detected
  return 'direct';
}

/**
 * Get a human-readable name for a network type
 *
 * @param network - The network type
 * @returns Human-readable network name
 */
export function getNetworkDisplayName(network: NetworkType): string {
  const names: Record<NetworkType, string> = {
    direct: 'Direct Link',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    twitter: 'Twitter/X',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    telegram: 'Telegram',
    email: 'Email',
    other: 'Other',
  };

  return names[network] || network;
}
