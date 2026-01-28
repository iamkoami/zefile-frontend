'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { paymentApi, PaymentStatusV2Response, PaymentStatusType } from '@/services/payment-api';

/**
 * Payment polling status
 */
export type PollingStatus =
  | 'idle' // Not polling
  | 'polling' // Actively polling
  | 'success' // Payment completed successfully
  | 'failed' // Payment failed
  | 'timeout'; // Polling timed out

/**
 * Hook return type
 */
interface UsePaymentStatusReturn {
  /** Current polling status */
  pollingStatus: PollingStatus;
  /** Latest payment data from backend */
  paymentData: PaymentStatusV2Response | null;
  /** Error message if polling failed */
  error: string | null;
  /** Start polling for a payment reference */
  startPolling: (reference: string) => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Reset to idle state */
  reset: () => void;
}

/**
 * Hook configuration
 */
interface UsePaymentStatusOptions {
  /** Polling interval in ms (default: 3000) */
  interval?: number;
  /** Timeout in ms (default: 60000 = 60 seconds) */
  timeout?: number;
  /** Callback when payment succeeds */
  onSuccess?: (payment: PaymentStatusV2Response) => void;
  /** Callback when payment fails */
  onFailed?: (payment: PaymentStatusV2Response) => void;
  /** Callback when polling times out */
  onTimeout?: () => void;
}

/**
 * Terminal statuses that stop polling
 */
const TERMINAL_STATUSES: PaymentStatusType[] = ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'];

/**
 * usePaymentStatus - Hook for polling payment status
 *
 * Features:
 * - Automatic polling at configurable interval
 * - Timeout handling
 * - Automatic stop on terminal status (success/failed)
 * - Callbacks for success/failure/timeout
 *
 * Usage:
 * ```tsx
 * const { pollingStatus, paymentData, startPolling, stopPolling } = usePaymentStatus({
 *   onSuccess: (payment) => redirectToDownload(),
 *   onFailed: (payment) => showError(payment.failureReason),
 *   onTimeout: () => showTimeoutMessage(),
 * });
 *
 * // Start polling after payment is initialized
 * startPolling(paymentReference);
 * ```
 */
export function usePaymentStatus(options: UsePaymentStatusOptions = {}): UsePaymentStatusReturn {
  const { interval = 3000, timeout = 60000, onSuccess, onFailed, onTimeout } = options;

  const [pollingStatus, setPollingStatus] = useState<PollingStatus>('idle');
  const [paymentData, setPaymentData] = useState<PaymentStatusV2Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const referenceRef = useRef<string | null>(null);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    referenceRef.current = null;
  }, []);

  /**
   * Poll for payment status
   */
  const poll = useCallback(async () => {
    const reference = referenceRef.current;
    if (!reference) return;

    // Check timeout
    if (Date.now() - startTimeRef.current > timeout) {
      setPollingStatus('timeout');
      stopPolling();
      onTimeout?.();
      return;
    }

    try {
      const response = await paymentApi.getPaymentStatusV2(reference);

      if (response.error) {
        console.error('Failed to poll payment status:', response.error);
        // Continue polling even on error (network glitch)
        pollingRef.current = setTimeout(poll, interval);
        return;
      }

      const payment = response.data;
      if (!payment) {
        // Continue polling
        pollingRef.current = setTimeout(poll, interval);
        return;
      }

      setPaymentData(payment);

      // Check if payment is in terminal state
      if (TERMINAL_STATUSES.includes(payment.status)) {
        if (payment.status === 'SUCCESS') {
          setPollingStatus('success');
          onSuccess?.(payment);
        } else {
          setPollingStatus('failed');
          setError(payment.failureReason || null);
          onFailed?.(payment);
        }
        stopPolling();
        return;
      }

      // Continue polling
      pollingRef.current = setTimeout(poll, interval);
    } catch (err) {
      console.error('Error polling payment status:', err);
      // Continue polling even on error
      pollingRef.current = setTimeout(poll, interval);
    }
  }, [interval, timeout, stopPolling, onSuccess, onFailed, onTimeout]);

  /**
   * Start polling for a payment reference
   */
  const startPolling = useCallback(
    (reference: string) => {
      // Stop any existing polling
      stopPolling();

      // Reset state
      setPollingStatus('polling');
      setPaymentData(null);
      setError(null);

      // Set reference and start time
      referenceRef.current = reference;
      startTimeRef.current = Date.now();

      // Start polling immediately
      poll();
    },
    [stopPolling, poll]
  );

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    stopPolling();
    setPollingStatus('idle');
    setPaymentData(null);
    setError(null);
  }, [stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    pollingStatus,
    paymentData,
    error,
    startPolling,
    stopPolling,
    reset,
  };
}

export default usePaymentStatus;
