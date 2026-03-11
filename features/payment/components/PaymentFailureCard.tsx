'use client';

import React from 'react';
import { Xmark, WarningCircle, CreditCard, Refresh } from 'iconoir-react';
import { useTranslations } from 'next-intl';

/**
 * Payment error codes from Paystack and their mapping
 */
export type PaymentErrorCode =
  | 'insufficient_funds'
  | 'card_declined'
  | 'expired_card'
  | 'invalid_card'
  | 'timeout'
  | 'cancelled'
  | 'abandoned'
  | 'bank_error'
  | 'network_error'
  | 'default';

interface PaymentFailureCardProps {
  errorCode?: PaymentErrorCode | string;
  amount: number;
  currency: string;
  currencySymbol: string;
  onRetry: () => void;
  onChangeMethod: () => void;
}

/**
 * PaymentFailureCard Component
 * Displays payment failure with clear error messaging and retry options
 */
export function PaymentFailureCard({
  errorCode = 'default',
  amount,
  currency,
  currencySymbol,
  onRetry,
  onChangeMethod,
}: PaymentFailureCardProps) {
  const t = useTranslations('payment');

  const formatAmount = (amt: number): string => {
    const majorUnits = amt / 100;
    if (currency === 'XOF') {
      return `${majorUnits.toLocaleString()} ${currencySymbol}`;
    }
    return `${currencySymbol}${majorUnits.toLocaleString()}`;
  };

  /**
   * Get user-friendly error message based on error code
   */
  const getErrorMessage = (): { title: string; description: string } => {
    const code = (errorCode || 'default').toLowerCase().replace(/-/g, '_');

    const errorMessages: Record<string, { titleKey: string; descKey: string }> = {
      insufficient_funds: {
        titleKey: 'errorInsufficientFunds',
        descKey: 'errorInsufficientFundsDesc',
      },
      card_declined: {
        titleKey: 'errorCardDeclined',
        descKey: 'errorCardDeclinedDesc',
      },
      expired_card: {
        titleKey: 'errorExpiredCard',
        descKey: 'errorExpiredCardDesc',
      },
      invalid_card: {
        titleKey: 'errorInvalidCard',
        descKey: 'errorInvalidCardDesc',
      },
      timeout: {
        titleKey: 'errorTimeout',
        descKey: 'errorTimeoutDesc',
      },
      cancelled: {
        titleKey: 'errorCancelled',
        descKey: 'errorCancelledDesc',
      },
      abandoned: {
        titleKey: 'errorAbandoned',
        descKey: 'errorAbandonedDesc',
      },
      bank_error: {
        titleKey: 'errorBankError',
        descKey: 'errorBankErrorDesc',
      },
      network_error: {
        titleKey: 'errorNetworkError',
        descKey: 'errorNetworkErrorDesc',
      },
      default: {
        titleKey: 'errorDefault',
        descKey: 'errorDefaultDesc',
      },
    };

    const mapping = errorMessages[code] || errorMessages.default;

    return {
      title: t(mapping.titleKey),
      description: t(mapping.descKey),
    };
  };

  const { title, description } = getErrorMessage();

  return (
    <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
      {/* Error Header */}
      <div className="bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
            <Xmark className="w-7 h-7 text-white" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#171717] mb-1">
              {title}
            </h3>
            <p className="text-gray-600">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* NOT Charged Reassurance - PROMINENT */}
      <div className="bg-green-50 border-y border-green-200 p-4">
        <div className="flex items-center gap-3">
          <WarningCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-base font-bold text-green-700">
              {t('youWereNotCharged')}
            </p>
            <p className="text-sm text-green-600">
              {t('noChargeExplanation')}
            </p>
          </div>
        </div>
      </div>

      {/* Amount Section */}
      <div className="p-6 border-b border-gray-100">
        <p className="text-sm text-gray-500 mb-1">{t('attemptedAmount')}</p>
        <p className="text-2xl font-bold text-[#171717]">{formatAmount(amount)}</p>
      </div>

      {/* Action Buttons */}
      <div className="p-6 space-y-3">
        <button
          onClick={onRetry}
          className="w-full py-3 px-6 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors flex items-center justify-center gap-2"
        >
          <Refresh className="w-5 h-5" />
          {t('tryAgain')}
        </button>
        <button
          onClick={onChangeMethod}
          className="w-full py-3 px-6 border-2 border-gray-300 text-[#171717] font-bold rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          {t('useDifferentMethod')}
        </button>
      </div>
    </div>
  );
}

export default PaymentFailureCard;
