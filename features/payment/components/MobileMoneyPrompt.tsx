'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CheckCircle, XmarkCircle, WarningCircle, Xmark, Refresh, Clock } from 'iconoir-react';
import Image from 'next/image';
import { MobileMoneyProvider } from './PaymentMethodSelector';
import { apiClient } from '@/services/api-client';

/**
 * Payment status types
 */
export type PaymentStatus =
  | 'initiating'
  | 'waiting'
  | 'success'
  | 'failed'
  | 'timeout';

/**
 * MobileMoneyPrompt component props
 */
interface MobileMoneyPromptProps {
  isOpen: boolean;
  provider: MobileMoneyProvider;
  phoneNumber: string;
  amount: number;
  currency: string;
  currencySymbol: string;
  transferId: string;
  paymentReference: string;
  onSuccess: () => void;
  onRetry: () => void;
  onChangeMethod: () => void;
  onCancel: () => void;
}

/**
 * Provider display information
 */
const PROVIDER_INFO: Record<MobileMoneyProvider, { name: string; icon: string }> = {
  mtn_momo: { name: 'MTN Mobile Money', icon: 'mtn' },
  vodafone_cash: { name: 'Vodafone Cash', icon: 'vodafone' },
  airtel_tigo: { name: 'AirtelTigo Money', icon: 'airtel' },
  mpesa: { name: 'M-Pesa', icon: 'mpesa' },
  airtel_money: { name: 'Airtel Money', icon: 'airtel' },
  orange_money: { name: 'Orange Money', icon: 'orange' },
  wave: { name: 'Wave', icon: 'wave' },
};

/**
 * MobileMoneyPrompt - Modal showing payment status during Mobile Money transaction
 *
 * Displays:
 * - Provider logo
 * - Amount being charged
 * - "Check your phone" instruction
 * - Real-time status updates
 * - Success/failure states with appropriate actions
 */
export function MobileMoneyPrompt({
  isOpen,
  provider,
  phoneNumber,
  amount,
  currency,
  currencySymbol,
  transferId,
  paymentReference,
  onSuccess,
  onRetry,
  onChangeMethod,
  onCancel,
}: MobileMoneyPromptProps) {
  const t = useTranslations('payment');
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>('initiating');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Portal setup
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Mask phone number for display (show only last 4 digits)
  const maskedPhone = phoneNumber.replace(/\d(?=\d{4})/g, '*');

  // Format amount for display
  const formatAmount = (amountValue: number, symbol: string): string => {
    const majorUnits = amountValue / 100;
    return `${symbol}${majorUnits.toLocaleString()}`;
  };

  // Get provider icon path
  const getProviderIconPath = (icon: string): string => {
    return `/icons/payment/${icon}.svg`;
  };

  // Provider info
  const providerInfo = PROVIDER_INFO[provider] || { name: provider, icon: 'mtn' };

  /**
   * Poll payment status
   */
  const pollPaymentStatus = useCallback(async () => {
    // Check timeout (60 seconds)
    if (Date.now() - startTimeRef.current > 60000) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await apiClient.get(
        `/v2/payments/${paymentReference}/status`
      );

      if (response.error) {
        throw new Error(response.error.message || 'Failed to poll payment status');
      }

      const data = response.data;

      if (data.status === 'SUCCESS') {
        setStatus('success');
        // Wait 2 seconds then redirect
        setTimeout(() => {
          onSuccess();
        }, 2000);
        return; // Stop polling
      }

      if (data.status === 'FAILED') {
        setStatus('failed');
        setErrorMessage(data.failureReason || t('paymentFailed'));
        return; // Stop polling
      }

      // Continue polling - schedule next poll
      pollingRef.current = setTimeout(pollPaymentStatus, 3000);
    } catch (error) {
      console.error('Failed to poll payment status:', error);
      // Continue polling even on error
      pollingRef.current = setTimeout(pollPaymentStatus, 3000);
    }
  }, [paymentReference, onSuccess, t]);

  // Start polling when component opens
  useEffect(() => {
    if (isOpen && paymentReference) {
      // Reset state
      setStatus('initiating');
      setErrorMessage(null);
      startTimeRef.current = Date.now();

      // Transition to waiting state after 3 seconds
      const initTimeout = setTimeout(() => {
        setStatus('waiting');
      }, 3000);

      // Start polling after initial delay
      const pollTimeout = setTimeout(() => {
        pollPaymentStatus();
      }, 3000);

      return () => {
        clearTimeout(initTimeout);
        clearTimeout(pollTimeout);
        if (pollingRef.current) {
          clearTimeout(pollingRef.current);
        }
      };
    }
  }, [isOpen, paymentReference, pollPaymentStatus]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  // Body scroll prevention
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  /**
   * Render status-specific content
   */
  const renderContent = () => {
    switch (status) {
      case 'initiating':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-[#5E53E0] animate-pulse" />
            </div>
            <p className="text-lg font-medium text-gray-900 text-center">
              {t('initiatingPayment')}
            </p>
          </>
        );

      case 'waiting':
        return (
          <>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center mb-4">
                <span className="text-4xl">📱</span>
              </div>
              <p className="text-lg font-medium text-gray-900 text-center mb-2">
                {t('checkYourPhone')}
              </p>
              <p className="text-sm text-gray-600 text-center">
                {t('confirmPaymentOn')}
              </p>
              <p className="text-lg font-mono font-medium text-gray-900 text-center mt-2">
                {maskedPhone}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-[#5E53E0] animate-pulse" />
              <span className="text-sm text-gray-600">{t('waitingForConfirmation')}</span>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-[#87E64B]" />
            </div>
            <p className="text-xl font-semibold text-gray-900 text-center mb-2">
              {t('paymentSuccessful')}
            </p>
            <p className="text-lg text-gray-700 text-center mb-4">
              {formatAmount(amount, currencySymbol)} {t('paid')}
            </p>
            <p className="text-sm text-gray-500 text-center">
              {t('redirectingToDownload')}
            </p>
          </>
        );

      case 'failed':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <XmarkCircle className="w-16 h-16 text-red-500" />
            </div>
            <p className="text-xl font-semibold text-gray-900 text-center mb-2">
              {t('paymentFailed')}
            </p>
            {errorMessage && (
              <p className="text-sm text-gray-700 text-center mb-2">{errorMessage}</p>
            )}
            <p className="text-sm text-green-600 text-center mb-6">
              {t('youWereNotCharged')}
            </p>

            <button
              onClick={onRetry}
              className="w-full px-5 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors mb-3"
            >
              {t('tryAgain')}
            </button>

            <button
              onClick={onChangeMethod}
              className="w-full px-5 py-2 text-[#171717] underline font-medium"
            >
              {t('useDifferentMethod')}
            </button>
          </>
        );

      case 'timeout':
        return (
          <>
            <div className="flex items-center justify-center mb-4">
              <WarningCircle className="w-16 h-16 text-yellow-500" />
            </div>
            <p className="text-xl font-semibold text-gray-900 text-center mb-2">
              {t('takingLongerThanUsual')}
            </p>
            <p className="text-sm text-gray-600 text-center mb-6">
              {t('didntReceivePrompt')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
              >
                <Refresh className="w-4 h-4" />
                {t('resend')}
              </button>
            </div>

            <button
              onClick={onChangeMethod}
              className="w-full mt-3 px-5 py-2 text-[#171717] underline font-medium"
            >
              {t('useDifferentMethod')}
            </button>
          </>
        );

      default:
        return null;
    }
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[10000]"
        onClick={() => status !== 'initiating' && status !== 'waiting' && onCancel()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
        <div
          className="bg-white rounded shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-prompt-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
                <Image
                  src={getProviderIconPath(providerInfo.icon)}
                  alt={providerInfo.name}
                  width={32}
                  height={32}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('payWith')}</p>
                <p className="font-medium text-gray-900">{providerInfo.name}</p>
              </div>
            </div>
            {(status === 'failed' || status === 'timeout') && (
              <button
                onClick={onCancel}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                aria-label={t('cancel')}
              >
                <Xmark className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Amount */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <p className="text-3xl font-bold text-center text-gray-900">
              {formatAmount(amount, currencySymbol)}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-6">{renderContent()}</div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default MobileMoneyPrompt;
