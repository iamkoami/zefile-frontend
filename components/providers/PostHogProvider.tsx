'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, disablePostHog, isPostHogInitialized } from '@/lib/posthog';
import posthog from 'posthog-js';
import { platformApi } from '@/services/platform-api';

/**
 * PostHog Provider Component
 * Initializes PostHog only when analytics cookies are consented (RGPD)
 * Reads sessionReplayEnabled from platform config to drive replay toggle
 * Listens for cookie consent changes to enable/disable tracking
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sessionReplayEnabled = useRef(false);

  // Initialize PostHog on mount — fetch replay flag from platform config first
  useEffect(() => {
    platformApi.getPublicConfig().then((res) => {
      if (res.data) {
        sessionReplayEnabled.current = res.data.sessionReplayEnabled ?? false;
      }
      initPostHog(sessionReplayEnabled.current);
    }).catch(() => {
      initPostHog(false);
    });
  }, []);

  // Listen for cookie consent changes
  useEffect(() => {
    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.analytics) {
        initPostHog(sessionReplayEnabled.current);
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
