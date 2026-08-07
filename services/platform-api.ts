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
 * Story 144.3 — the payment methods that can carry their own processing rate.
 *
 * Mirrors the backend's `ProcessingFeeMethod` (`src/modules/platform-config/processing-fee-method.ts`).
 * Deliberately narrower than the checkout's own method list: `bank` and `qr` are valid Paystack
 * channels but no adapter offers them, and the quote endpoint 400s on anything outside this set
 * rather than silently answering with the card rate.
 */
export type ProcessingFeeMethod = "mobile_money" | "card" | "bank_transfer" | "ussd";

/**
 * Story 135.1 — the buyer's pass-through processing surcharge for one country + method.
 * All amounts are minor units. `price + processingFee === total` always holds, so a caller
 * renders the breakdown without doing arithmetic of its own.
 */
export interface ProcessingFeeQuote {
  countryCode: string;
  /**
   * Story 144.3 — bank transfer and USSD now carry their own rate namespace and are quoted as
   * themselves. Until then the panel collapsed them to "card" to mirror a backend that could not
   * express them.
   */
  paymentMethod: ProcessingFeeMethod;
  feePercent: number;
  currency: string;
  priceMinorUnits: number;
  processingFeeMinorUnits: number;
  totalMinorUnits: number;
  /**
   * Non-null when the buyer's gateway cannot charge `currency` natively and the payment path
   * converts before charging — Togo, Benin and Senegal route to Startbutton, which does not
   * support XOF. When set, `totalMinorUnits` is NOT what the buyer is charged; this is.
   */
  settlement: {
    currency: string;
    amountMinorUnits: number;
    /**
     * Story 144.1 — server-formatted in the SETTLEMENT currency, by the same function the payment
     * initialize response uses. Render this rather than dividing by 100 yourself. Optional so an
     * older API is tolerated.
     */
    displayAmount?: string;
    fxRate: number;
  } | null;
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
    customDomain: boolean;
    customWallpaper: boolean;
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

/**
 * Featured creator (public)
 */
export interface FeaturedCreatorSocialLinks {
  instagram?: string;
  behance?: string;
  twitter?: string;
  portfolio?: string;
}

export interface FeaturedCreator {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
  socialLinks?: FeaturedCreatorSocialLinks;
  displayOrder: number;
}

/**
 * Pricing for a single tier in a region (from DB)
 */
export interface TierRegionalPricing {
  monthly: number;
  annual: number;
  currency: string;
}

/**
 * All regional pricing from the backend DB
 * Keyed by region code (NG, GH, KE, XOF, US), then by tier
 */
export type AllRegionalPricing = Record<
  string,
  Record<string, TierRegionalPricing>
>;

/**
 * Platform status response (maintenance/waitlist flags)
 */
export interface PlatformStatus {
  maintenance: boolean;
  maintenanceMessage?: string;
  maintenanceEstimate?: string;
  maintenanceAllowDownloads?: boolean;
  waitlist: boolean;
  darkModeEnabled: boolean;
}

/**
 * Waitlist signup response
 */
export interface WaitlistSignupResponse {
  message: string;
  alreadySignedUp: boolean;
}

/**
 * Waitlist count response
 */
export interface WaitlistCountResponse {
  count: number;
}

// Legacy interface for backwards compatibility
export interface PlatformConfig {
  maxUploadSize: number; // in bytes
  serviceChargePercentage: number;
  paymentsEnabled: boolean;
  sessionReplayEnabled: boolean;
}

/**
 * User-specific platform configuration
 * Returns tier-specific service charge based on user's subscription
 */
export interface UserPlatformConfig {
  serviceChargePercentage: number;
  tier: SubscriptionTier | 'free';
  maxUploadSize: number;
  isFirstPaidTransferUsed?: boolean;
  minimumTransferPriceNGN: number;
  canCreateFreeTransfers: boolean;
  /**
   * Story 134.4 — may this creator publish a transfer as stream-only?
   *
   * Resolved server-side from the `streamDelivery` tier feature, NOT from a tier comparison, so
   * an admin granting the feature to another tier makes the toggle appear with no deploy.
   * Presentation only: the backend gate in StreamEligibilityService is the guarantee (P11).
   */
  canUseStreamDelivery?: boolean;
}

export class PlatformApi {
  /**
   * Get public platform configuration (legacy endpoint)
   * Returns default FREE tier service charge (7%)
   */
  async getPublicConfig(): Promise<ApiResponse<PlatformConfig>> {
    return apiClient.get<PlatformConfig>('/platform-settings/public/config');
  }

  /**
   * Get user-specific platform configuration
   * Returns tier-specific service charge based on user's subscription:
   * - FREE: 7%
   * - STARTER: 5%
   * - PRO: 3%
   *
   * Works for both authenticated and unauthenticated users.
   * Unauthenticated users get FREE tier rate.
   */
  async getUserConfig(): Promise<ApiResponse<UserPlatformConfig>> {
    return apiClient.get<UserPlatformConfig>('/platform-settings/user-config');
  }

  /**
   * Get platform fees for all tiers
   */
  async getAllFees(): Promise<ApiResponse<{ fees: PlatformFee[] }>> {
    return apiClient.get<{ fees: PlatformFee[] }>('/public/config/fees');
  }

  /**
   * Story 135.1 (D3) — quote the processing surcharge a buyer will pay, without starting a payment.
   *
   * The sale page cannot show an exact surcharge: the rate depends on country AND payment method
   * (2.0%-4.6%), and neither is known until checkout. This is what lets SaleCheckoutPanel show the
   * real total before the gateway is called — which it never did before, so a card buyer was shown
   * no surcharge by ZeFile at any point.
   *
   * The backend computes through the same two calls the payment path uses, so the total returned
   * here is the amount that will actually be charged. Never re-derive it on the client.
   */
  async getProcessingFeeQuote(params: {
    amountMinorUnits: number;
    paymentMethod: ProcessingFeeMethod;
    countryCode?: string;
    currency?: string;
  }): Promise<ApiResponse<ProcessingFeeQuote>> {
    const query = new URLSearchParams({
      amountMinorUnits: String(params.amountMinorUnits),
      paymentMethod: params.paymentMethod,
    });
    if (params.countryCode) query.set("countryCode", params.countryCode);
    if (params.currency) query.set("currency", params.currency);
    return apiClient.get<ProcessingFeeQuote>(`/public/config/processing-fee?${query.toString()}`);
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
   * In-flight request deduplication for getPublicFeatures.
   * Prevents duplicate API calls when multiple components mount useTierLimits simultaneously.
   */
  private _publicFeaturesPromise: Promise<
    ApiResponse<{ tiers: PublicTierFeatures[]; pricing?: AllRegionalPricing }>
  > | null = null;

  /**
   * Get public tier features and regional pricing for pricing page
   * Deduplicates concurrent calls — multiple callers share the same in-flight request.
   */
  async getPublicFeatures(): Promise<
    ApiResponse<{ tiers: PublicTierFeatures[]; pricing?: AllRegionalPricing }>
  > {
    if (this._publicFeaturesPromise) {
      return this._publicFeaturesPromise;
    }

    this._publicFeaturesPromise = apiClient
      .get<{ tiers: PublicTierFeatures[]; pricing?: AllRegionalPricing }>('/public/features')
      .finally(() => {
        this._publicFeaturesPromise = null;
      });

    return this._publicFeaturesPromise;
  }

  /**
   * Get feature matrix for tier comparison
   */
  async getFeatureMatrix(): Promise<ApiResponse<FeatureMatrix>> {
    return apiClient.get<FeatureMatrix>('/public/features/matrix');
  }

  /**
   * Get enabled featured creators (public, cached)
   */
  async getFeaturedCreators(): Promise<ApiResponse<FeaturedCreator[]>> {
    return apiClient.get<FeaturedCreator[]>('/featured-creators');
  }

  /**
   * Get platform status flags (maintenance/waitlist).
   * No auth required. Used by frontend to detect maintenance/waitlist mode.
   */
  async getStatus(): Promise<ApiResponse<PlatformStatus>> {
    return apiClient.get<PlatformStatus>('/platform-settings/status');
  }

  /**
   * Sign up for the waitlist
   */
  async waitlistSignup(email: string, locale?: string): Promise<ApiResponse<WaitlistSignupResponse>> {
    return apiClient.post<WaitlistSignupResponse>('/waitlist/signup', { email, locale });
  }

  /**
   * Get total waitlist signup count (social proof)
   */
  async getWaitlistCount(): Promise<ApiResponse<WaitlistCountResponse>> {
    return apiClient.get<WaitlistCountResponse>('/waitlist/count');
  }
}

// Export singleton instance
export const platformApi = new PlatformApi();
