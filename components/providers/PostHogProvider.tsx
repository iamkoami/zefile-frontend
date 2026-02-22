'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, disablePostHog, isPostHogInitialized } from '@/lib/posthog';
import posthog from 'posthog-js';

/**
 * PostHog Provider Component
 * Initializes PostHog only when analytics cookies are consented (RGPD)
 * Listens for cookie consent changes to enable/disable tracking
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize PostHog on mount (will skip if no analytics consent)
  useEffect(() => {
    initPostHog();
  }, []);

  // Listen for cookie consent changes
  useEffect(() => {
    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.analytics) {
        initPostHog();
      } else {
        disablePostHog();
      }
    };

    window.addEventListener('cookie-consent-changed', handleConsentChange);
    return () => window.removeEventListener('cookie-consent-changed', handleConsentChange);
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (isPostHogInitialized() && pathname) {
      const url = pathname + (window.location.search || '');
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname]);

  return <>{children}</>;
}

export default PostHogProvider;
