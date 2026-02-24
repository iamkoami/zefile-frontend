'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Footer from '@/components/shared/Footer';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import { safePaymentRedirect } from '@/utils/security';
import { toast } from '@/components/shared/Toast';
import {
  PlanCard,
  FeatureComparisonTable,
  BillingPeriodToggle,
  UpgradeModal,
} from '@/features/subscription/components';
import {
  SubscriptionTier,
  BillingPeriod,
  getStoredCountryCode,
  subscriptionApi,
} from '@/services/subscription-api';
import { trackPricingViewed } from '@/lib/posthog';

export default function PricingPage() {
  const t = useTranslations('subscription');
  const router = useRouter();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [countryCode, setCountryCode] = useState<string>('DEFAULT');
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('starter');

  useEffect(() => {
    const initPage = async () => {
      // Get stored country code
      const storedCountry = getStoredCountryCode();
      setCountryCode(storedCountry);

      // Fetch current subscription
      try {
        const response = await subscriptionApi.getCurrentSubscription();
        if (response.data) {
          setCurrentTier(response.data.tier as SubscriptionTier);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }

      setIsLoading(false);
      trackPricingViewed();
    };

    initPage();
  }, []);

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier === currentTier) return;

    if (tier === 'free') {
      // Downgrade flow - navigate to billing settings
      router.push('/settings/billing');
      return;
    }

    setSelectedTier(tier);
    setUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async (paymentMethod: 'card' | 'mobile_money') => {
    try {
      const response = await subscriptionApi.initializeSubscription({
        tier: selectedTier,
        billingPeriod,
        customerEmail: '', // Will be filled from auth
        paymentMethod,
      });

      if (response.data?.authorizationUrl) {
        try {
          safePaymentRedirect(response.data.authorizationUrl);
        } catch {
          toast.error(t('paymentInitFailed') || 'Failed to redirect to payment provider.');
        }
      } else {
        toast.error(t('paymentInitFailed') || 'No authorization URL returned from payment provider.');
      }
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
      toast.error(t('paymentInitFailed') || 'Failed to initialize subscription payment.');
    }
  };

  const tiers: SubscriptionTier[] = ['free', 'starter', 'pro'];

  if (isLoading) {
    return <LoadingFullscreen />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] py-16">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#171717] sm:text-4xl">
            {t('pricingTitle')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-500">
            {t('pricingSubtitle')}
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="mt-8 flex justify-center">
          <BillingPeriodToggle value={billingPeriod} onChange={setBillingPeriod} />
        </div>

        {/* Plan Cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <PlanCard
              key={tier}
              tier={tier}
              billingPeriod={billingPeriod}
              countryCode={countryCode}
              isCurrent={tier === currentTier}
              isPopular={tier === 'starter'}
              onSelect={() => handleSelectTier(tier)}
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <h2 className="mb-6 text-center text-xl font-bold text-[#171717]">
            {t('compareFeatures')}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <FeatureComparisonTable currentTier={currentTier} />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="mb-8 text-center text-xl font-bold text-[#171717]">
            {t('faqTitle')}
          </h2>
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-[#171717]">{t('faqQ1')}</h3>
              <p className="mt-2 text-sm text-gray-600">{t('faqA1')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-[#171717]">{t('faqQ2')}</h3>
              <p className="mt-2 text-sm text-gray-600">{t('faqA2')}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-[#171717]">{t('faqQ3')}</h3>
              <p className="mt-2 text-sm text-gray-600">{t('faqA3')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        targetTier={selectedTier}
        billingPeriod={billingPeriod}
        countryCode={countryCode}
        onConfirm={handleConfirmUpgrade}
      />

      <Footer />
    </div>
  );
}
