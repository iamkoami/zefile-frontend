'use client';

import { useTranslations } from 'next-intl';
import { Xmark, WarningTriangle, ArrowUpRight } from 'iconoir-react';
import { SubscriptionTier, getTierLimits } from '@/services/subscription-api';

interface LimitExceededModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  currentUsageGB: number;
  limitGB: number;
  attemptedUploadGB: number;
  onUpgrade: () => void;
}

/**
 * Modal displayed when user attempts to upload files that exceed their tier's storage limit.
 * Shows current usage, limit, and prominent upgrade option.
 */
export function LimitExceededModal({
  isOpen,
  onClose,
  currentTier,
  currentUsageGB,
  limitGB,
  attemptedUploadGB,
  onUpgrade,
}: LimitExceededModalProps) {
  const t = useTranslations('subscription');

  if (!isOpen) return null;

  const nextTier = currentTier === 'free' ? 'starter' : currentTier === 'starter' ? 'pro' : null;
  const nextTierLimits = nextTier ? getTierLimits(nextTier) : null;

  const handleUpgrade = () => {
    onClose();
    onUpgrade();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-exceeded-title"
        className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('close')}
        >
          <Xmark className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <WarningTriangle className="h-8 w-8 text-amber-600" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="limit-exceeded-title"
          className="mb-2 text-center text-xl font-bold text-[#171717]"
        >
          {t('limitExceeded')}
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-gray-600">
          {t('limitExceededMessage', {
            limit: limitGB,
            tierName: currentTier.charAt(0).toUpperCase() + currentTier.slice(1),
          })}
        </p>

        {/* Usage breakdown */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('currentUsage')}</span>
            <span className="font-bold text-[#171717]">
              {currentUsageGB.toFixed(2)} GB
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('yourLimit')}</span>
            <span className="font-bold text-[#171717]">{limitGB} GB</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('attemptedUpload')}</span>
            <span className="font-bold text-red-600">
              +{attemptedUploadGB.toFixed(2)} GB
            </span>
          </div>
        </div>

        {/* Next tier suggestion */}
        {nextTier && nextTierLimits && (
          <div className="mb-6 rounded-lg border border-[#87E64B] bg-green-50 p-4">
            <p className="text-sm font-medium text-[#171717]">
              {t('upgradeToTier', {
                tierName: nextTier.charAt(0).toUpperCase() + nextTier.slice(1),
              })}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {t('getTierStorage', { storage: nextTierLimits.storagePerTransferGB })}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-[#171717] hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          {nextTier && (
            <button
              onClick={handleUpgrade}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-[#87E64B] px-4 py-3 text-sm font-bold text-[#171717] hover:bg-[#78d43f]"
            >
              {t('upgrade')}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
