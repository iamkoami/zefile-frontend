'use client';

import { useEffect } from 'react';
import { initSentry, setSentryUser, clearSentryUser } from '@/lib/sentry';

/**
 * SentryProvider Component
 * Initializes Sentry and listens for auth state changes to set user context.
 */
export function SentryProvider({ children }: { children: React.ReactNode }) {
  // Initialize Sentry on mount
  useEffect(() => {
    initSentry();
  }, []);

  // Listen for auth-state-change to set/clear user context
  useEffect(() => {
    const handleAuthStateChange = (
      event: CustomEvent<{
        isAuthenticated: boolean;
        user?: { id: string; email: string; subscriptionTier?: string };
      }>
    ) => {
      if (event.detail.isAuthenticated && event.detail.user) {
        setSentryUser({
          id: event.detail.user.id,
          email: event.detail.user.email,
          subscriptionTier: event.detail.user.subscriptionTier,
        });
      } else {
        clearSentryUser();
      }
    };

    window.addEventListener(
      'auth-state-change',
      handleAuthStateChange as EventListener
    );

    // Check localStorage on mount for existing session
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id) {
          setSentryUser({
            id: user.id,
            email: user.email,
            subscriptionTier: user.subscriptionTier,
          });
        }
      }
    } catch {
      // Corrupted localStorage — ignore
    }

    return () => {
      window.removeEventListener(
        'auth-state-change',
        handleAuthStateChange as EventListener
      );
    };
  }, []);

  return <>{children}</>;
}

export default SentryProvider;
