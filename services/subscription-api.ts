/**
 * Subscription API Service
 * Handles subscription management and payments
 *
 * SINGLE SOURCE OF TRUTH for:
 * - Subscription types (SubscriptionTier, BillingPeriod)
 * - Regional pricing data
 * - Tier limits and features
 * - LocalStorage keys
 */

import { ApiResponse, apiClient } from './api-client';

// ============================================
// CONSTANTS
// ============================================

/** Standardized localStorage key for detected country */
export const STORAGE_KEY_COUNTRY = 'zefile_user_country';

/** Supported country codes for regional pricing */
export const SUPPORTED_COUNTRIES = ['NG', 'GH', 'KE', 'CI'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number] | 'DEFAULT';

// ============================================
// TYPES (Single source of truth)
// ============================================

export type SubscriptionTier = 'free' | 'starter' | 'pro';
export type BillingPeriod = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  features: string[];
  limits: {
    storagePerTransfer: number; // in bytes
    transfersPerMonth: number; // -1 for unlimited
    expiryDays: number;
    maxVersions: number; // -1 for unlimited
    maxRecipients: number; // -1 for unlimited
    maxContacts: number; // -1 for unlimited
  };
  platformFeePercent: number;
  pricing: {
    monthly: number; // in minor units (cents)
    annual: number; // in minor units (cents)
    currency: string;
  };
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InitializeSubscriptionRequest {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  customerEmail: string;
  paymentMethod: 'card' | 'mobile_money';
  mobileMoneyProvider?: string;
  phoneNumber?: string;
  callbackUrl?: string;
  countryCode?: string;
}

export interface InitializeSubscriptionResponse {
  reference: string;
  authorizationUrl?: string; // For card payments
  accessCode?: string;
  status: string;
  amount: number;
  currency: string;
  displayAmount: string;
}

export interface SubscriptionStatusResponse {
  reference: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  subscription?: UserSubscription;
  canRetry: boolean;
  isTerminal: boolean;
  failureReason?: string;
}

// ============================================
// AUTO-RENEWAL TYPES (Epic 15)
// ============================================

export type PaymentMethodType = 'card' | 'mobile_money' | 'wallet';

export interface AutoRenewStatusDto {
  subscriptionId: string;
  autoRenewEnabled: boolean;
  paymentMethodType: PaymentMethodType;
  cardLast4?: string;
  cardType?: string;
  planName: string;
  planPriceMinorUnits: number;
  currency: string;
  currentPeriodEnd: string | null;
  willAutoRenew: boolean;
  autoRenewNotice?: string;
  isInGracePeriod: boolean;
  gracePeriodDaysRemaining?: number;
}

export interface RenewalAttemptDto {
  id: string;
  attemptedAt: string;
  status: 'success' | 'failed' | 'pending';
  paymentMethodType: PaymentMethodType;
  amountMinorUnits: number;
  currency: string;
  failureReason?: string;
}

export interface PaginatedRenewalHistory {
  items: RenewalAttemptDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// PRORATED UPGRADE TYPES (Epic 24)
// ============================================

export interface UpgradePreviewRequest {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  countryCode?: string;
}

export interface UpgradePreviewResponse {
  canUpgrade: boolean;
  reason?: string;
  currentTier: SubscriptionTier;
  currentBillingPeriod: BillingPeriod | null;
  targetTier: SubscriptionTier;
  targetBillingPeriod: BillingPeriod;
  currentPlanPrice: number;
  totalDaysInPeriod: number;
  daysUsed: number;
  daysRemaining: number;
  creditAmount: number;
  newPlanPrice: number;
  amountDue: number;
  excessCredit: number;
  currency: string;
  creditDisplayAmount: string;
  amountDueDisplayAmount: string;
  newPlanPriceDisplayAmount: string;
  currentPeriodEnd: string | null;
  newPeriodEnd: string;
}

export interface InitiateUpgradeRequest {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  countryCode?: string;
  callbackUrl?: string;
}

export interface InitiateUpgradeResponse {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
  amount: number;
  currency: string;
  status: string;
  displayAmount: string;
  creditApplied: number;
  creditDisplayAmount: string;
}

// ============================================
// TIER LIMITS & FEATURES (Single source of truth)
// ============================================

export interface TierLimits {
  storagePerTransferGB: number;
  transfersPerMonth: number; // -1 for unlimited
  expiryDays: number;
  maxVersions: number; // -1 for unlimited
  platformFeePercent: number;
  manualPreviewRegen: boolean;
  customBranding: boolean;
  customDomain: boolean;
  customWallpaper: boolean;
}

/**
 * Hardcoded tier limit defaults — used as fallback when dynamic config is unavailable.
 * Components should use the `useTierLimits()` hook or `getTierLimits()` instead of
 * importing this constant directly.
 *
 * @internal Only used by `getTierLimits()` and `updateTierLimitsCache()` in this file.
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    storagePerTransferGB: 5,
    transfersPerMonth: 10,
    expiryDays: 14,
    maxVersions: 1,
    platformFeePercent: 7,
    manualPreviewRegen: false,
    customBranding: false,
    customDomain: false,
    customWallpaper: false,
  },
  starter: {
    storagePerTransferGB: 20,
    transfersPerMonth: 50,
    expiryDays: 30,
    maxVersions: 3,
    platformFeePercent: 5,
    manualPreviewRegen: true,
    customBranding: true,
    customDomain: false,
    customWallpaper: true,
  },
  pro: {
    storagePerTransferGB: 50,
    transfersPerMonth: -1, // unlimited
    expiryDays: 90,
    maxVersions: 10,
    platformFeePercent: 3,
    manualPreviewRegen: true,
    customBranding: true,
    customDomain: true,
    customWallpaper: true,
  },
};

// ============================================
// REGIONAL PRICING (All amounts in MINOR units)
// ============================================

export interface RegionalPricing {
  currency: string;
  currencySymbol: string;
  currencyName: string;
  starter: { monthly: number; annual: number };
  pro: { monthly: number; annual: number };
}

/**
 * Regional pricing data (matches PRD)
 * All amounts are in MINOR units (kobo, pesewas, cents, centimes)
 */
export const REGIONAL_PRICING: Record<SupportedCountry, RegionalPricing> = {
  NG: {
    currency: 'NGN',
    currencySymbol: '₦',
    currencyName: 'Nigerian Naira',
    starter: { monthly: 750000, annual: 7500000 }, // in kobo
    pro: { monthly: 1500000, annual: 15000000 },
  },
  GH: {
    currency: 'GHS',
    currencySymbol: 'GH₵',
    currencyName: 'Ghanaian Cedi',
    starter: { monthly: 8000, annual: 80000 }, // in pesewas
    pro: { monthly: 16000, annual: 160000 },
  },
  KE: {
    currency: 'KES',
    currencySymbol: 'KSh',
    currencyName: 'Kenyan Shilling',
    starter: { monthly: 65000, annual: 650000 }, // in cents
    pro: { monthly: 130000, annual: 1300000 },
  },
  CI: {
    currency: 'XOF',
    currencySymbol: '',
    currencyName: 'West African CFA Franc',
    starter: { monthly: 420000, annual: 4200000 }, // in centimes
    pro: { monthly: 850000, annual: 8500000 },
  },
  DEFAULT: {
    currency: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    starter: { monthly: 500, annual: 5000 }, // in cents
    pro: { monthly: 1000, annual: 10000 },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format amount from minor units to display string
 */
export function formatSubscriptionPrice(
  amountMinorUnits: number,
  currency: string
): string {
  const majorUnits = amountMinorUnits / 100;

  const pricing = Object.values(REGIONAL_PRICING).find(p => p.currency === currency);
  const symbol = pricing?.currencySymbol || '';

  if (currency === 'XOF') {
    return `${majorUnits.toLocaleString()} ${currency}`;
  }

  return `${symbol}${majorUnits.toLocaleString()}`;
}

/**
 * Get pricing for a country code
 */
export function getPricingForCountry(countryCode: string): RegionalPricing {
  return REGIONAL_PRICING[countryCode as SupportedCountry] || REGIONAL_PRICING.DEFAULT;
}

// Module-level cache (populated by useTierLimits hook after API fetch)
let _dynamicTierLimits: Record<SubscriptionTier, TierLimits> | null = null;

/**
 * Called by useTierLimits hook after successful API fetch
 * Populates module-level cache so getTierLimits() returns dynamic values
 */
export function updateTierLimitsCache(tiers: Array<{
  tier: string;
  storagePerTransferGB: number;
  transfersPerMonth: number;
  expiryDays: number;
  maxVersions: number;
  platformFeePercent: number;
  features?: {
    manualPreviewRegen?: boolean;
    customBranding?: boolean;
    customDomain?: boolean;
    customWallpaper?: boolean;
  };
}>): void {
  const cache = {} as Record<SubscriptionTier, TierLimits>;
  for (const tier of tiers) {
    const key = tier.tier.toLowerCase() as SubscriptionTier;
    if (key in TIER_LIMITS) {
      cache[key] = {
        storagePerTransferGB: tier.storagePerTransferGB,
        transfersPerMonth: tier.transfersPerMonth,
        expiryDays: tier.expiryDays,
        maxVersions: tier.maxVersions,
        platformFeePercent: tier.platformFeePercent,
        manualPreviewRegen: tier.features?.manualPreviewRegen ?? TIER_LIMITS[key].manualPreviewRegen,
        customBranding: tier.features?.customBranding ?? TIER_LIMITS[key].customBranding,
        customDomain: tier.features?.customDomain ?? TIER_LIMITS[key].customDomain,
        customWallpaper: tier.features?.customWallpaper ?? TIER_LIMITS[key].customWallpaper,
      };
    }
  }
  _dynamicTierLimits = cache;
}

/**
 * Get tier limits for a subscription tier
 * Returns dynamic (admin-configured) values if available, otherwise hardcoded defaults
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  if (_dynamicTierLimits && _dynamicTierLimits[tier]) {
    return _dynamicTierLimits[tier];
  }
  return TIER_LIMITS[tier];
}

/**
 * Get price in minor units for a tier
 */
export function getTierPriceMinorUnits(
  tier: SubscriptionTier,
  billingPeriod: BillingPeriod,
  countryCode: string
): number {
  if (tier === 'free') return 0;
  const pricing = getPricingForCountry(countryCode);
  return billingPeriod === 'monthly'
    ? pricing[tier].monthly
    : pricing[tier].annual;
}

/**
 * Get stored country code from localStorage
 */
export function getStoredCountryCode(): string {
  if (typeof window === 'undefined') return 'DEFAULT';
  return localStorage.getItem(STORAGE_KEY_COUNTRY) || 'DEFAULT';
}

/**
 * Store country code to localStorage
 */
export function setStoredCountryCode(countryCode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_COUNTRY, countryCode);
}

/**
 * Calculate first charge date (today for immediate billing)
 */
export function getFirstChargeDate(): Date {
  return new Date();
}

/**
 * Calculate next billing date based on billing period
 */
export function getNextBillingDate(billingPeriod: BillingPeriod): Date {
  const date = new Date();
  if (billingPeriod === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
}

/**
 * Subscription API client
 */
export const subscriptionApi = {
  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return apiClient.get<SubscriptionPlan[]>('/subscriptions/plans');
  },

  /**
   * Get current user's subscription
   */
  async getCurrentSubscription(): Promise<ApiResponse<UserSubscription | null>> {
    return apiClient.get<UserSubscription | null>('/subscriptions/current');
  },

  /**
   * Initialize subscription payment
   */
  async initializeSubscription(
    data: InitializeSubscriptionRequest
  ): Promise<ApiResponse<InitializeSubscriptionResponse>> {
    return apiClient.post<InitializeSubscriptionResponse>(
      '/subscriptions/initialize',
      data
    );
  },

  /**
   * Check subscription payment status
   */
  async getSubscriptionPaymentStatus(
    reference: string
  ): Promise<ApiResponse<SubscriptionStatusResponse>> {
    return apiClient.get<SubscriptionStatusResponse>(
      `/subscriptions/status/${reference}`
    );
  },

  /**
   * Cancel subscription (at period end)
   */
  async cancelSubscription(): Promise<ApiResponse<UserSubscription>> {
    return apiClient.post<UserSubscription>('/subscriptions/cancel');
  },

  /**
   * Resume cancelled subscription
   */
  async resumeSubscription(): Promise<ApiResponse<UserSubscription>> {
    return apiClient.post<UserSubscription>('/subscriptions/resume');
  },

  /**
   * Change subscription tier
   */
  async changeTier(
    tier: SubscriptionTier,
    billingPeriod: BillingPeriod
  ): Promise<ApiResponse<{ requiresPayment: boolean; subscription?: UserSubscription }>> {
    return apiClient.post('/subscriptions/change-tier', { tier, billingPeriod });
  },

  /**
   * Get current user's usage statistics
   */
  async getUsage(): Promise<ApiResponse<{
    storage: { used: number; limit: number; percentage: number };
    transfers: { thisMonth: number; limit: number; percentage: number };
    tier: string;
    billingCycle: { start: string; end: string } | null;
  }>> {
    return apiClient.get('/subscriptions/usage');
  },

  /**
   * Get billing information
   */
  async getBilling(): Promise<ApiResponse<{
    subscription: UserSubscription | null;
    paymentMethod: {
      type: 'card' | 'mobile_money' | null;
      last4: string | null;
      brand: string | null;
    } | null;
    nextBillingDate: string | null;
    amount: number | null;
    currency: string | null;
  }>> {
    return apiClient.get('/subscriptions/billing');
  },

  /**
   * Schedule a subscription downgrade
   */
  async scheduleDowngrade(targetTier: SubscriptionTier): Promise<ApiResponse<{
    scheduledFor: string;
    newTier: SubscriptionTier;
    currentTierEnds: string;
    featureLosses: string[];
  }>> {
    return apiClient.post('/subscriptions/downgrade', { targetTier });
  },

  /**
   * Cancel a scheduled downgrade
   */
  async cancelScheduledDowngrade(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.post('/subscriptions/downgrade/cancel');
  },

  /**
   * Get scheduled downgrade info
   */
  async getScheduledDowngrade(): Promise<ApiResponse<{
    targetTier: SubscriptionTier;
    effectiveDate: string;
  } | null>> {
    return apiClient.get('/subscriptions/downgrade');
  },

  /**
   * Get current user's trial status
   */
  async getTrialStatus(): Promise<ApiResponse<{
    hasUsedTrial: boolean;
    trialStartDate?: string;
    trialEndDate?: string;
    trialActive: boolean;
    daysRemaining?: number;
  }>> {
    return apiClient.get('/subscriptions/trial');
  },

  /**
   * Check if user is eligible for a trial
   */
  async checkTrialEligibility(): Promise<ApiResponse<{ eligible: boolean }>> {
    return apiClient.get('/subscriptions/trial/eligibility');
  },

  /**
   * Start a free trial
   */
  async startTrial(): Promise<ApiResponse<{
    hasUsedTrial: boolean;
    trialStartDate?: string;
    trialEndDate?: string;
    trialActive: boolean;
    daysRemaining?: number;
  }>> {
    return apiClient.post('/subscriptions/trial/start');
  },

  // ============================================
  // PRORATED UPGRADE (Epic 24)
  // ============================================

  /**
   * Get upgrade preview with proration details
   */
  async getUpgradePreview(
    params: UpgradePreviewRequest
  ): Promise<ApiResponse<UpgradePreviewResponse>> {
    const query = new URLSearchParams({
      tier: params.tier,
      billingPeriod: params.billingPeriod,
    });
    if (params.countryCode) {
      query.set('countryCode', params.countryCode);
    }
    return apiClient.get<UpgradePreviewResponse>(`/subscriptions/upgrade-preview?${query.toString()}`);
  },

  /**
   * Initiate a prorated subscription upgrade
   */
  async initiateUpgrade(
    data: InitiateUpgradeRequest
  ): Promise<ApiResponse<InitiateUpgradeResponse>> {
    return apiClient.post<InitiateUpgradeResponse>('/subscriptions/upgrade', data);
  },

  // ============================================
  // AUTO-RENEWAL MANAGEMENT (Epic 15)
  // ============================================

  /**
   * Get auto-renewal status for current subscription
   */
  async getAutoRenewStatus(): Promise<ApiResponse<AutoRenewStatusDto>> {
    return apiClient.get<AutoRenewStatusDto>('/subscriptions/auto-renew');
  },

  /**
   * Update auto-renewal setting
   */
  async updateAutoRenew(dto: { enabled: boolean }): Promise<ApiResponse<AutoRenewStatusDto>> {
    return apiClient.patch<AutoRenewStatusDto>('/subscriptions/auto-renew', dto);
  },

  /**
   * Get renewal attempt history
   */
  async getRenewalHistory(query: { page: number; limit: number }): Promise<ApiResponse<PaginatedRenewalHistory>> {
    const params = new URLSearchParams({
      page: query.page.toString(),
      limit: query.limit.toString(),
    });
    return apiClient.get<PaginatedRenewalHistory>(`/subscriptions/renewal-history?${params.toString()}`);
  },
};

export default subscriptionApi;
