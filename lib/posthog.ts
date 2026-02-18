import posthog from 'posthog-js';

// Track actual initialization state
let _posthogInitialized = false;

/**
 * Analytics Event Types (must match backend)
 */
export enum AnalyticsEventType {
  // Auth events
  SIGNUP_STARTED = 'signup_started',
  SIGNUP_COMPLETED = 'signup_completed',
  LOGIN_SUCCESS = 'login_success',
  LOGOUT = 'logout',

  // Transfer events
  TRANSFER_STARTED = 'transfer_started',
  FILES_SELECTED = 'files_selected',
  DETAILS_FILLED = 'details_filled',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_VIEWED = 'transfer_viewed',

  // Download events
  DOWNLOAD_STARTED = 'download_started',
  DOWNLOAD_COMPLETED = 'download_completed',

  // Payment events
  PRICING_VIEWED = 'pricing_viewed',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_METHOD_SELECTED = 'payment_method_selected',
  PAYMENT_SUBMITTED = 'payment_submitted',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',

  // Subscription events
  PLAN_SELECTED = 'plan_selected',
  SUBSCRIPTION_STARTED = 'subscription_started',

  // Survey events
  NPS_SURVEY_SHOWN = 'nps_survey_shown',
  NPS_SURVEY_SUBMITTED = 'nps_survey_submitted',
  NPS_SURVEY_DEFERRED = 'nps_survey_deferred',
  NPS_SURVEY_DISMISSED = 'nps_survey_dismissed',
  CHURN_SURVEY_SHOWN = 'churn_survey_shown',
  CHURN_SURVEY_SUBMITTED = 'churn_survey_submitted',
  CHURN_SURVEY_SKIPPED = 'churn_survey_skipped',

  // Feature usage
  CONTACT_ADDED = 'contact_added',
  VERSION_CREATED = 'version_created',
}

/**
 * Initialize PostHog
 */
export function initPostHog(): void {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (typeof window !== 'undefined' && apiKey && !_posthogInitialized) {
    try {
      posthog.init(apiKey, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        persistence: 'localStorage',
        autocapture: false, // We'll track events manually for more control
        disable_session_recording: true, // Enable if needed for debugging
        disable_external_dependency_loading: true, // Prevent script injection that causes hydration mismatch
      });
      _posthogInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }
}

/**
 * Check if PostHog is initialized
 * Returns true only if initialization actually succeeded
 */
export function isPostHogInitialized(): boolean {
  return _posthogInitialized;
}

/**
 * Track an event
 */
export function trackEvent(
  event: AnalyticsEventType | string,
  properties?: Record<string, unknown>
): void {
  if (!isPostHogInitialized()) return;

  try {
    posthog.capture(event, properties);
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

/**
 * Identify a user
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>
): void {
  if (!isPostHogInitialized()) return;

  try {
    posthog.identify(userId, traits);
  } catch (error) {
    console.error('Failed to identify user:', error);
  }
}

/**
 * Reset user identity (on logout)
 */
export function resetUser(): void {
  if (!isPostHogInitialized()) return;

  try {
    posthog.reset();
  } catch (error) {
    console.error('Failed to reset user:', error);
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!isPostHogInitialized()) return;

  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
}

// ========================================
// Convenience Functions for Common Events
// ========================================

/**
 * Track signup started
 */
export function trackSignupStarted(method: 'email' | 'phone'): void {
  trackEvent(AnalyticsEventType.SIGNUP_STARTED, { method });
}

/**
 * Track signup completed
 */
export function trackSignupCompleted(tier: string = 'free'): void {
  trackEvent(AnalyticsEventType.SIGNUP_COMPLETED, { tier });
}

/**
 * Track login
 */
export function trackLogin(method: 'email' | 'phone'): void {
  trackEvent(AnalyticsEventType.LOGIN_SUCCESS, { method });
}

/**
 * Track logout
 */
export function trackLogout(): void {
  trackEvent(AnalyticsEventType.LOGOUT);
  resetUser();
}

/**
 * Track transfer started (files selected)
 */
export function trackTransferStarted(fileCount: number): void {
  trackEvent(AnalyticsEventType.TRANSFER_STARTED, { file_count: fileCount });
}

/**
 * Track files selected
 */
export function trackFilesSelected(fileCount: number, totalSize: number): void {
  trackEvent(AnalyticsEventType.FILES_SELECTED, {
    file_count: fileCount,
    total_size: totalSize,
  });
}

/**
 * Track transfer details filled
 */
export function trackDetailsFilled(hasPrice: boolean, hasPassword: boolean): void {
  trackEvent(AnalyticsEventType.DETAILS_FILLED, {
    has_price: hasPrice,
    has_password: hasPassword,
  });
}

/**
 * Track transfer completed
 */
export function trackTransferCompleted(properties: {
  fileCount: number;
  totalSize: number;
  hasPrice: boolean;
  recipientCount: number;
}): void {
  trackEvent(AnalyticsEventType.TRANSFER_COMPLETED, {
    file_count: properties.fileCount,
    total_size: properties.totalSize,
    has_price: properties.hasPrice,
    recipient_count: properties.recipientCount,
  });
}

/**
 * Track download started
 */
export function trackDownloadStarted(properties: {
  fileCount: number;
  isZip: boolean;
  isPaid: boolean;
}): void {
  trackEvent(AnalyticsEventType.DOWNLOAD_STARTED, {
    file_count: properties.fileCount,
    is_zip: properties.isZip,
    is_paid: properties.isPaid,
  });
}

/**
 * Track download completed
 */
export function trackDownloadCompleted(fileCount: number, isZip: boolean): void {
  trackEvent(AnalyticsEventType.DOWNLOAD_COMPLETED, {
    file_count: fileCount,
    is_zip: isZip,
  });
}

/**
 * Track pricing page viewed
 */
export function trackPricingViewed(): void {
  trackEvent(AnalyticsEventType.PRICING_VIEWED);
}

/**
 * Track plan selected
 */
export function trackPlanSelected(tier: string, cycle: 'monthly' | 'annual'): void {
  trackEvent(AnalyticsEventType.PLAN_SELECTED, { tier, cycle });
}

/**
 * Track payment initiated
 */
export function trackPaymentInitiated(properties: {
  amount: number;
  currency: string;
  method: 'card' | 'mobile_money';
}): void {
  trackEvent(AnalyticsEventType.PAYMENT_INITIATED, properties);
}

/**
 * Track payment method selected
 */
export function trackPaymentMethodSelected(method: 'card' | 'mobile_money'): void {
  trackEvent(AnalyticsEventType.PAYMENT_METHOD_SELECTED, { method });
}

/**
 * Track payment success
 */
export function trackPaymentSuccess(amount: number, currency: string): void {
  trackEvent(AnalyticsEventType.PAYMENT_SUCCESS, { amount, currency });
}

/**
 * Track payment failed
 */
export function trackPaymentFailed(errorCode?: string): void {
  trackEvent(AnalyticsEventType.PAYMENT_FAILED, { error_code: errorCode });
}

/**
 * Track NPS survey shown
 */
export function trackNpsSurveyShown(): void {
  trackEvent(AnalyticsEventType.NPS_SURVEY_SHOWN);
}

/**
 * Track NPS survey submitted
 */
export function trackNpsSurveySubmitted(
  score: number,
  hasComment: boolean
): void {
  const category =
    score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
  trackEvent(AnalyticsEventType.NPS_SURVEY_SUBMITTED, {
    score,
    category,
    has_comment: hasComment,
  });
}

/**
 * Track NPS survey deferred
 */
export function trackNpsSurveyDeferred(): void {
  trackEvent(AnalyticsEventType.NPS_SURVEY_DEFERRED);
}

/**
 * Track NPS survey dismissed
 */
export function trackNpsSurveyDismissed(): void {
  trackEvent(AnalyticsEventType.NPS_SURVEY_DISMISSED);
}

/**
 * Track churn survey shown
 */
export function trackChurnSurveyShown(previousTier: string): void {
  trackEvent(AnalyticsEventType.CHURN_SURVEY_SHOWN, {
    previous_tier: previousTier,
  });
}

/**
 * Track churn survey submitted
 */
export function trackChurnSurveySubmitted(
  reason: string,
  previousTier: string,
  hasDetails: boolean
): void {
  trackEvent(AnalyticsEventType.CHURN_SURVEY_SUBMITTED, {
    reason,
    previous_tier: previousTier,
    has_details: hasDetails,
  });
}

/**
 * Track churn survey skipped
 */
export function trackChurnSurveySkipped(previousTier: string): void {
  trackEvent(AnalyticsEventType.CHURN_SURVEY_SKIPPED, {
    previous_tier: previousTier,
  });
}

export default posthog;
