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
// TIER LIMITS & FEATURES (Single source of truth)
// ============================================

export interface TierLimits {
  storagePerTransferGB: number;
  transfersPerMonth: number; // -1 for unlimited
  expiryDays: number;
  maxVersions: number; // -1 for unlimited
  platformFeePercent: number;
  manualPreviewRegen: boolean;
}

/**
 * Tier limits - MUST match backend subscriptions.service.ts TIER_LIMITS
 *
 * Note: Auto preview regeneration runs daily for ALL users via backend cron job.
 * Only manualPreviewRegen is tier-gated (Starter and Pro tiers).
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    storagePerTransferGB: 2,
    transfersPerMonth: 5,
    expiryDays: 7,
    maxVersions: 1,
    platformFeePercent: 15,
    manualPreviewRegen: false,
  },
  starter: {
    storagePerTransferGB: 10,
    transfersPerMonth: 50,
    expiryDays: 30,
    maxVersions: 3,
    platformFeePercent: 10,
    manualPreviewRegen: true,
  },
  pro: {
    storagePerTransferGB: 50,
    transfersPerMonth: -1, // unlimited
    expiryDays: 90,
    maxVersions: 10,
    platformFeePercent: 5,
    manualPreviewRegen: true,
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

/**
 * Get tier limits for a subscription tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
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
};

export default subscriptionApi;
