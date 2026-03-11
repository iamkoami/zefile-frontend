'use client';

import { Check } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import {
  SubscriptionTier,
  BillingPeriod,
  formatSubscriptionPrice,
  getTierLimits,
  getTierPriceMinorUnits,
} from '@/services/subscription-api';

interface PlanCardProps {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  countryCode: string;
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function PlanCard({
  tier,
  billingPeriod,
  countryCode,
  isCurrent,
  isPopular = false,
  onSelect,
  disabled = false,
}: PlanCardProps) {
  const t = useTranslations('subscription');
  const limits = getTierLimits(tier);
  const priceMinorUnits = getTierPriceMinorUnits(tier, billingPeriod, countryCode);

  const pricing = {
    NG: { currency: 'NGN', symbol: '₦' },
    GH: { currency: 'GHS', symbol: 'GH₵' },
    KE: { currency: 'KES', symbol: 'KSh' },
    CI: { currency: 'XOF', symbol: '' },
    DEFAULT: { currency: 'USD', symbol: '$' },
  };

  const currencyInfo = pricing[countryCode as keyof typeof pricing] || pricing.DEFAULT;
  const displayPrice = formatSubscriptionPrice(priceMinorUnits, currencyInfo.currency);

  const tierNames: Record<SubscriptionTier, string> = {
    free: t('tierFree'),
    starter: t('tierStarter'),
    pro: t('tierPro'),
  };

  const tierDescriptions: Record<SubscriptionTier, string> = {
    free: t('tierFreeDesc'),
    starter: t('tierStarterDesc'),
    pro: t('tierProDesc'),
  };

  // Define features per tier with section headers
  const getFeaturesConfig = (tierType: SubscriptionTier) => {
    const freeFeatures = [
      { key: 'storage', value: `${getTierLimits('free').storagePerTransferGB}GB ${t('perTransfer')}` },
      { key: 'expiry', value: `${getTierLimits('free').expiryDays} ${t('daysExpiry')}` },
      { key: 'versions', value: `${getTierLimits('free').maxVersions} ${t('versions')}` },
      { key: 'fee', value: `${getTierLimits('free').platformFeePercent}% ${t('platformFee')}` },
    ];

    if (tierType === 'free') {
      return {
        header: t('keyFeatures'),
        features: freeFeatures,
      };
    }

    if (tierType === 'starter') {
      return {
        header: t('everythingInFree'),
        features: [
          { key: 'storage', value: `${limits.storagePerTransferGB}GB ${t('perTransfer')}` },
          { key: 'expiry', value: `${limits.expiryDays} ${t('daysExpiry')}` },
          { key: 'versions', value: `${limits.maxVersions} ${t('versions')}` },
          { key: 'fee', value: `${limits.platformFeePercent}% ${t('platformFee')}` },
          { key: 'manualRegen', value: t('manualPreviewRegen') },
          { key: 'wallpaper', value: t('customWallpaper') },
          { key: 'branding', value: t('customBranding') },
        ],
      };
    }

    // Pro tier
    return {
      header: t('everythingInStarter'),
      features: [
        { key: 'storage', value: `${limits.storagePerTransferGB}GB ${t('perTransfer')}` },
        { key: 'expiry', value: `${limits.expiryDays} ${t('daysExpiry')}` },
        { key: 'versions', value: `${limits.maxVersions} ${t('versions')}` },
        { key: 'fee', value: `${limits.platformFeePercent}% ${t('platformFee')}` },
        { key: 'manualRegen', value: t('manualPreviewRegen') },
        { key: 'wallpaper', value: t('customWallpaper') },
        { key: 'branding', value: t('customBranding') },
        { key: 'customDomain', value: t('customDomain') },
        { key: 'unlimited', value: t('unlimitedTransfers') },
      ],
    };
  };

  const { header: featuresHeader, features } = getFeaturesConfig(tier);

  // Determine card styling based on tier and state
  const isPro = tier === 'pro';
  const cardBgClass = isPro && !isCurrent ? 'bg-[#5E53E0]' : 'bg-white';
  const textColorClass = isPro && !isCurrent ? 'text-white' : 'text-[#171717]';
  const subtextColorClass = isPro && !isCurrent ? 'text-white/70' : 'text-gray-500';
  const featureTextClass = isPro && !isCurrent ? 'text-white/80' : 'text-gray-600';
  const checkColorClass = isPro && !isCurrent ? 'text-[#87E64B]' : 'text-[#87E64B]';
  const borderClass = isPro && !isCurrent
    ? 'border-transparent'
    : isPopular && !isCurrent
    ? 'border-2 border-[#171717]'
    : isCurrent
    ? 'border-2 border-[#87E64B]'
    : 'border border-gray-200';
  const featureBorderClass = isPro && !isCurrent ? 'border-white/20' : 'border-gray-100';

  // Button styling
  const getButtonClasses = () => {
    if (isCurrent) {
      return 'cursor-default bg-gray-100 text-gray-400';
    }
    if (isPro) {
      return 'bg-[#87E64B] text-[#171717] hover:bg-[#78d43f]';
    }
    if (tier === 'free' || tier === 'starter') {
      return 'border border-gray-300 bg-white text-[#171717] hover:bg-gray-50';
    }
    return 'bg-[#87E64B] text-[#171717] hover:bg-[#78d43f]';
  };

  // Button text
  const getButtonText = () => {
    if (isCurrent) return t('currentPlan');
    if (isPro) return t('tryFreeFor7Days');
    return t('getStarted');
  };

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl transition-all ${cardBgClass} ${borderClass} ${
        isPro && !isCurrent ? 'shadow-xl' : isPopular && !isCurrent ? 'shadow-lg' : ''
      }`}
    >
      {/* Recommended Badge - for Starter */}
      {isPopular && !isCurrent && !isPro && (
        <div className="absolute -top-3 left-4 rounded bg-[#171717] px-3 py-1 text-xs font-medium text-white">
          {t('recommended')}
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-4 rounded bg-[#87E64B] px-3 py-1 text-xs font-medium text-[#171717]">
          {t('currentPlan')}
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        {/* Tier Name & Description */}
        <h3 className={`text-lg font-bold ${textColorClass}`}>{tierNames[tier]}</h3>
        <p className={`mt-1 text-sm ${subtextColorClass}`}>{tierDescriptions[tier]}</p>

        {/* Price */}
        <div className="mt-5">
          {tier === 'free' ? (
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${textColorClass}`}>$0</span>
              <span className={`ml-1 ${subtextColorClass}`}>{t('freeForever')}</span>
            </div>
          ) : (
            <div className="flex items-baseline">
              <span className={`text-4xl font-bold ${textColorClass}`}>{displayPrice}</span>
              <span className={`ml-1 ${subtextColorClass}`}>
                /{billingPeriod === 'monthly' ? t('month') : t('year')}
              </span>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={onSelect}
          disabled={disabled || isCurrent}
          className={`mt-6 w-full rounded py-3 text-sm font-bold transition-colors ${getButtonClasses()} ${
            disabled ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {getButtonText()}
        </button>

        {/* Annual savings note */}
        {tier !== 'free' && billingPeriod === 'annual' && (
          <p className={`mt-2 text-center text-xs ${isPro && !isCurrent ? 'text-[#87E64B]' : 'text-green-600'}`}>
            {t('save2Months')}
          </p>
        )}
      </div>

      {/* Features Section */}
      <div className={`mt-auto border-t ${featureBorderClass} p-6`}>
        <p className={`text-sm font-medium ${textColorClass}`}>{featuresHeader}</p>
        <ul className="mt-4 space-y-3">
          {features.map((feature) => (
            <li key={feature.key} className="flex items-start gap-3">
              <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${checkColorClass}`} />
              <span className={`text-sm ${featureTextClass}`}>{feature.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
