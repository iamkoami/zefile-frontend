'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

interface UseTurnstileReturn {
  /** Get a fresh Turnstile token. Returns null if disabled or on failure (fail-open). */
  getToken: () => Promise<string | null>;
  /** Whether the Turnstile widget is ready to generate tokens. */
  isReady: boolean;
  /** Whether Turnstile is enabled (site key is configured). */
  isEnabled: boolean;
  /** Reset the widget and clear cached token. */
  reset: () => void;
  /** Ref to attach to the Turnstile component. */
  turnstileRef: React.RefObject<TurnstileInstance | null>;
  /** Site key for the Turnstile component. */
  siteKey: string;
  /** Callback for Turnstile onSuccess. */
  onSuccess: (token: string) => void;
  /** Callback for Turnstile onError. */
  onError: () => void;
  /** Callback for Turnstile onExpire. */
  onExpire: () => void;
}

/**
 * Hook for Cloudflare Turnstile invisible CAPTCHA integration.
 *
 * Includes concurrency safety (lock), unmount cleanup, and fail-open behavior.
 */
export function useTurnstile(): UseTurnstileReturn {
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Concurrency lock: prevents multiple getToken() calls from racing
  const pendingPromiseRef = useRef<Promise<string | null> | null>(null);

  // Unmount flag for cleanup
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isEnabled = !!TURNSTILE_SITE_KEY;

  const onSuccess = useCallback((token: string) => {
    tokenRef.current = token;
    if (isMountedRef.current) {
      setIsReady(true);
    }
  }, []);

  const onError = useCallback(() => {
    console.warn('Turnstile verification error');
    if (isMountedRef.current) {
      setIsReady(true); // Fail-open -- don't block the user
    }
  }, []);

  const onExpire = useCallback(() => {
    tokenRef.current = null;
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (!isEnabled) return null;

    // If another getToken() call is in progress, wait for it and then
    // reset+retry so each caller gets its own fresh token attempt.
    if (pendingPromiseRef.current) {
      await pendingPromiseRef.current;
      // Fall through to generate a fresh token below
    }

    const tokenPromise = (async (): Promise<string | null> => {
      try {
        // If we have a cached token from onSuccess, use it
        if (tokenRef.current) {
          const token = tokenRef.current;
          tokenRef.current = null;
          return token;
        }

        // Try to execute the widget for a fresh token
        if (turnstileRef.current) {
          turnstileRef.current.reset();

          // Wait for the new token (up to 10 seconds)
          const token = await new Promise<string | null>((resolve) => {
            const deadline = Date.now() + 10000;
            let timerId: ReturnType<typeof setTimeout>;

            const check = () => {
              if (!isMountedRef.current) {
                resolve(null);
                return;
              }
              if (tokenRef.current) {
                const t = tokenRef.current;
                tokenRef.current = null;
                resolve(t);
              } else if (Date.now() > deadline) {
                console.warn('Turnstile token generation timed out after 10s');
                resolve(null);
              } else {
                timerId = setTimeout(check, 100);
              }
            };
            check();

            // Return cleanup handle (not used directly but timer self-cleans via isMounted check)
          });

          return token;
        }

        console.warn('Turnstile widget not mounted');
        return null;
      } catch (err) {
        console.warn('Turnstile token generation failed:', err);
        return null;
      }
    })();

    pendingPromiseRef.current = tokenPromise;

    try {
      return await tokenPromise;
    } finally {
      pendingPromiseRef.current = null;
    }
  }, [isEnabled]);

  const reset = useCallback(() => {
    tokenRef.current = null;
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, []);

  return {
    getToken,
    isReady: isEnabled ? isReady : true,
    isEnabled,
    reset,
    turnstileRef,
    siteKey: TURNSTILE_SITE_KEY,
    onSuccess,
    onError,
    onExpire,
  };
}
