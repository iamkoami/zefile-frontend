'use client';

import { Check } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import {
  SubscriptionTier,
  BillingPeriod,
  formatSubscriptionPrice,
  getTierLimits,
  getTierPriceMinorUnits,
  getPricingForCountry,
} from '@/services/subscription-api';

interface TierDetailsSummaryProps {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  countryCode: string;
}

/**
 * TierDetailsSummary - Displays selected tier features alongside checkout steps
 * Shows storage, expiry, versions, platform fee, and pricing
 */
export function TierDetailsSummary({
  tier,
  billingPeriod,
  countryCode,
}: TierDetailsSummaryProps) {
  const t = useTranslations('subscriptions');
  const tSub = useTranslations('subscription');

  const limits = getTierLimits(tier);
  const pricing = getPricingForCountry(countryCode);
  const priceMinorUnits = getTierPriceMinorUnits(tier, billingPeriod, countryCode);
  const displayPrice = formatSubscriptionPrice(priceMinorUnits, pricing.currency);

  // Pro tier styling (matches PlanCard)
  const isPro = tier === 'pro';
  const containerClass = isPro ? 'bg-[#5E53E0] shadow-xl' : 'bg-gray-50';
  const titleClass = isPro ? 'text-white' : 'text-[#171717]';
  const subtextClass = isPro ? 'text-white/70' : 'text-gray-500';
  const borderClass = isPro ? 'border-white/20' : 'border-gray-200';
  const featureLabelClass = isPro ? 'text-white/80' : 'text-gray-600';
  const featureValueClass = isPro ? 'text-white' : 'text-[#171717]';
  const headerClass = isPro ? 'text-white' : 'text-gray-700';

  const getTierName = () => {
    return t(`tiers.${tier}.name`);
  };

  const getTierDescription = () => {
    return t(`tiers.${tier}.description`);
  };

  // Features to display with their values
  const features = [
    {
      label: tSub('featureStorage'),
      value: `${limits.storagePerTransferGB}GB`,
    },
    {
      label: tSub('featureExpiry'),
      value: `${limits.expiryDays} ${tSub('daysExpiry')}`,
    },
    {
      label: tSub('featureVersions'),
      value: limits.maxVersions === -1 ? tSub('unlimited') : `${limits.maxVersions}`,
    },
    {
      label: tSub('featureFee'),
      value: `${limits.platformFeePercent}%`,
    },
  ];

  // Only add manual preview regen for paid tiers
  if (tier !== 'free' && limits.manualPreviewRegen) {
    features.push({
      label: tSub('featureManualRegen'),
      value: '✓',
    });
  }

  return (
    <div className={`${containerClass} rounded-xl p-6 h-fit sticky top-6`}>
      {/* Tier Header */}
      <div className="mb-6">
        <h3 className={`text-xl font-bold ${titleClass}`}>{getTierName()}</h3>
        <p className={`text-sm ${subtextClass} mt-1`}>{getTierDescription()}</p>
      </div>

      {/* Price Display */}
      <div className={`mb-6 pb-6 border-b ${borderClass}`}>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${titleClass}`}>{displayPrice}</span>
          <span className={subtextClass}>
            /{billingPeriod === 'monthly' ? tSub('month') : tSub('year')}
          </span>
        </div>
        <p className={`text-sm ${subtextClass} mt-1`}>
          {billingPeriod === 'annual' ? t('billedAnnually') : t('billedMonthly')}
        </p>
        {billingPeriod === 'annual' && (
          <p className="text-sm text-[#87E64B] font-medium mt-2">
            {tSub('save2Months')}
          </p>
        )}
      </div>

      {/* Features List */}
      <div>
        <p className={`text-sm font-medium ${headerClass} mb-3`}>{tSub('keyFeatures')}</p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center justify-between text-sm">
              <span className={`${featureLabelClass} flex items-center gap-2`}>
                <Check className="w-4 h-4 text-[#87E64B] flex-shrink-0" />
                {feature.label}
              </span>
              <span className={`font-medium ${featureValueClass}`}>{feature.value}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Unlimited transfers note for Pro */}
      {tier === 'pro' && (
        <div className={`mt-4 pt-4 border-t ${borderClass}`}>
          <div className="flex items-center gap-2 text-sm text-[#87E64B]">
            <Check className="w-4 h-4" />
            <span className="font-medium">{tSub('unlimitedTransfers')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TierDetailsSummary;
