/**
 * Public Creators API (server-side / edge-compatible)
 * No dependency on api-client.ts or Sentry — safe for edge runtime pages.
 */

export type SocialPlatform =
  | 'behance'
  | 'dribbble'
  | 'instagram'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'tiktok'
  | 'soundcloud'
  | 'spotify'
  | 'facebook'
  | 'pinterest'
  | 'website';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export interface PublicProfileDto {
  handle: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  specialtyEn?: string | null;
  specialtyFr?: string | null;
  bioEn?: string | null;
  bioFr?: string | null;
  location?: string | null;
  languagesSpoken?: string[] | null;
  servicesOffered?: string[] | null;
  socialLinks?: SocialLink[] | null;
  kycVerified: boolean;
  isIndexable: boolean;
  primaryLanguage: string;
  branding?: {
    primaryColor?: string | null;
    accentColor?: string | null;
    logoUrl?: string | null;
  } | null;
  stats: {
    completedDeliveries: number;
    memberSince: string;
  };
  tier: string;
  hasFileRequests: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetch public profile by handle (server-side compatible, no cookies needed).
 * Uses native fetch for SSR compatibility in server components.
 */
export async function fetchPublicProfile(
  handle: string,
): Promise<PublicProfileDto | null> {
  try {
    const response = await fetch(`${API_URL}/creators/${encodeURIComponent(handle)}`, {
      next: { revalidate: 300 },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Network error — fall through
  }
  return null;
}
