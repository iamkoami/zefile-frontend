'use client';

import { Check, Xmark } from 'iconoir-react';
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
  ];

  const renderValue = (value: string | number | boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="mx-auto h-5 w-5 text-[#87E64B]" />
      ) : (
        <Xmark className="mx-auto h-5 w-5 text-gray-300" />
      );
    }
    return <span className="text-[#171717]">{value}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-4 text-left text-sm font-semibold text-gray-600">
              {t('feature')}
            </th>
            {tiers.map((tier) => (
              <th
                key={tier}
                className={`py-4 text-center text-sm font-semibold ${
                  tier === currentTier ? 'text-[#87E64B]' : 'text-[#171717]'
                }`}
              >
                {tierNames[tier]}
                {tier === currentTier && (
                  <span className="ml-2 rounded bg-[#87E64B] px-2 py-0.5 text-xs text-[#171717]">
                    {t('current')}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <tr
              key={feature.key}
              className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
            >
              <td className="py-4 text-sm text-gray-600">{feature.label}</td>
              {tiers.map((tier) => (
                <td key={tier} className="py-4 text-center text-sm">
                  {renderValue(feature.getValue(tier))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
