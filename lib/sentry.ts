import * as Sentry from '@sentry/react';

// Track actual initialization state
let _sentryInitialized = false;

/**
 * Initialize Sentry
 * Client-side only — @sentry/react, compatible with Cloudflare Pages.
 */
export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (typeof window !== 'undefined' && dsn && !_sentryInitialized) {
    try {
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || 'production',

        // No performance monitoring (free tier)
        tracesSampleRate: 0,

        // Filter browser noise
        ignoreErrors: [
          'ResizeObserver loop',
          'ResizeObserver loop limit exceeded',
          'AbortError',
          'cancelled',
        ],

        // Only capture errors from our domains
        allowUrls: [
          /https?:\/\/(.*\.)?zefile\.(io|co)/,
          /https?:\/\/localhost/,
        ],

        // Strip PostHog requests from breadcrumbs
        beforeBreadcrumb(breadcrumb) {
          if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
            const url = breadcrumb.data?.url || '';
            if (typeof url === 'string' && url.includes('posthog')) {
              return null;
            }
          }
          return breadcrumb;
        },
      });
      _sentryInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return _sentryInitialized;
}

/**
 * Capture an exception
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!isSentryInitialized()) return;

  try {
    Sentry.captureException(error, { extra: context });
  } catch (e) {
    console.error('Failed to capture exception:', e);
  }
}

/**
 * Set user context (after login)
 */
export function setSentryUser(user: {
  id: string;
  email?: string;
  subscriptionTier?: string;
}): void {
  if (!isSentryInitialized()) return;

  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      subscription_tier: user.subscriptionTier,
    });
  } catch (e) {
    console.error('Failed to set Sentry user:', e);
  }
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser(): void {
  if (!isSentryInitialized()) return;

  try {
    Sentry.setUser(null);
  } catch (e) {
    console.error('Failed to clear Sentry user:', e);
  }
}
