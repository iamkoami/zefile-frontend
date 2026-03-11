'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { WarningCircle, Shield } from 'iconoir-react';
import { kycApi, KycStatusResponse } from '@/services/kyc-api';

interface KycVerificationBannerProps {
  /** Size variant */
  variant?: 'banner' | 'compact' | 'inline';
  /** Additional class names */
  className?: string;
  /** Callback when verify button is clicked */
  onVerify?: () => void;
}

/**
 * KycVerificationBanner - Shows KYC verification requirement notification
 *
 * Story 4-1: KYC Threshold Detection - Dashboard Banner
 *
 * Variants:
 * - banner: Full-width banner for prominent display at top of page
 * - compact: Card-style for side panels
 * - inline: Minimal inline notice
 */
export function KycVerificationBanner({
  variant = 'compact',
  className = '',
  onVerify,
}: KycVerificationBannerProps) {
  const t = useTranslations('kyc');
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKycStatus = async () => {
      try {
        const response = await kycApi.getKycStatus();
        if (response.data) {
          setKycStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch KYC status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKycStatus();
  }, []);

  // Don't render if loading or KYC not required
  if (isLoading || !kycStatus || kycStatus.status === 'not_required' || kycStatus.status === 'verified') {
    return null;
  }

  const isUrgent = kycStatus.daysRemaining !== undefined && kycStatus.daysRemaining <= 2;
  const isExpired = kycStatus.isGracePeriodExpired;
  const isPending = kycStatus.status === 'pending';
  const isRejected = kycStatus.status === 'rejected';

  // Get the appropriate icon
  const Icon = isPending ? Shield : WarningCircle;

  // Get deadline date string
  const deadlineDate = kycStatus.gracePeriodEnds
    ? new Date(kycStatus.gracePeriodEnds).toLocaleDateString()
    : null;

  // Get status-specific message
  const getStatusMessage = () => {
    if (isPending) return t('pendingReview');
    if (isRejected) return t('rejectedResubmit');
    if (isExpired) return t('graceExpired');
    if (kycStatus.daysRemaining === 1) return t('oneDayRemaining');
    return t('daysRemaining', { days: kycStatus.daysRemaining ?? 0 });
  };

  // Get colors based on status
  const getColors = () => {
    if (isPending) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        iconBg: 'bg-blue-100',
        title: 'text-blue-800',
        text: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        bannerBg: 'bg-blue-600',
      };
    }
    if (isExpired || isUrgent) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        iconBg: 'bg-red-100',
        title: 'text-red-800',
        text: 'text-red-600',
        button: 'bg-red-600 hover:bg-red-700',
        bannerBg: 'bg-red-600',
      };
    }
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100',
      title: 'text-amber-800',
      text: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700',
      bannerBg: 'bg-amber-500',
    };
  };

  const colors = getColors();

  // Banner variant - full-width notification
  if (variant === 'banner') {
    return (
      <div className={`w-full px-4 py-3 ${colors.bannerBg} ${className}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0 text-white" />
            <div>
              <p className="text-sm font-medium text-white">
                {isPending ? t('verificationPending') : t('verificationRequired')}
              </p>
              {!isPending && (
                <p className="text-xs text-white/80">
                  {getStatusMessage()}
                  {deadlineDate && !isExpired && ` - ${t('deadline')}: ${deadlineDate}`}
                </p>
              )}
            </div>
          </div>

          {!isPending && onVerify && (
            <button
              onClick={onVerify}
              className="rounded bg-white px-3 py-1.5 text-sm font-bold text-[#171717] hover:bg-gray-100"
            >
              {isRejected ? t('resubmit') : t('verifyNow')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant - minimal text notice
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Icon className={`h-4 w-4 ${colors.icon}`} />
        <span className={colors.text}>
          {isPending ? t('verificationPending') : t('verificationRequired')}
          {!isPending && kycStatus.daysRemaining !== undefined && (
            <>
              {' - '}
              {getStatusMessage()}
            </>
          )}
        </span>
      </div>
    );
  }

  // Compact variant - card style for panels
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${colors.bg} ${colors.border} ${className}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${colors.iconBg}`}
      >
        <Icon className={`h-5 w-5 ${colors.icon}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${colors.title}`}>
          {isPending ? t('verificationPending') : t('verificationRequired')}
        </p>
        <p className={`text-xs ${colors.text}`}>
          {isPending
            ? t('pendingReviewDescription')
            : isExpired
            ? t('graceExpiredDescription')
            : t('verifyToReceivePayouts')}
        </p>
        {!isPending && !isExpired && kycStatus.daysRemaining !== undefined && (
          <p className={`mt-1 text-xs font-medium ${colors.text}`}>
            {getStatusMessage()}
            {deadlineDate && ` - ${t('deadline')}: ${deadlineDate}`}
          </p>
        )}
      </div>
      {!isPending && onVerify && (
        <button
          onClick={onVerify}
          className={`rounded px-3 py-1.5 text-xs font-medium text-white ${colors.button}`}
        >
          {isRejected ? t('resubmit') : t('verify')}
        </button>
      )}
    </div>
  );
}

export default KycVerificationBanner;
