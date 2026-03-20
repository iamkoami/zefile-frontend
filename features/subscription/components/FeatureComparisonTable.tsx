'use client';

import { Fragment } from 'react';
import { Check } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import { type SubscriptionTier } from '@/services/subscription-api';
import { useTierLimits } from '@/hooks/useTierLimits';

interface FeatureComparisonTableProps {
  currentTier?: SubscriptionTier;
}

export function FeatureComparisonTable({ currentTier }: FeatureComparisonTableProps) {
  const t = useTranslations('subscription');
  const { tierLimits } = useTierLimits();

  const tiers: SubscriptionTier[] = ['free', 'starter', 'pro'];

  const tierNames: Record<SubscriptionTier, string> = {
    free: t('tierFree'),
    starter: t('tierStarter'),
    pro: t('tierPro'),
  };

  const features = [
    {
      key: 'storage',
      label: t('featureStorage'),
      getValue: (tier: SubscriptionTier) => `${tierLimits[tier].storagePerTransferGB}GB`,
    },
    {
      key: 'versions',
      label: t('featureVersions'),
      getValue: (tier: SubscriptionTier) =>
        tierLimits[tier].maxVersions === -1 ? t('unlimited') : tierLimits[tier].maxVersions.toString(),
    },
    {
      key: 'expiry',
      label: t('featureExpiry'),
      getValue: (tier: SubscriptionTier) => `${tierLimits[tier].expiryDays} ${t('days')}`,
    },
    {
      key: 'platformFee',
      label: t('featurePlatformFee'),
      getValue: (tier: SubscriptionTier) => `${tierLimits[tier].platformFeePercent}%`,
    },
    {
      key: 'manualRegen',
      label: t('featureManualRegen'),
      getValue: (tier: SubscriptionTier) => tierLimits[tier].manualPreviewRegen,
    },
    {
      key: 'customBranding',
      label: t('featureCustomBranding'),
      getValue: (tier: SubscriptionTier) => tierLimits[tier].customBranding,
    },
    {
      key: 'customDomain',
      label: t('featureCustomDomain'),
      getValue: (tier: SubscriptionTier) => tierLimits[tier].customDomain,
    },
  ];

  const renderValue = (value: string | number | boolean, isPro: boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#87E64B]/20">
          <Check className="h-3.5 w-3.5 text-[#87E64B]" />
        </div>
      ) : (
        <span className="text-gray-300 dark:text-gray-600 text-sm">--</span>
      );
    }
    return (
      <span className={`text-sm font-bold ${isPro ? 'text-[#5E53E0]' : 'text-[#171717] dark:text-white'}`}>
        {value}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] min-w-[640px]">
        {/* Header Row */}
        <div className="px-6 py-5 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-border">
          {t('feature')}
        </div>
        {tiers.map((tier) => {
          const isPro = tier === 'pro';
          const isCurrent = tier === currentTier;

          return (
            <div
              key={tier}
              className={`px-6 py-5 text-center text-sm font-bold border-b ${
                isPro
                  ? 'bg-[#5E53E0] text-white border-[#5E53E0]'
                  : 'text-[#171717] dark:text-white border-gray-200 dark:border-border'
              }`}
            >
              {tierNames[tier]}
              {isCurrent && (
                <span
                  className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    isPro
                      ? 'bg-white/20 text-white'
                      : 'bg-[#87E64B] text-[#171717]'
                  }`}
                >
                  {t('current')}
                </span>
              )}
            </div>
          );
        })}

        {/* Feature Rows */}
        {features.map((feature, index) => {
          const isLast = index === features.length - 1;
          const borderClass = isLast ? '' : 'border-b border-gray-100 dark:border-border';

          return (
            <Fragment key={feature.key}>
              {/* Feature label */}
              <div
                className={`px-6 py-5 text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center sticky left-0 bg-white dark:bg-card z-10 ${borderClass}`}
              >
                {feature.label}
              </div>

              {/* Tier values */}
              {tiers.map((tier) => {
                const isPro = tier === 'pro';

                return (
                  <div
                    key={`${feature.key}-${tier}`}
                    className={`px-6 py-5 flex items-center justify-center ${borderClass} ${
                      isPro ? 'bg-[#5E53E0]/[0.04]' : ''
                    }`}
                  >
                    {renderValue(feature.getValue(tier), isPro)}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
