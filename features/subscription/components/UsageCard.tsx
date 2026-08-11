'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toIntlLocale } from '@/lib/locale';
import { ArrowUpRight } from 'iconoir-react';
import { SubscriptionTier, getTierLimits } from '@/services/subscription-api';

interface UsageCardProps {
  storageUsedBytes: number;
  tier: SubscriptionTier;
  transfersThisMonth: number;
  resetDate?: string;
  onUpgrade?: () => void;
}

export function UsageCard({
  storageUsedBytes,
  tier,
  transfersThisMonth,
  resetDate,
  onUpgrade,
}: UsageCardProps) {
  const t = useTranslations('subscription');
  const locale = useLocale();
  const limits = getTierLimits(tier);

  // Convert bytes to GB
  const storageUsedGB = storageUsedBytes / (1024 * 1024 * 1024);
  const storageLimitGB = limits.storagePerTransferGB;
  const storagePercentage = Math.min((storageUsedGB / storageLimitGB) * 100, 100);

  // Transfer limit
  const transferLimit = limits.transfersPerMonth;
  const transferPercentage = transferLimit === -1
    ? 0
    : Math.min((transfersThisMonth / transferLimit) * 100, 100);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-[#87E64B]';
  };

  const showUpgradePrompt = storagePercentage >= 90 || (transferLimit !== -1 && transferPercentage >= 90);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(toIntlLocale(locale), {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#171717]">{t('usage')}</h3>
        {resetDate && (
          <span className="text-sm text-gray-500">
            {t('resetsOn', { date: formatDate(resetDate) })}
          </span>
        )}
      </div>

      {/* Storage Usage */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('storageUsed')}</span>
          <span className="font-medium text-[#171717]">
            {storageUsedGB.toFixed(2)} GB / {storageLimitGB} GB
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full transition-all ${getProgressColor(storagePercentage)}`}
            style={{ width: `${storagePercentage}%` }}
          />
        </div>
      </div>

      {/* Transfers This Month */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('transfersThisMonth')}</span>
          <span className="font-medium text-[#171717]">
            {transfersThisMonth}
            {transferLimit !== -1 ? ` / ${transferLimit}` : ` (${t('unlimited')})`}
          </span>
        </div>
        {transferLimit !== -1 && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full transition-all ${getProgressColor(transferPercentage)}`}
              style={{ width: `${transferPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Platform Fee */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-600">{t('platformFee')}</span>
        <span className="font-medium text-[#171717]">
          {limits.platformFeePercent}%
        </span>
      </div>

      {/* Upgrade Prompt */}
      {showUpgradePrompt && tier !== 'pro' && onUpgrade && (
        <div className="mt-6 rounded bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            {t('approachingLimit')}
          </p>
          <button
            onClick={onUpgrade}
            className="mt-2 flex items-center gap-1 text-sm font-bold text-[#171717] underline"
          >
            {t('upgradeNow')}
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Tier Badge */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
        <span className="text-sm text-gray-500">{t('currentPlan')}</span>
        <span className="rounded bg-gray-100 px-3 py-1 text-sm font-medium capitalize text-[#171717]">
          {tier}
        </span>
      </div>
    </div>
  );
}
