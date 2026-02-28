import posthog from 'posthog-js';

// Track actual initialization state
let _posthogInitialized = false;

/**
 * Analytics Event Types
 * Convention: snake_case with zefile_ prefix (must match backend)
 */
export enum AnalyticsEventType {
  // Auth events
  SIGNUP_STARTED = 'zefile_signup_started',
  SIGNUP_COMPLETED = 'zefile_signup_completed',
  LOGIN_SUCCESS = 'zefile_login_success',
  LOGOUT = 'zefile_logout',

  // Transfer events
  TRANSFER_STARTED = 'zefile_transfer_started',
  FILES_SELECTED = 'zefile_files_selected',
  DETAILS_FILLED = 'zefile_details_filled',
  TRANSFER_COMPLETED = 'zefile_transfer_completed',
  TRANSFER_VIEWED = 'zefile_transfer_viewed',

  // Download events
  DOWNLOAD_STARTED = 'zefile_download_started',
  DOWNLOAD_COMPLETED = 'zefile_download_completed',

  // Payment events
  PRICING_VIEWED = 'zefile_pricing_viewed',
  PAYMENT_INITIATED = 'zefile_payment_initiated',
  PAYMENT_METHOD_SELECTED = 'zefile_payment_method_selected',
  PAYMENT_SUBMITTED = 'zefile_payment_submitted',
  PAYMENT_SUCCESS = 'zefile_payment_success',
  PAYMENT_FAILED = 'zefile_payment_failed',

  // Subscription events
  PLAN_SELECTED = 'zefile_plan_selected',
  SUBSCRIPTION_STARTED = 'zefile_subscription_started',

  // Survey events
  NPS_SURVEY_SHOWN = 'zefile_nps_survey_shown',
  NPS_SURVEY_SUBMITTED = 'zefile_nps_survey_submitted',
  NPS_SURVEY_DEFERRED = 'zefile_nps_survey_deferred',
  NPS_SURVEY_DISMISSED = 'zefile_nps_survey_dismissed',
  CHURN_SURVEY_SHOWN = 'zefile_churn_survey_shown',
  CHURN_SURVEY_SUBMITTED = 'zefile_churn_survey_submitted',
  CHURN_SURVEY_SKIPPED = 'zefile_churn_survey_skipped',

  // Upload events
  FILE_UPLOADED = 'zefile_file_uploaded',
  UPLOAD_FAILED = 'zefile_upload_failed',

  // Feature usage
  CONTACT_ADDED = 'zefile_contact_added',
  VERSION_CREATED = 'zefile_version_created',

  // Test transfer conversion events (Epic 54)
  TEST_TRANSFER_STARTED = 'zefile_test_transfer_started',
  TEST_TRANSFER_COMPLETED = 'zefile_test_transfer_completed',
  TEST_TRANSFER_CONVERSION_CLICKED = 'zefile_test_transfer_conversion_clicked',

  // Payment funnel events (Epic 54)
  PAYMENT_PAGE_VIEWED = 'zefile_payment_page_viewed',
  PAYMENT_PAGE_ABANDONED = 'zefile_payment_page_abandoned',

  // Social proof events (Epic 54)
  CREATOR_SECTION_VIEWED = 'zefile_creator_section_viewed',
  CREATOR_SOCIAL_LINK_CLICKED = 'zefile_creator_social_link_clicked',
  TOOLKIT_DOWNLOADED = 'zefile_toolkit_downloaded',
}

/**
 * Check if analytics cookies have been consented to
 */
function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('zefile_cookie_consent');
    if (!stored) return false;
    const consent = JSON.parse(stored);
    return consent.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Initialize PostHog (only if analytics cookies are consented)
 */
export function initPostHog(): void {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (typeof window !== 'undefined' && apiKey && !_posthogInitialized) {
    // RGPD: Only initialize if user has consented to analytics cookies
    if (!hasAnalyticsConsent()) return;

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
 * Disable PostHog tracking (when consent is withdrawn)
 */
export function disablePostHog(): void {
  if (_posthogInitialized) {
    try {
      posthog.opt_out_capturing();
      _posthogInitialized = false;
    } catch (error) {
      console.error('Failed to disable PostHog:', error);
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

/**
 * Track individual file uploaded
 */
export function trackFileUploaded(properties: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): void {
  trackEvent(AnalyticsEventType.FILE_UPLOADED, {
    file_name: properties.fileName,
    file_size: properties.fileSize,
    mime_type: properties.mimeType,
  });
}

/**
 * Track upload failure (client-side)
 */
export function trackUploadFailed(properties: {
  fileName?: string;
  errorMessage: string;
  stage?: 'chunk' | 'finalization' | 'abort';
}): void {
  trackEvent(AnalyticsEventType.UPLOAD_FAILED, {
    file_name: properties.fileName,
    error_message: properties.errorMessage,
    stage: properties.stage,
  });
}

/**
 * Track payment submitted (form submit)
 */
export function trackPaymentSubmitted(properties: {
  method: string;
  amount?: number;
  currency?: string;
}): void {
  trackEvent(AnalyticsEventType.PAYMENT_SUBMITTED, {
    method: properties.method,
    amount: properties.amount,
    currency: properties.currency,
  });
}

// ========================================
// Test Transfer & Conversion Events (Epic 54)
// ========================================

/**
 * Track test transfer started (homepage CTA click)
 */
export function trackTestTransferStarted(): void {
  trackEvent(AnalyticsEventType.TEST_TRANSFER_STARTED);
}

/**
 * Track test transfer completed (file uploaded + OTP verified)
 */
export function trackTestTransferCompleted(properties: {
  fileType?: string;
  fileSizeMb?: number;
}): void {
  trackEvent(AnalyticsEventType.TEST_TRANSFER_COMPLETED, {
    file_type: properties.fileType,
    file_size_mb: properties.fileSizeMb,
  });
}

/**
 * Track conversion prompt clicked
 */
export function trackTestTransferConversionClicked(testTransferId: string): void {
  trackEvent(AnalyticsEventType.TEST_TRANSFER_CONVERSION_CLICKED, {
    test_transfer_id: testTransferId,
  });
}

/**
 * Track payment page viewed
 */
export function trackPaymentPageViewed(transferId: string): void {
  trackEvent(AnalyticsEventType.PAYMENT_PAGE_VIEWED, {
    transfer_id: transferId,
  });
}

/**
 * Track payment page abandoned
 */
export function trackPaymentPageAbandoned(transferId: string, timeSpentSeconds: number): void {
  trackEvent(AnalyticsEventType.PAYMENT_PAGE_ABANDONED, {
    transfer_id: transferId,
    time_spent_seconds: timeSpentSeconds,
  });
}

/**
 * Track creator section viewed (IntersectionObserver)
 */
export function trackCreatorSectionViewed(): void {
  trackEvent(AnalyticsEventType.CREATOR_SECTION_VIEWED);
}

/**
 * Track creator social link clicked
 */
export function trackCreatorSocialLinkClicked(creatorId: string, platform: string): void {
  trackEvent(AnalyticsEventType.CREATOR_SOCIAL_LINK_CLICKED, {
    creator_id: creatorId,
    platform,
  });
}

/**
 * Track toolkit downloaded (user is already identified via posthog.identify)
 */
export function trackToolkitDownloaded(): void {
  trackEvent(AnalyticsEventType.TOOLKIT_DOWNLOADED);
}

export default posthog;
