'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Xmark, CreditCard, SmartphoneDevice } from 'iconoir-react';
import {
  SubscriptionTier,
  BillingPeriod,
  formatSubscriptionPrice,
  getTierPriceMinorUnits,
  getNextBillingDate,
  getPricingForCountry,
} from '@/services/subscription-api';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  countryCode: string;
  onConfirm: (paymentMethod: 'card' | 'mobile_money') => Promise<void>;
}

export function UpgradeModal({
  isOpen,
  onClose,
  targetTier,
  billingPeriod,
  countryCode,
  onConfirm,
}: UpgradeModalProps) {
  const t = useTranslations('subscription');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile_money'>('mobile_money');

  if (!isOpen) return null;

  const priceMinorUnits = getTierPriceMinorUnits(targetTier, billingPeriod, countryCode);
  const pricing = getPricingForCountry(countryCode);
  const displayPrice = formatSubscriptionPrice(priceMinorUnits, pricing.currency);
  const nextBillingDate = getNextBillingDate(billingPeriod);

  const tierNames: Record<SubscriptionTier, string> = {
    free: t('tierFree'),
    starter: t('tierStarter'),
    pro: t('tierPro'),
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(selectedMethod);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#171717]">
            {t('upgradeTo', { tier: tierNames[targetTier] })}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Xmark className="h-5 w-5" />
          </button>
        </div>

        {/* Billing Summary */}
        <div className="mt-6 rounded bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-600">{t('billingSummary')}</h3>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{tierNames[targetTier]}</span>
              <span className="font-medium text-[#171717]">{displayPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('billingCycle')}</span>
              <span className="font-medium text-[#171717]">
                {billingPeriod === 'monthly' ? t('monthly') : t('annual')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('firstCharge')}</span>
              <span className="font-medium text-[#171717]">{t('today')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{t('nextBillingDate')}</span>
              <span className="font-medium text-[#171717]">
                {nextBillingDate.toLocaleDateString()}
              </span>
            </div>
          </div>

          {billingPeriod === 'annual' && (
            <div className="mt-3 rounded bg-green-100 px-3 py-2 text-center text-sm text-green-700">
              {t('annualSavings')}
            </div>
          )}
        </div>

        {/* Payment Method Selection */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-600">{t('paymentMethod')}</h3>
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setSelectedMethod('mobile_money')}
              disabled={isLoading}
              className={`flex w-full items-center gap-3 rounded border-2 p-3 transition-colors ${
                selectedMethod === 'mobile_money'
                  ? 'border-[#5E53E0] bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <SmartphoneDevice className="h-5 w-5 text-[#5E53E0]" />
              <div className="text-left">
                <div className="font-medium text-[#171717]">{t('mobileMoney')}</div>
                <div className="text-xs text-gray-500">{t('mobileMoneyDesc')}</div>
              </div>
            </button>
            <button
              onClick={() => setSelectedMethod('card')}
              disabled={isLoading}
              className={`flex w-full items-center gap-3 rounded border-2 p-3 transition-colors ${
                selectedMethod === 'card'
                  ? 'border-[#5E53E0] bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className="h-5 w-5 text-[#5E53E0]" />
              <div className="text-left">
                <div className="font-medium text-[#171717]">{t('card')}</div>
                <div className="text-xs text-gray-500">{t('cardDesc')}</div>
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded border-2 border-gray-300 py-3 text-sm font-semibold text-[#171717] hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded bg-[#87E64B] py-3 text-sm font-semibold text-[#171717] hover:bg-[#78d43f]"
          >
            {isLoading ? t('processing') : t('confirmPayment')}
          </button>
        </div>

        {/* Terms */}
        <p className="mt-4 text-center text-xs text-gray-500">
          {t('subscriptionTerms')}
        </p>
      </div>
    </div>
  );
}
