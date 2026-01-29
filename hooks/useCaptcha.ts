'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * reCAPTCHA v3 Hook
 *
 * Provides invisible CAPTCHA integration for bot protection.
 * Uses Google reCAPTCHA v3 for score-based verification.
 *
 * @see Story 5-2: Invisible CAPTCHA Integration
 */

// Environment variables
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';

// Extend window type for reCAPTCHA
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

interface UseCaptchaReturn {
  /**
   * Execute CAPTCHA and get token for the specified action
   */
  executeAsync: (action: string) => Promise<string | null>;

  /**
   * Whether CAPTCHA is ready to use
   */
  isReady: boolean;

  /**
   * Whether CAPTCHA is enabled (configured)
   */
  isEnabled: boolean;

  /**
   * Error message if CAPTCHA failed to load
   */
  error: string | null;
}

/**
 * Hook for Google reCAPTCHA v3 integration
 *
 * Usage:
 * ```typescript
 * const { executeAsync, isReady, isEnabled } = useCaptcha();
 *
 * const handleSubmit = async () => {
 *   const captchaToken = isEnabled ? await executeAsync('request_otp') : null;
 *   await authApi.requestOTP({ email, captchaToken });
 * };
 * ```
 */
export function useCaptcha(): UseCaptchaReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  // Check if CAPTCHA is enabled
  const isEnabled = CAPTCHA_ENABLED && !!RECAPTCHA_SITE_KEY;

  // Load reCAPTCHA script
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Prevent duplicate script loading
    if (scriptLoadedRef.current) {
      return;
    }

    // Check if already loaded
    if (typeof window !== 'undefined' && window.grecaptcha) {
      window.grecaptcha.ready(() => {
        setIsReady(true);
      });
      return;
    }

    // Load script
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsReady(true);
        });
      }
    };

    script.onerror = () => {
      setError('Failed to load reCAPTCHA');
      console.error('Failed to load reCAPTCHA script');
    };

    document.head.appendChild(script);

    // Cleanup not needed - script should persist
  }, [isEnabled]);

  /**
   * Execute CAPTCHA for the given action
   */
  const executeAsync = useCallback(
    async (action: string): Promise<string | null> => {
      // Return null if not enabled - backend will handle gracefully
      if (!isEnabled) {
        return null;
      }

      // Wait for ready state
      if (!isReady || !window.grecaptcha) {
        console.warn('reCAPTCHA not ready yet');
        return null;
      }

      try {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
        return token;
      } catch (err) {
        console.error('reCAPTCHA execution failed:', err);
        setError('CAPTCHA verification failed');
        return null;
      }
    },
    [isEnabled, isReady]
  );

  return {
    executeAsync,
    isReady,
    isEnabled,
    error,
  };
}

/**
 * CAPTCHA action constants
 * Use these to ensure consistent action names between frontend and backend
 */
export const CAPTCHA_ACTIONS = {
  REQUEST_OTP: 'request_otp',
  VERIFY_OTP: 'verify_otp',
  DOWNLOAD: 'download',
  PAYMENT: 'payment',
} as const;

export type CaptchaAction = (typeof CAPTCHA_ACTIONS)[keyof typeof CAPTCHA_ACTIONS];
