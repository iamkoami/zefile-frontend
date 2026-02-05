/**
 * Tier-based limits and validity period configuration
 * Centralized configuration for subscription tier restrictions
 */

export type SubscriptionTier = 'free' | 'starter' | 'pro';

/**
 * Validity option for dropdown rendering
 */
export type ValidityOption = {
  readonly value: string;
  readonly labelKey: string;
};

/**
 * Size limit option for dropdown rendering
 * Value is in MB as string for form handling
 */
export type SizeLimitOption = {
  readonly value: string; // MB as string
  readonly labelKey: string;
  readonly sizeBytes: number;
};

/**
 * Tier-based limits configuration
 * - validityDays: Available transfer validity periods per tier
 * - maxUploadSizeMB: Maximum upload size in megabytes per tier
 */
export const TIER_LIMITS: Record<SubscriptionTier, { validityDays: number[]; maxUploadSizeMB: number }> = {
  free: {
    validityDays: [1, 3, 7],
    maxUploadSizeMB: 2000, // 2GB
  },
  starter: {
    validityDays: [1, 3, 7, 14, 30],
    maxUploadSizeMB: 5000, // 5GB
  },
  pro: {
    validityDays: [1, 3, 7, 14, 30, 60, 90],
    maxUploadSizeMB: 50000, // 50GB
  },
};

/**
 * All validity period options with translation keys
 * Use with useTranslations('transferOptions') namespace
 * Example: t(option.labelKey) → "7 days"
 */
export const ALL_VALIDITY_OPTIONS: readonly ValidityOption[] = [
  { value: '1', labelKey: 'validity.day1' },
  { value: '3', labelKey: 'validity.days3' },
  { value: '7', labelKey: 'validity.days7' },
  { value: '14', labelKey: 'validity.days14' },
  { value: '30', labelKey: 'validity.days30' },
  { value: '60', labelKey: 'validity.days60' },
  { value: '90', labelKey: 'validity.days90' },
];

/**
 * All size limit options with translation keys
 * These represent self-imposed upload size limits users can select
 * Value is in MB, maps to tier max sizes
 */
export const ALL_SIZE_LIMIT_OPTIONS: readonly SizeLimitOption[] = [
  { value: '2000', labelKey: 'sizeLimit.2gb', sizeBytes: 2000 * 1024 * 1024 },
  { value: '5000', labelKey: 'sizeLimit.5gb', sizeBytes: 5000 * 1024 * 1024 },
  { value: '50000', labelKey: 'sizeLimit.50gb', sizeBytes: 50000 * 1024 * 1024 },
];

/**
 * Default validity period for NEW transfers per tier.
 * Note: These defaults apply only when creating new transfers.
 * Existing transfers retain their original validity period even if
 * the user's tier changes (transfers are immutable after creation).
 */
export const DEFAULT_VALIDITY_DAYS: Record<SubscriptionTier, number> = {
  free: 1,
  starter: 7,
  pro: 14,
};

/**
 * Translation keys for tier display names
 * Use with useTranslations('transferOptions') namespace
 */
export const TIER_TRANSLATION_KEYS: Record<SubscriptionTier, string> = {
  free: 'freeTier',
  starter: 'starterTier',
  pro: 'proTier',
};

/**
 * Check if a validity period is available for a given tier
 * @param days - Number of days for the validity period
 * @param tier - User's subscription tier
 * @returns true if the validity period is available for the tier
 */
export function isValidityAvailable(days: number, tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].validityDays.includes(days);
}

/**
 * Get the minimum tier required for a validity period
 * @param days - Number of days for the validity period
 * @returns The minimum tier needed, or null if invalid
 */
export function getRequiredTier(days: number): SubscriptionTier | null {
  if (TIER_LIMITS.free.validityDays.includes(days)) return 'free';
  if (TIER_LIMITS.starter.validityDays.includes(days)) return 'starter';
  if (TIER_LIMITS.pro.validityDays.includes(days)) return 'pro';
  return null;
}

/**
 * Get tier translation key for i18n display
 * Use with useTranslations('transferOptions') namespace
 * @param tier - Subscription tier
 * @returns Translation key (e.g., 'freeTier', 'starterTier', 'proTier')
 */
export function getTierTranslationKey(tier: SubscriptionTier): string {
  return TIER_TRANSLATION_KEYS[tier];
}

/**
 * Get max upload size for a tier in bytes
 * @param tier - Subscription tier
 * @returns Max upload size in bytes
 */
export function getMaxUploadSizeBytes(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier].maxUploadSizeMB * 1024 * 1024;
}

/**
 * Default size limit for NEW transfers per tier (in MB as string for form handling)
 * Users can select any size up to their tier's max
 */
export const DEFAULT_SIZE_LIMIT_MB: Record<SubscriptionTier, string> = {
  free: '2000',
  starter: '5000',
  pro: '50000',
};

/**
 * Check if a size limit option is available for a given tier
 * Users can only select sizes up to their tier's max
 * @param sizeMB - Size limit in megabytes
 * @param tier - User's subscription tier
 * @returns true if the size limit is available for the tier
 */
export function isSizeLimitAvailable(sizeMB: number, tier: SubscriptionTier): boolean {
  return sizeMB <= TIER_LIMITS[tier].maxUploadSizeMB;
}

/**
 * Get the minimum tier required for a size limit
 * @param sizeMB - Size limit in megabytes
 * @returns The minimum tier needed, or null if invalid
 */
export function getRequiredTierForSize(sizeMB: number): SubscriptionTier | null {
  if (sizeMB <= TIER_LIMITS.free.maxUploadSizeMB) return 'free';
  if (sizeMB <= TIER_LIMITS.starter.maxUploadSizeMB) return 'starter';
  if (sizeMB <= TIER_LIMITS.pro.maxUploadSizeMB) return 'pro';
  return null;
}
