'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPostHog, isPostHogInitialized } from '@/lib/posthog';
import posthog from 'posthog-js';

/**
 * PostHog Provider Component
 * Initializes PostHog and tracks page views
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Initialize PostHog on mount
  useEffect(() => {
    initPostHog();
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
