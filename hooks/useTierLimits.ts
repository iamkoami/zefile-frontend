'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { platformApi, PublicTierFeatures, AllRegionalPricing, TierRegionalPricing } from '@/services/platform-api';
import { updateTierLimitsCache } from '@/services/subscription-api';

export type SubscriptionTier = 'free' | 'starter' | 'pro';

/**
 * Validity option for dropdown rendering
 */
export interface ValidityOption {
  value: string;
  labelKey: string;
  days: number;
}

/**
 * Size limit option for dropdown rendering
 * Value is in GB as string for consistent handling
 */
export interface SizeLimitOption {
  value: string;      // GB as string (e.g., "2", "10", "50")
  labelKey: string;
  sizeGB: number;
  sizeBytes: number;
}

/**
 * Tier limits from API
 */
export interface TierLimits {
  tier: SubscriptionTier;
  storagePerTransferGB: number;
  transfersPerMonth: number;
  expiryDays: number;
  maxVersions: number;
  platformFeePercent: number;
  manualPreviewRegen: boolean;
}

/**
 * Converts expiryDays to translation key
 */
function getValidityLabelKey(days: number): string {
  if (days === 1) return 'validity.day1';
  return `validity.days${days}`;
}

/**
 * Converts storage GB to translation key
 */
function getSizeLabelKey(gb: number): string {
  return `sizeLimit.${gb}gb`;
}

/**
 * Map frontend country codes to backend region codes
 */
const COUNTRY_TO_REGION: Record<string, string> = {
  CI: 'XOF',
  DEFAULT: 'US',
};

function toRegionCode(countryCode: string): string {
  return COUNTRY_TO_REGION[countryCode] || countryCode;
}

/**
 * Hook return type
 */
export interface UseTierLimitsReturn {
  // Loading state
  isLoading: boolean;
  error: string | null;

  // Raw tier data from API
  tierLimits: Record<SubscriptionTier, TierLimits>;

  // Regional pricing from API (keyed by backend region: NG, GH, KE, XOF, US)
  regionalPricing: AllRegionalPricing | null;

  // Computed options for dropdowns
  allValidityOptions: ValidityOption[];
  allSizeLimitOptions: SizeLimitOption[];

  // Helpers
  isValidityAvailable: (days: number, tier: SubscriptionTier) => boolean;
  isSizeLimitAvailable: (sizeGB: number, tier: SubscriptionTier) => boolean;
  getRequiredTierForValidity: (days: number) => SubscriptionTier | null;
  getRequiredTierForSize: (sizeGB: number) => SubscriptionTier | null;
  getDefaultValidity: (tier: SubscriptionTier) => string;
  getDefaultSizeLimit: (tier: SubscriptionTier) => string;
  getMaxUploadSizeBytes: (tier: SubscriptionTier) => number;
  getTierPrice: (tier: SubscriptionTier, countryCode: string, period: 'monthly' | 'annual') => number;
  getTierCurrency: (countryCode: string) => string;

  // Refresh function
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch tier limits from the platform API
 * Returns dynamic validity/size options based on admin configuration
 */
export function useTierLimits(): UseTierLimitsReturn {
  const [tierData, setTierData] = useState<PublicTierFeatures[]>([]);
  const [pricingData, setPricingData] = useState<AllRegionalPricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTierLimits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await platformApi.getPublicFeatures();

      if (response.error) {
        setError(response.error.message || 'Failed to load tier limits');
        return;
      }

      if (response.data?.tiers) {
        setTierData(response.data.tiers);
        updateTierLimitsCache(response.data.tiers);
      }
      if (response.data?.pricing) {
        setPricingData(response.data.pricing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tier limits');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTierLimits();
  }, [fetchTierLimits]);

  // Convert API data to tier limits map
  const tierLimits = useMemo<Record<SubscriptionTier, TierLimits>>(() => {
    const defaults: Record<SubscriptionTier, TierLimits> = {
      free: {
        tier: 'free',
        storagePerTransferGB: 2,
        transfersPerMonth: 5,
        expiryDays: 7,
        maxVersions: 1,
        platformFeePercent: 15,
        manualPreviewRegen: false,
      },
      starter: {
        tier: 'starter',
        storagePerTransferGB: 10,
        transfersPerMonth: 50,
        expiryDays: 30,
        maxVersions: 3,
        platformFeePercent: 10,
        manualPreviewRegen: true,
      },
      pro: {
        tier: 'pro',
        storagePerTransferGB: 50,
        transfersPerMonth: -1,
        expiryDays: 90,
        maxVersions: 10,
        platformFeePercent: 5,
        manualPreviewRegen: true,
      },
    };

    if (tierData.length === 0) return defaults;

    const result = { ...defaults };

    for (const data of tierData) {
      const tierKey = data.tier.toLowerCase() as SubscriptionTier;
      if (tierKey in result) {
        result[tierKey] = {
          tier: tierKey,
          storagePerTransferGB: data.storagePerTransferGB,
          transfersPerMonth: data.transfersPerMonth,
          expiryDays: data.expiryDays,
          maxVersions: data.maxVersions,
          platformFeePercent: data.platformFeePercent,
          manualPreviewRegen: data.features?.manualPreviewRegen ?? defaults[tierKey].manualPreviewRegen,
        };
      }
    }

    return result;
  }, [tierData]);

  // Build unique validity options from all tiers (sorted ascending)
  const allValidityOptions = useMemo<ValidityOption[]>(() => {
    const uniqueDays = new Set<number>();

    Object.values(tierLimits).forEach((tier) => {
      // Add the tier's expiry days
      uniqueDays.add(tier.expiryDays);
    });

    // Also add common validity options that might be configured
    // The API expiryDays is the MAX for each tier, so we need intermediate options
    const commonDays = [1, 3, 7, 14, 30, 60, 90];
    const maxDays = Math.max(...Object.values(tierLimits).map(t => t.expiryDays));

    commonDays.forEach((day) => {
      if (day <= maxDays) {
        uniqueDays.add(day);
      }
    });

    return Array.from(uniqueDays)
      .sort((a, b) => a - b)
      .map((days) => ({
        value: String(days),
        labelKey: getValidityLabelKey(days),
        days,
      }));
  }, [tierLimits]);

  // Build unique size limit options from all tiers (sorted ascending)
  const allSizeLimitOptions = useMemo<SizeLimitOption[]>(() => {
    const uniqueSizes = new Set<number>();

    Object.values(tierLimits).forEach((tier) => {
      uniqueSizes.add(tier.storagePerTransferGB);
    });

    // Also add common size options to give users more choices
    // The API storagePerTransferGB is the MAX for each tier, so we need intermediate options
    const commonSizesGB = [2, 5, 10, 20, 30, 50];
    const maxSizeGB = Math.max(...Object.values(tierLimits).map(t => t.storagePerTransferGB));

    commonSizesGB.forEach((gb) => {
      if (gb <= maxSizeGB) {
        uniqueSizes.add(gb);
      }
    });

    return Array.from(uniqueSizes)
      .sort((a, b) => a - b)
      .map((gb) => ({
        value: String(gb), // Use GB directly (e.g., "2", "5", "10", "20", "30", "50")
        labelKey: getSizeLabelKey(gb),
        sizeGB: gb,
        sizeBytes: gb * 1024 * 1024 * 1024,
      }));
  }, [tierLimits]);

  // Check if validity is available for a tier (days <= tier's expiryDays)
  const isValidityAvailable = useCallback(
    (days: number, tier: SubscriptionTier): boolean => {
      return days <= tierLimits[tier].expiryDays;
    },
    [tierLimits]
  );

  // Check if size limit is available for a tier
  const isSizeLimitAvailable = useCallback(
    (sizeGB: number, tier: SubscriptionTier): boolean => {
      return sizeGB <= tierLimits[tier].storagePerTransferGB;
    },
    [tierLimits]
  );

  // Get required tier for a validity period
  const getRequiredTierForValidity = useCallback(
    (days: number): SubscriptionTier | null => {
      if (days <= tierLimits.free.expiryDays) return 'free';
      if (days <= tierLimits.starter.expiryDays) return 'starter';
      if (days <= tierLimits.pro.expiryDays) return 'pro';
      return null;
    },
    [tierLimits]
  );

  // Get required tier for a size limit
  const getRequiredTierForSize = useCallback(
    (sizeGB: number): SubscriptionTier | null => {
      if (sizeGB <= tierLimits.free.storagePerTransferGB) return 'free';
      if (sizeGB <= tierLimits.starter.storagePerTransferGB) return 'starter';
      if (sizeGB <= tierLimits.pro.storagePerTransferGB) return 'pro';
      return null;
    },
    [tierLimits]
  );

  // Get default validity for a tier (smallest available option)
  const getDefaultValidity = useCallback(
    (tier: SubscriptionTier): string => {
      // Preferred defaults per tier, validated against tier's max
      const preferredDefaults: Record<SubscriptionTier, number> = {
        free: 1,
        starter: 7,
        pro: 14,
      };
      const preferred = preferredDefaults[tier];
      const maxDays = tierLimits[tier].expiryDays;

      // Use preferred if within limit, otherwise use 1 day (always available)
      return String(preferred <= maxDays ? preferred : 1);
    },
    [tierLimits]
  );

  // Get default size limit for a tier (in GB as string)
  const getDefaultSizeLimit = useCallback(
    (tier: SubscriptionTier): string => {
      return String(tierLimits[tier].storagePerTransferGB);
    },
    [tierLimits]
  );

  // Get max upload size in bytes for a tier
  const getMaxUploadSizeBytes = useCallback(
    (tier: SubscriptionTier): number => {
      return tierLimits[tier].storagePerTransferGB * 1024 * 1024 * 1024;
    },
    [tierLimits]
  );

  // Get tier price in minor units for a country and billing period
  const getTierPrice = useCallback(
    (tier: SubscriptionTier, countryCode: string, period: 'monthly' | 'annual'): number => {
      if (!pricingData) return 0;
      const region = toRegionCode(countryCode);
      const tierKey = tier.toUpperCase();
      return pricingData[region]?.[tierKey]?.[period] ?? 0;
    },
    [pricingData]
  );

  // Get currency for a country code
  const getTierCurrency = useCallback(
    (countryCode: string): string => {
      if (!pricingData) return 'XOF';
      const region = toRegionCode(countryCode);
      // Get currency from any tier's pricing (they all share the same currency per region)
      const regionData = pricingData[region];
      if (!regionData) return 'XOF';
      const firstTier = Object.values(regionData)[0];
      return (firstTier as TierRegionalPricing)?.currency ?? 'XOF';
    },
    [pricingData]
  );

  return {
    isLoading,
    error,
    tierLimits,
    regionalPricing: pricingData,
    allValidityOptions,
    allSizeLimitOptions,
    isValidityAvailable,
    isSizeLimitAvailable,
    getRequiredTierForValidity,
    getRequiredTierForSize,
    getDefaultValidity,
    getDefaultSizeLimit,
    getMaxUploadSizeBytes,
    getTierPrice,
    getTierCurrency,
    refetch: fetchTierLimits,
  };
}

/**
 * Translation keys for tier display names
 */
export const TIER_TRANSLATION_KEYS: Record<SubscriptionTier, string> = {
  free: 'freeTier',
  starter: 'starterTier',
  pro: 'proTier',
};

/**
 * Get tier translation key for i18n display
 */
export function getTierTranslationKey(tier: SubscriptionTier): string {
  return TIER_TRANSLATION_KEYS[tier];
}
