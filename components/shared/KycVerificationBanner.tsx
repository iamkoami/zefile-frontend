'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { WarningCircle, Shield } from 'iconoir-react';
import { kycApi, KycStatusResponse } from '@/services/kyc-api';

/** Payout-gate block reason, as returned by `GET /withdrawals/balance` (Story 137.3). */
export type PayoutBlockCode =
  | 'PAYOUT_KYC_REQUIRED'
  | 'PAYOUT_KYC_PENDING'
  | 'PAYOUT_KYC_REJECTED';

interface KycVerificationBannerProps {
  /** Size variant */
  variant?: 'banner' | 'compact' | 'inline';
  /** Additional class names */
  className?: string;
  /** Callback when verify button is clicked */
  onVerify?: () => void;
  /**
   * Story 137.3. When set, the banner renders from this **authoritative** payout-gate decision
   * and does not fetch `/kyc/status` itself.
   *
   * Why this exists: the payout gate can refuse while a plain KYC-status read looks clean — most
   * importantly on its fail-closed path, where the gate blocks precisely because the status lookup
   * failed. Left to its own fetch, the banner would then render nothing at the exact moment a
   * creator most needs to know why a payout will not go through. Passing the code the balance
   * response already carries keeps this component and the server-side gate in agreement.
   */
  payoutBlockCode?: PayoutBlockCode;
  /** Verification deadline that came with the gate decision, if one is recorded. */
  gracePeriodEnds?: string;
  /**
   * Extra reassurance rendered under the description — used to state that the balance is
   * untouched (PK-FR4), which is the one thing this component never said on its own.
   */
  footnote?: string;
}

/**
 * KycVerificationBanner - Shows KYC verification requirement notification
 *
 * Story 4-1: KYC Threshold Detection - Dashboard Banner
 * Story 137.3: optionally driven by the payout gate instead of its own fetch (see
 * `payoutBlockCode`), so the payout-blocked surfaces reuse this component rather than
 * reimplementing it.
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
  payoutBlockCode,
  gracePeriodEnds,
  footnote,
}: KycVerificationBannerProps) {
  const t = useTranslations('kyc');
  const [kycStatus, setKycStatus] = useState<KycStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Driven by the caller's gate decision: skip the fetch entirely rather than firing a request
  // whose answer would be discarded.
  const isGateDriven = payoutBlockCode !== undefined;

  useEffect(() => {
    if (isGateDriven) {
      setIsLoading(false);
      return;
    }

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
  }, [isGateDriven]);

  // Don't render if loading or KYC not required. Skipped when gate-driven: the caller has already
  // established that a payout is blocked, and that decision outranks a status read.
  if (
    !isGateDriven &&
    (isLoading ||
      !kycStatus ||
      kycStatus.status === 'not_required' ||
      kycStatus.status === 'verified')
  ) {
    return null;
  }

  const isPending = isGateDriven
    ? payoutBlockCode === 'PAYOUT_KYC_PENDING'
    : kycStatus!.status === 'pending';
  const isRejected = isGateDriven
    ? payoutBlockCode === 'PAYOUT_KYC_REJECTED'
    : kycStatus!.status === 'rejected';
  // A gate block on REQUIRED means the grace period is over (or was never recorded) — that is the
  // only way the gate refuses REQUIRED at all.
  const isExpired = isGateDriven
    ? payoutBlockCode === 'PAYOUT_KYC_REQUIRED'
    : kycStatus!.isGracePeriodExpired;
  const isUrgent = isGateDriven
    ? payoutBlockCode === 'PAYOUT_KYC_REQUIRED'
    : kycStatus!.daysRemaining !== undefined && kycStatus!.daysRemaining <= 2;

  /**
   * Visual severity, deliberately decoupled from the copy flags above.
   *
   * `isExpired` is factually true for a gate-driven REQUIRED block — that is the only way the gate
   * refuses REQUIRED — and it selects the right *wording*. But it must not also select red-alert
   * *styling*: REQUIRED is the most common block, and a creator who simply crossed an earnings
   * threshold and needs to fill in a form has done nothing wrong. Red-alerting them is the
   * fear-based treatment the brand voice guide forbids.
   *
   *  - `info`  (blue)  — PENDING: we are reviewing, nothing for them to do
   *  - `warn`  (amber) — REQUIRED: action needed, calmly
   *  - `alert` (red)   — REJECTED: genuinely stuck, needs support
   *
   * Self-fetch mode keeps its original behaviour exactly (red once expired or ≤2 days remain), so
   * this change is scoped to the gate-driven path.
   */
  const severity: 'info' | 'warn' | 'alert' = isPending
    ? 'info'
    : isRejected
      ? 'alert'
      : isGateDriven
        ? 'warn'
        : isExpired || isUrgent
          ? 'alert'
          : 'warn';

  // Get the appropriate icon
  const Icon = isPending ? Shield : WarningCircle;

  // Get deadline date string
  const effectiveGraceEnds = isGateDriven ? gracePeriodEnds : kycStatus!.gracePeriodEnds;
  const deadlineDate = effectiveGraceEnds
    ? new Date(effectiveGraceEnds).toLocaleDateString()
    : null;

  const daysRemaining = isGateDriven ? undefined : kycStatus!.daysRemaining;

  // Get status-specific message
  const getStatusMessage = () => {
    if (isPending) return t('pendingReview');
    if (isRejected) return t('rejectedResubmit');
    if (isExpired) return t('graceExpired');
    if (daysRemaining === 1) return t('oneDayRemaining');
    return t('daysRemaining', { days: daysRemaining ?? 0 });
  };

  // Get colors based on severity (see the `severity` note above)
  const getColors = () => {
    if (severity === 'info') {
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
    if (severity === 'alert') {
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

  /**
   * Title, description and CTA derived once and shared by all three variants.
   *
   * Previously each variant re-derived its own, and REJECTED was folded in with REQUIRED — so a
   * creator whose verification had been rejected was told to "verify" or "resubmit", walking
   * straight back into the flow that had just refused them. Deriving it here means the three
   * variants cannot drift apart again.
   */
  const title = isRejected
    ? t('payoutsBlockedRejectedTitle')
    : isPending
      ? t('verificationPending')
      : t('verificationRequired');

  const description = isRejected
    ? t('payoutsBlockedRejectedHint')
    : isPending
      ? t('pendingReviewDescription')
      : isExpired
        ? t('graceExpiredDescription')
        : t('verifyToReceivePayouts');

  /**
   * No CTA for PENDING (nothing for them to do but wait) or REJECTED (resubmitting is not the
   * next step — support is). Anything else gets the route into verification.
   */
  const showCta = !isPending && !isRejected && Boolean(onVerify);

  // Banner variant - full-width notification
  if (variant === 'banner') {
    return (
      <div className={`w-full px-4 py-3 ${colors.bannerBg} ${className}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 flex-shrink-0 text-white" />
            <div>
              <p className="text-sm font-medium text-white">{title}</p>
              {!isPending && (
                <p className="text-xs text-white/80">
                  {isRejected ? description : getStatusMessage()}
                  {deadlineDate && !isExpired && ` - ${t('deadline')}: ${deadlineDate}`}
                </p>
              )}
              {footnote && <p className="text-xs text-white/80">{footnote}</p>}
            </div>
          </div>

          {showCta && (
            <button
              onClick={onVerify}
              className="flex-shrink-0 rounded bg-white px-3 py-1.5 text-sm font-bold text-[#171717] hover:bg-gray-100"
            >
              {t('verifyNow')}
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
          {title}
          {!isPending && !isRejected && daysRemaining !== undefined && (
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
        <p className={`text-sm font-medium ${colors.title}`}>{title}</p>
        <p className={`text-xs ${colors.text}`}>{description}</p>
        {!isPending && !isExpired && daysRemaining !== undefined && (
          <p className={`mt-1 text-xs font-medium ${colors.text}`}>
            {getStatusMessage()}
            {deadlineDate && ` - ${t('deadline')}: ${deadlineDate}`}
          </p>
        )}
        {/* Caller-supplied reassurance, e.g. "your balance stays right where it is" (PK-FR4).
            Deliberately NOT `colors.text`: this line exists to calm someone down, and rendering
            it in the panel's alert colour fights the message it is carrying. Neutral grey in
            every state. */}
        {footnote && <p className="mt-1 text-xs text-gray-600">{footnote}</p>}
      </div>
      {showCta && (
        <button
          onClick={onVerify}
          className={`flex-shrink-0 rounded px-3 py-1.5 text-xs font-medium text-white ${colors.button}`}
        >
          {t('verify')}
        </button>
      )}
    </div>
  );
}

export default KycVerificationBanner;
