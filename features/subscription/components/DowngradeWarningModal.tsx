'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Xmark, WarningTriangle, NavArrowDown } from 'iconoir-react';
import { SubscriptionTier } from '@/services/subscription-api';

interface DowngradeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  targetTier: SubscriptionTier;
  effectiveDate: Date;
  featureLosses: string[];
  onConfirm: () => Promise<void>;
}

/**
 * Modal shown when user attempts to downgrade their subscription.
 * Lists feature losses and requires confirmation.
 */
export function DowngradeWarningModal({
  isOpen,
  onClose,
  currentTier,
  targetTier,
  effectiveDate,
  featureLosses,
  onConfirm,
}: DowngradeWarningModalProps) {
  const t = useTranslations('subscription');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Failed to schedule downgrade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tierLabel = (tier: SubscriptionTier) =>
    tier.charAt(0).toUpperCase() + tier.slice(1);

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
        aria-labelledby="downgrade-warning-title"
        className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
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
          id="downgrade-warning-title"
          className="mb-2 text-center text-xl font-bold text-[#171717]"
        >
          {t('confirmDowngrade')}
        </h2>

        {/* Tier change info */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="rounded-full bg-[#5E53E0] px-3 py-1 text-sm font-medium text-white">
            {tierLabel(currentTier)}
          </span>
          <NavArrowDown className="h-4 w-4 rotate-[-90deg] text-gray-400" />
          <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-[#171717]">
            {tierLabel(targetTier)}
          </span>
        </div>

        {/* Effective date */}
        <p className="mb-4 text-center text-sm text-gray-600">
          {t('downgradeEffectiveDate', { date: formatDate(effectiveDate) })}
        </p>

        {/* Feature losses */}
        {featureLosses.length > 0 && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="mb-2 text-sm font-bold text-red-800">
              {t('youWillLose')}
            </p>
            <ul className="space-y-1">
              {featureLosses.map((loss, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                  {loss}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Note about existing transfers */}
        <p className="mb-6 text-center text-xs text-gray-500">
          {t('existingTransfersStay')}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-[#171717] hover:bg-gray-50 disabled:opacity-50"
          >
            {t('keepPlan')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? t('processing') : t('confirmDowngradeBtn')}
          </button>
        </div>
      </div>
    </>
  );
}
