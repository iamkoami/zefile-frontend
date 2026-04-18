/**
 * Subscription Store — Zustand store for the authenticated user's current subscription.
 *
 * Poll cadence: GET /subscriptions/current every 60s, but ONLY while the tab is visible
 * (`document.visibilityState === 'visible'`). The store auto-pauses on `visibilitychange`
 * and resumes when the tab returns. StrictMode double-mount is guarded by a module-level
 * refcount on the polling lifecycle.
 *
 * Drives Story 132-4b's PaymentIssueBar — exposes `daysLeft`, `isReverted`, and
 * `previousTier` derived from the four grace-period fields on `UserSubscription`.
 */

import { create } from 'zustand';
import {
  subscriptionApi,
  type BillingPeriod,
  type SubscriptionTier,
  type UserSubscription,
} from '@/services/subscription-api';
import { authApi } from '@/services/auth-api';

const POLL_INTERVAL_MS = 60_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type PreviousTier = Exclude<SubscriptionTier, 'free'> | null;

interface SubscriptionStore {
  subscription: UserSubscription | null;
  gracePeriodEnd: Date | null;
  renewalFailureCount: number;
  /** `Math.ceil((gracePeriodEnd - now) / 1day)`; clamped to 0 once the grace period has passed. */
  daysLeft: number;
  /** True when the backend has reverted the user to free and recorded `downgradedFrom`. */
  isReverted: boolean;
  /** Tier the user was on before revert; used to drive the "Reactivate {tier}" CTA. */
  previousTier: PreviousTier;
  /**
   * Billing cadence (monthly/annual) from before the revert. Preserved by the backend
   * in metadata.downgradedFromBillingPeriod so the reactivation checkout can preselect
   * the same cadence. Null when never reverted, or when the revert predates this field.
   */
  previousBillingPeriod: BillingPeriod | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

function computeDaysLeft(gracePeriodEnd: Date | null): number {
  if (!gracePeriodEnd) return 0;
  const remainingMs = gracePeriodEnd.getTime() - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / MS_PER_DAY);
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toPreviousTier(tier: SubscriptionTier | null | undefined): PreviousTier {
  if (tier === 'pro' || tier === 'starter') return tier;
  return null;
}

// Module-level lifecycle state — lives outside the store so React StrictMode
// double-invocation of startPolling() does not create duplicate timers.
let pollTimer: ReturnType<typeof setInterval> | null = null;
let visibilityHandler: (() => void) | null = null;
let authClearHandler: (() => void) | null = null;
let authChangeHandler: ((event: Event) => void) | null = null;
let refCount = 0;

function stopTimerOnly(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function tearDownTimers(): void {
  stopTimerOnly();
  if (visibilityHandler && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  visibilityHandler = null;
  if (authClearHandler && typeof window !== 'undefined') {
    window.removeEventListener('clear-all-stores', authClearHandler);
  }
  authClearHandler = null;
  if (authChangeHandler && typeof window !== 'undefined') {
    window.removeEventListener('auth-state-change', authChangeHandler);
  }
  authChangeHandler = null;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscription: null,
  gracePeriodEnd: null,
  renewalFailureCount: 0,
  daysLeft: 0,
  isReverted: false,
  previousTier: null,
  previousBillingPeriod: null,
  isLoading: false,

  refetch: async () => {
    if (!authApi.isAuthenticated()) {
      // Anonymous — nothing to poll.
      get().reset();
      return;
    }

    set({ isLoading: true });
    try {
      const response = await subscriptionApi.getCurrentSubscription();
      if (!response.data) {
        // Either the user is on default FREE tier (backend returns a synthetic record)
        // or the endpoint failed silently — treat as no grace-period signal.
        set({
          subscription: null,
          gracePeriodEnd: null,
          renewalFailureCount: 0,
          daysLeft: 0,
          isReverted: false,
          previousTier: null,
          previousBillingPeriod: null,
          isLoading: false,
        });
        return;
      }

      const sub = response.data;
      const gracePeriodEnd = parseDate(sub.gracePeriodEnd ?? null);
      const previousTier = toPreviousTier(sub.downgradedFrom ?? null);
      const isReverted = sub.tier === 'free' && previousTier !== null;
      const previousBillingPeriod =
        sub.downgradedFromBillingPeriod === 'monthly' ||
        sub.downgradedFromBillingPeriod === 'annual'
          ? sub.downgradedFromBillingPeriod
          : null;

      set({
        subscription: sub,
        gracePeriodEnd,
        renewalFailureCount: sub.renewalFailureCount ?? 0,
        daysLeft: computeDaysLeft(gracePeriodEnd),
        isReverted,
        previousTier,
        previousBillingPeriod,
        isLoading: false,
      });
    } catch {
      // Network/transient errors leave current state as-is — polling will retry.
      set({ isLoading: false });
    }
  },

  startPolling: () => {
    if (typeof window === 'undefined') return;

    refCount += 1;
    // First mount wires timers + listeners; subsequent mounts (StrictMode) just bump the count.
    if (refCount > 1) return;

    // Fire an initial fetch so the UI reflects current state immediately.
    void get().refetch();

    visibilityHandler = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        void get().refetch();
        if (pollTimer === null) {
          pollTimer = setInterval(() => {
            void get().refetch();
          }, POLL_INTERVAL_MS);
        }
      } else {
        if (pollTimer !== null) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }
    };

    authClearHandler = () => {
      // On logout: stop the polling interval so we don't fire guarded no-op
      // requests every 60s for the rest of the tab's lifetime. If the user logs
      // back in, `authChangeHandler` below re-arms the timer.
      stopTimerOnly();
      get().reset();
    };

    authChangeHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ isAuthenticated?: boolean }>).detail;
      if (!detail?.isAuthenticated) return;
      void get().refetch();
      if (
        pollTimer === null &&
        (typeof document === 'undefined' || document.visibilityState === 'visible')
      ) {
        pollTimer = setInterval(() => {
          void get().refetch();
        }, POLL_INTERVAL_MS);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visibilityHandler);
    }
    window.addEventListener('clear-all-stores', authClearHandler);
    window.addEventListener('auth-state-change', authChangeHandler);

    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      pollTimer = setInterval(() => {
        void get().refetch();
      }, POLL_INTERVAL_MS);
    }
  },

  stopPolling: () => {
    if (refCount === 0) return;
    refCount -= 1;
    if (refCount > 0) return;
    tearDownTimers();
  },

  reset: () => {
    set({
      subscription: null,
      gracePeriodEnd: null,
      renewalFailureCount: 0,
      daysLeft: 0,
      isReverted: false,
      previousTier: null,
      previousBillingPeriod: null,
      isLoading: false,
    });
  },
}));
