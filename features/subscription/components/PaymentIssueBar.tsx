'use client';

import { useTranslations } from 'next-intl';
import { WarningCircle, Xmark } from 'iconoir-react';
import Link from 'next/link';

interface PaymentIssueBarProps {
  daysRemaining: number;
  onDismiss?: () => void;
}

/**
 * Banner displayed when user has a payment failure and is in grace period.
 * Shows urgency message with link to billing settings.
 */
export function PaymentIssueBar({ daysRemaining, onDismiss }: PaymentIssueBarProps) {
  const t = useTranslations('subscription');

  const isUrgent = daysRemaining <= 2;

  return (
    <div
      className={`w-full px-4 py-3 ${
        isUrgent ? 'bg-red-600' : 'bg-amber-500'
      }`}
      role="alert"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <WarningCircle className="h-5 w-5 flex-shrink-0 text-white" />
          <p className="text-sm font-medium text-white">
            {isUrgent
              ? t('paymentFailedUrgent', { days: daysRemaining })
              : t('paymentFailed', { days: daysRemaining })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/account-settings?tab=billing"
            className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-[#171717] hover:bg-gray-100"
          >
            {t('updatePayment')}
          </Link>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
              aria-label={t('dismiss')}
            >
              <Xmark className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
