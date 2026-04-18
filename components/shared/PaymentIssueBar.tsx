'use client';

/**
 * PaymentIssueBar — sticky top banner shown to users whose auto-renewal just failed
 * (Story 132-4b). Four states:
 *
 *   1. Early grace (days >= 5): warm heads-up, dismissible for the session.
 *   2. Mid grace (days 1–4):   friendly nudge, dismissible for the session.
 *   3. Imminent (day 0, not yet reverted): "reverts any moment" nudge, dismissible.
 *      Bridges the ≤1h gap between grace expiry and the hourly revert scheduler.
 *   4. Reverted (tier === free + downgradedFrom set): NOT dismissible; CTA becomes
 *      "Reactivate {tier}" and routes to SubscriptionCheckoutPanel.
 *
 * Brand voice: warm, clear, no red, no alarm. Follows `_bmad-output/planning-artifacts/zefile-voice-guide.md`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { InfoCircle, Xmark } from 'iconoir-react';
import { useSubscriptionStore } from '@/stores/subscription-store';
import {
  useDrawerStore,
  serializeDrawerForRedirect,
  DRAWER_REDIRECT_STATE_KEY,
} from '@/stores/drawer-store';
import {
  subscriptionApi,
  getTierPriceMinorUnits,
  type SubscriptionTier,
  type BillingPeriod,
} from '@/services/subscription-api';
import { useCurrencyStore } from '@/stores/currency-store';
import { getPricingForCountry } from '@/services/subscription-api';
import { toast } from '@/components/shared/Toast';
import {
  AnalyticsEventType,
  trackEvent,
} from '@/lib/posthog';
import { safePaymentRedirect } from '@/utils/security';

const SESSION_DISMISSED_KEY = 'payment-issue-bar-dismissed';
const SESSION_SEEN_KEY = 'payment-issue-bar-seen';

type BarState = 'early' | 'mid' | 'imminent' | 'reverted' | 'hidden';

type PreviousTier = Exclude<SubscriptionTier, 'free'>;

function readSessionFlag(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(key) === '1';
}

function writeSessionFlag(key: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(key, '1');
}

function tierLabelKey(tier: PreviousTier): 'tierPro' | 'tierStarter' {
  return tier === 'pro' ? 'tierPro' : 'tierStarter';
}

export function PaymentIssueBar() {
  const t = useTranslations('paymentIssueBar');

  const {
    subscription,
    daysLeft,
    renewalFailureCount,
    isReverted,
    previousTier,
    previousBillingPeriod,
    startPolling,
    stopPolling,
  } = useSubscriptionStore();

  const openSubscriptionCheckout = useDrawerStore(
    (s) => s.openSubscriptionCheckout,
  );

  const countryCode = useCurrencyStore((s) => s.countryCode);

  const [dismissed, setDismissed] = useState(false);
  const [ctaPending, setCtaPending] = useState(false);
  const shownLoggedRef = useRef(false);

  // Start polling on mount; tear down on unmount (refcounted to survive StrictMode).
  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  // Read the dismissed flag once on the client after mount — SSR-safe.
  useEffect(() => {
    setDismissed(readSessionFlag(SESSION_DISMISSED_KEY));
  }, []);

  const barState = useMemo<BarState>(() => {
    if (isReverted && previousTier) return 'reverted';
    if (renewalFailureCount > 0 && daysLeft >= 5) return 'early';
    if (renewalFailureCount > 0 && daysLeft >= 1 && daysLeft <= 4) return 'mid';
    // daysLeft === 0 but backend hasn't reverted yet — bridges the ≤1h gap
    // between grace expiry and the hourly `handleGracePeriodExpirations` scheduler.
    if (renewalFailureCount > 0 && daysLeft === 0) return 'imminent';
    return 'hidden';
  }, [isReverted, previousTier, renewalFailureCount, daysLeft]);

  // Reverted state is NOT dismissible; other states respect the session flag.
  const isVisible =
    barState !== 'hidden' && (barState === 'reverted' || !dismissed);

  // Fire SHOWN once per session when the bar actually renders.
  useEffect(() => {
    if (!isVisible || shownLoggedRef.current) return;
    if (readSessionFlag(SESSION_SEEN_KEY)) {
      shownLoggedRef.current = true;
      return;
    }
    writeSessionFlag(SESSION_SEEN_KEY);
    shownLoggedRef.current = true;
    trackEvent(AnalyticsEventType.PAYMENT_ISSUE_BAR_SHOWN, {
      state: barState,
      days_left: daysLeft,
    });
  }, [isVisible, barState, daysLeft]);

  const handleDismiss = useCallback(() => {
    // Post-revert is never dismissible — defensive guard.
    if (barState === 'reverted') return;
    writeSessionFlag(SESSION_DISMISSED_KEY);
    setDismissed(true);
    trackEvent(AnalyticsEventType.PAYMENT_ISSUE_BAR_DISMISSED, {
      days_left: daysLeft,
    });
  }, [barState, daysLeft]);

  const handleUpdatePayment = useCallback(async () => {
    if (ctaPending) return;
    setCtaPending(true);
    trackEvent(AnalyticsEventType.PAYMENT_ISSUE_BAR_CTA_CLICKED, {
      days_left: daysLeft,
      cta_type: 'update',
    });

    try {
      const response = await subscriptionApi.initializeUpdatePaymentMethod();

      if (response.error) {
        if (response.status === 429) {
          toast.error(t('errors.throttled'));
        } else if (response.status === 503) {
          toast.error(t('errors.paymentsPaused'));
        } else if (response.status === 400) {
          // Backend 60s double-click debounce (story 132-4a, H2) — show a
          // localized "try again in a moment" message instead of the raw
          // English backend string.
          toast.error(t('errors.inProgress'));
        } else {
          toast.error(t('errors.network'));
        }
        setCtaPending(false);
        return;
      }

      const url = response.data?.authorizationUrl;
      if (!url) {
        toast.error(t('errors.network'));
        setCtaPending(false);
        return;
      }

      // Stash drawer state (open or closed) so /payment/processing can rehydrate
      // after the Paystack redirect lands back in the app.
      try {
        const snapshot = serializeDrawerForRedirect();
        window.sessionStorage.setItem(
          DRAWER_REDIRECT_STATE_KEY,
          JSON.stringify(snapshot),
        );
      } catch {
        // Non-fatal: if storage is full or blocked, the redirect still works.
      }

      safePaymentRedirect(url);
    } catch {
      toast.error(t('errors.network'));
      setCtaPending(false);
    }
  }, [ctaPending, daysLeft, t]);

  const handleReactivate = useCallback(() => {
    if (ctaPending || !previousTier) return;
    trackEvent(AnalyticsEventType.PAYMENT_ISSUE_BAR_CTA_CLICKED, {
      days_left: daysLeft,
      cta_type: 'reactivate',
      previous_tier: previousTier,
    });

    // Preserve the pre-revert cadence when the backend captured it
    // (metadata.downgradedFromBillingPeriod); otherwise keep whatever the current
    // subscription still reports; fall back to monthly as the most common cadence.
    const billingPeriod: BillingPeriod =
      previousBillingPeriod ??
      (subscription?.billingPeriod as BillingPeriod | null | undefined) ??
      'monthly';
    const amount = getTierPriceMinorUnits(
      previousTier,
      billingPeriod,
      countryCode,
    );
    const currency = getPricingForCountry(countryCode).currency;

    openSubscriptionCheckout(
      previousTier,
      billingPeriod,
      amount,
      currency,
      countryCode,
    );
  }, [
    ctaPending,
    countryCode,
    daysLeft,
    openSubscriptionCheckout,
    previousTier,
    previousBillingPeriod,
    subscription?.billingPeriod,
  ]);

  if (!isVisible) return null;

  const rawTier: SubscriptionTier | undefined =
    previousTier ??
    (subscription?.tier && subscription.tier !== 'free'
      ? subscription.tier
      : undefined);
  const tierKeyForCopy: PreviousTier =
    rawTier === 'pro' || rawTier === 'starter' ? rawTier : 'pro';
  if (rawTier && rawTier !== 'pro' && rawTier !== 'starter' && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[PaymentIssueBar] Unexpected subscription tier "${rawTier}"; falling back to "pro" copy.`,
    );
  }
  const tierLabel = t(tierLabelKey(tierKeyForCopy));

  let message: string;
  let ctaLabel: string;
  let ctaHandler: () => void;

  if (barState === 'reverted' && previousTier) {
    message = t('reverted', { previousTier: t(tierLabelKey(previousTier)) });
    ctaLabel = ctaPending
      ? t('redirecting')
      : t('reactivateCta', { tier: t(tierLabelKey(previousTier)) });
    ctaHandler = handleReactivate;
  } else if (barState === 'early') {
    message = t('earlyGrace', { tier: tierLabel, daysLeft });
    ctaLabel = ctaPending ? t('redirecting') : t('updatePaymentCta');
    ctaHandler = handleUpdatePayment;
  } else if (barState === 'imminent') {
    message = t('imminent', { tier: tierLabel });
    ctaLabel = ctaPending ? t('redirecting') : t('updatePaymentCta');
    ctaHandler = handleUpdatePayment;
  } else {
    // mid
    message = t('midGrace', { tier: tierLabel, daysLeft });
    ctaLabel = ctaPending ? t('redirecting') : t('updatePaymentCta');
    ctaHandler = handleUpdatePayment;
  }

  const showDismiss = barState !== 'reverted';

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] w-full bg-[#FDF8F0] border-b border-[#E8E1D2] text-[#171717] dark:bg-[oklch(0.24_0_0)] dark:border-[oklch(0.32_0_0)] dark:text-[oklch(0.91_0_0)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <InfoCircle
            aria-hidden
            className="h-5 w-5 flex-shrink-0 text-[#5E53E0]"
          />
          <p className="min-w-0 truncate text-sm font-medium">{message}</p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={ctaHandler}
            disabled={ctaPending}
            className="rounded bg-[#87E64B] px-3 py-1.5 text-sm font-semibold text-[#171717] transition-colors hover:bg-[#78d43f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctaLabel}
          </button>

          {showDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('dismiss')}
              className="rounded p-1 text-[#171717]/70 transition-colors hover:bg-black/5 hover:text-[#171717] dark:text-[oklch(0.91_0_0)]/70 dark:hover:bg-white/5"
            >
              <Xmark className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
