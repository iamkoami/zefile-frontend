'use client';

import React from 'react';
import { Check, Xmark, WarningCircle, Clock } from 'iconoir-react';
import LoadingPanel from '@/components/LoadingPanel';
import { useTranslations } from 'next-intl';

export type PaymentCardStatus = 'success' | 'pending' | 'failed';

interface PaymentStatusCardProps {
  status: PaymentCardStatus;
  amount: number;
  currency: string;
  currencySymbol: string;
  paidAt?: string;
  failureReason?: string;
  onRetry?: () => void;
  onChangeMethod?: () => void;
  onDownload?: () => void;
  isDownloading?: boolean;
}

/**
 * PaymentStatusCard Component
 * Shows payment status with appropriate visual feedback
 */
export function PaymentStatusCard({
  status,
  amount,
  currency,
  currencySymbol,
  paidAt,
  failureReason,
  onRetry,
  onChangeMethod,
  onDownload,
  isDownloading = false,
}: PaymentStatusCardProps) {
  const t = useTranslations('payment');

  const formatAmount = (amt: number): string => {
    const majorUnits = amt / 100;
    if (currency === 'XOF') {
      return `${majorUnits.toLocaleString()} ${currencySymbol}`;
    }
    return `${currencySymbol}${majorUnits.toLocaleString()}`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (status === 'success') {
    return (
      <div className="bg-[#F0FDF4] border border-[#87E64B] rounded-lg p-6">
        {/* Success Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#87E64B] flex items-center justify-center">
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#171717]">
              {t('paymentSuccessful')}
            </h3>
            {paidAt && (
              <p className="text-sm text-gray-500">
                {t('paidOn')} {formatDate(paidAt)}
              </p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4 p-3 bg-white rounded border border-gray-100">
          <p className="text-sm text-gray-500">{t('amountPaid')}</p>
          <p className="text-xl font-bold text-[#171717]">{formatAmount(amount)}</p>
        </div>

        {/* Download Button */}
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="w-full py-3 px-6 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {t('downloadFiles')}
          </button>
        )}
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#171717]">
              {t('paymentPending')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('waitingForConfirmation')}
            </p>
          </div>
        </div>
        <div className="p-3 bg-white rounded border border-gray-100">
          <p className="text-sm text-gray-500">{t('amount')}</p>
          <p className="text-xl font-bold text-[#171717]">{formatAmount(amount)}</p>
        </div>
      </div>
    );
  }

  // Failed status
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      {/* Error Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
          <Xmark className="w-6 h-6 text-white" strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#171717]">
            {t('paymentFailed')}
          </h3>
          {failureReason && (
            <p className="text-sm text-red-600">{failureReason}</p>
          )}
        </div>
      </div>

      {/* NOT Charged Reassurance - Prominent */}
      <div className="mb-4 p-3 bg-white rounded border border-green-200 flex items-center gap-2">
        <WarningCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm font-medium text-green-700">
          {t('youWereNotCharged')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-3 px-6 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
          >
            {t('tryAgain')}
          </button>
        )}
        {onChangeMethod && (
          <button
            onClick={onChangeMethod}
            className="w-full py-3 px-6 border-2 border-gray-300 text-[#171717] font-bold rounded hover:bg-gray-50 transition-colors"
          >
            {t('useDifferentMethod')}
          </button>
        )}
      </div>
    </div>
  );
}

export default PaymentStatusCard;
