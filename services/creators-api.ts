/**
 * Creators API Service
 * Handles public and authenticated creator profile API calls
 * Story 98-7: Profile Settings Panel
 */

import { apiClient, ApiResponse } from './api-client';

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
  primaryService?: string | null;
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
    // No AbortController — lets Next.js deduplicate identical fetch calls
    // across layout.tsx (generateMetadata) and page.tsx in the same render pass.
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

// --- Authenticated profile types ---

export type ProfileVisibility = 'public' | 'private';

export interface OwnProfileDto {
  id: string;
  userId: string;
  bioEn?: string | null;
  bioFr?: string | null;
  specialtyEn?: string | null;
  specialtyFr?: string | null;
  location?: string | null;
  languagesSpoken?: string[] | null;
  servicesOffered?: string[] | null;
  primaryService?: string | null;
  socialLinks?: SocialLink[] | null;
  visibility: ProfileVisibility;
  isIndexable: boolean;
  primaryLanguage: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface UpsertProfileDto {
  bioEn?: string;
  bioFr?: string;
  specialtyEn?: string;
  specialtyFr?: string;
  location?: string;
  languagesSpoken?: string[];
  servicesOffered?: string[];
  primaryService?: string | null;
  primaryLanguage?: string;
  isIndexable?: boolean;
}

export interface UpdateVisibilityDto {
  visibility: ProfileVisibility;
}

export interface UpdateSocialLinksDto {
  socialLinks: SocialLink[];
}

// --- Authenticated API client ---

class CreatorsApiClient {
  /** Get own creator profile (returns null if not created yet) */
  async getMyProfile(): Promise<ApiResponse<OwnProfileDto | null>> {
    return apiClient.get<OwnProfileDto | null>('/creators/me');
  }

  /** Create or update own profile */
  async updateMyProfile(dto: UpsertProfileDto): Promise<ApiResponse<OwnProfileDto>> {
    return apiClient.put<OwnProfileDto>('/creators/me', dto);
  }

  /** Update profile visibility (public/private) */
  async updateVisibility(dto: UpdateVisibilityDto): Promise<ApiResponse<OwnProfileDto>> {
    return apiClient.put<OwnProfileDto>('/creators/me/visibility', dto);
  }

  /** Replace all social links */
  async updateSocialLinks(dto: UpdateSocialLinksDto): Promise<ApiResponse<OwnProfileDto>> {
    return apiClient.put<OwnProfileDto>('/creators/me/social-links', dto);
  }
}

export const creatorsApi = new CreatorsApiClient();
