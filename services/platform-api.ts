/**
 * Platform Configuration API Service
 * Handles public platform configuration API calls for pricing pages, plan comparisons, etc.
 */

import { apiClient, ApiResponse } from './api-client';

// Types for subscription tiers
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO';

/**
 * Platform fee information per tier
 */
export interface PlatformFee {
  tier: SubscriptionTier;
  feePercent: number;
}

/**
 * Transfer limits per tier
 */
export interface TransferLimits {
  tier: SubscriptionTier;
  storagePerTransferGB: number;
  transfersPerMonth: number;
  expiryDays: number;
  maxVersions: number;
}

/**
 * Tier pricing for a region
 */
export interface TierPricing {
  tier: SubscriptionTier;
  monthly: number;
  annual: number;
}

/**
 * Regional pricing response
 */
export interface RegionalPricing {
  region: string;
  currency: string;
  pricing: TierPricing[];
}

/**
 * Complete platform configuration overview
 */
export interface PlatformConfigOverview {
  fees: PlatformFee[];
  limits: TransferLimits[];
  features: {
    tier: SubscriptionTier;
    manualPreviewRegen: boolean;
    maxVersions: number;
  }[];
}

/**
 * Public tier features for pricing page
 */
export interface PublicTierFeatures {
  tier: SubscriptionTier;
  displayName: string;
  storagePerTransferGB: number;
  transfersPerMonth: number;
  expiryDays: number;
  maxVersions: number;
  platformFeePercent: number;
  features: {
    manualPreviewRegen: boolean;
    customBranding: boolean;
    prioritySupport: boolean;
    advancedAnalytics: boolean;
  };
}

/**
 * Feature matrix for comparing tiers
 */
export interface FeatureMatrix {
  features: {
    featureKey: string;
    featureName: string;
    description: string;
    tiers: Record<SubscriptionTier, boolean | number | string>;
  }[];
}

// Legacy interface for backwards compatibility
export interface PlatformConfig {
  maxUploadSize: number; // in bytes
  serviceChargePercentage: number;
}

export class PlatformApi {
  /**
   * Get public platform configuration (legacy endpoint)
   */
  async getPublicConfig(): Promise<ApiResponse<PlatformConfig>> {
    return apiClient.get<PlatformConfig>('/platform-settings/public/config');
  }

  /**
   * Get platform fees for all tiers
   */
  async getAllFees(): Promise<ApiResponse<{ fees: PlatformFee[] }>> {
    return apiClient.get<{ fees: PlatformFee[] }>('/public/config/fees');
  }

  /**
   * Get platform fee for a specific tier
   */
  async getTierFee(tier: SubscriptionTier): Promise<ApiResponse<PlatformFee>> {
    return apiClient.get<PlatformFee>(`/public/config/fees/${tier}`);
  }

  /**
   * Get transfer limits for all tiers
   */
  async getAllLimits(): Promise<ApiResponse<{ limits: TransferLimits[] }>> {
    return apiClient.get<{ limits: TransferLimits[] }>('/public/config/limits');
  }

  /**
   * Get transfer limits for a specific tier
   */
  async getTierLimits(tier: SubscriptionTier): Promise<ApiResponse<TransferLimits>> {
    return apiClient.get<TransferLimits>(`/public/config/limits/${tier}`);
  }

  /**
   * Get regional pricing for a specific region
   */
  async getRegionalPricing(region: string): Promise<ApiResponse<RegionalPricing>> {
    return apiClient.get<RegionalPricing>(`/public/config/pricing/${region}`);
  }

  /**
   * Get pricing for all regions
   */
  async getAllRegionalPricing(regions?: string[]): Promise<ApiResponse<{ regions: RegionalPricing[] }>> {
    const params = regions ? `?regions=${regions.join(',')}` : '';
    return apiClient.get<{ regions: RegionalPricing[] }>(`/public/config/pricing${params}`);
  }

  /**
   * Get complete configuration overview (fees, limits, features)
   */
  async getConfigOverview(): Promise<ApiResponse<PlatformConfigOverview>> {
    return apiClient.get<PlatformConfigOverview>('/public/config/overview');
  }

  /**
   * Get public tier features for pricing page
   */
  async getPublicFeatures(): Promise<ApiResponse<{ tiers: PublicTierFeatures[] }>> {
    return apiClient.get<{ tiers: PublicTierFeatures[] }>('/public/features');
  }

  /**
   * Get feature matrix for tier comparison
   */
  async getFeatureMatrix(): Promise<ApiResponse<FeatureMatrix>> {
    return apiClient.get<FeatureMatrix>('/public/features/matrix');
  }
}

// Export singleton instance
export const platformApi = new PlatformApi();
