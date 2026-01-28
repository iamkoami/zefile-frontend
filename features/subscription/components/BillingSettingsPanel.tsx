'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, SmartphoneDevice, Calendar, WarningCircle } from 'iconoir-react';
import LoadingPanel from '@/components/LoadingPanel';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ChurnSurveyModal from '@/components/shared/ChurnSurveyModal';
import {
  subscriptionApi,
  formatSubscriptionPrice,
  SubscriptionTier,
  BillingPeriod,
} from '@/services/subscription-api';
import { toast } from '@/components/shared/Toast';

interface BillingInfo {
  subscription: {
    tier: SubscriptionTier;
    billingPeriod: BillingPeriod;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  paymentMethod: {
    type: 'card' | 'mobile_money' | null;
    last4: string | null;
    brand: string | null;
  } | null;
  nextBillingDate: string | null;
  amount: number | null;
  currency: string | null;
}

interface ScheduledDowngrade {
  targetTier: SubscriptionTier;
  effectiveDate: string;
}

export function BillingSettingsPanel() {
  const t = useTranslations('billing');

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [scheduledDowngrade, setScheduledDowngrade] = useState<ScheduledDowngrade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCancellingDowngrade, setIsCancellingDowngrade] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChurnSurvey, setShowChurnSurvey] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCancelDowngradeModal, setShowCancelDowngradeModal] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      const [billingRes, downgradeRes] = await Promise.all([
        subscriptionApi.getBilling(),
        subscriptionApi.getScheduledDowngrade(),
      ]);

      if (billingRes.data) {
        setBilling(billingRes.data as BillingInfo);
      }

      if (downgradeRes.data) {
        setScheduledDowngrade(downgradeRes.data);
      }
    } catch (error) {
      toast.error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await subscriptionApi.cancelSubscription();
      if (response.data) {
        toast.success(t('cancelSuccess'));
        await fetchBillingData();
      } else {
        toast.error(t('cancelError'));
      }
    } catch (error) {
      toast.error(t('cancelError'));
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsResuming(true);
    try {
      const response = await subscriptionApi.resumeSubscription();
      if (response.data) {
        toast.success(t('resumeSuccess'));
        await fetchBillingData();
      } else {
        toast.error(t('resumeError'));
      }
    } catch (error) {
      toast.error(t('resumeError'));
    } finally {
      setIsResuming(false);
      setShowResumeModal(false);
    }
  };

  const handleCancelScheduledDowngrade = async () => {
    setIsCancellingDowngrade(true);
    try {
      const response = await subscriptionApi.cancelScheduledDowngrade();
      if (response.data?.success) {
        toast.success(t('downgradeCancel'));
        setScheduledDowngrade(null);
        await fetchBillingData();
      } else {
        toast.error(t('downgradeCancelError'));
      }
    } catch (error) {
      toast.error(t('downgradeCancelError'));
    } finally {
      setIsCancellingDowngrade(false);
      setShowCancelDowngradeModal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTierDisplayName = (tier: SubscriptionTier) => {
    const tierNames: Record<SubscriptionTier, string> = {
      free: t('tierFree'),
      starter: t('tierStarter'),
      pro: t('tierPro'),
    };
    return tierNames[tier] || tier;
  };

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  const subscription = billing?.subscription;
  const paymentMethod = billing?.paymentMethod;
  const isFreeUser = !subscription || subscription.tier === 'free';
  const isCancelled = subscription?.cancelAtPeriodEnd;

  return (
    <div className="space-y-6">
      {/* Current Plan Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-[#171717]">{t('currentPlan')}</h3>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-[#171717]">
              {subscription ? getTierDisplayName(subscription.tier) : t('tierFree')}
            </p>
            {subscription && subscription.tier !== 'free' && (
              <p className="text-sm text-gray-500">
                {subscription.billingPeriod === 'monthly' ? t('billedMonthly') : t('billedAnnually')}
              </p>
            )}
          </div>

          {subscription && subscription.tier !== 'free' && (
            <div className="text-right">
              <p className="text-sm text-gray-500">{t('nextBilling')}</p>
              <p className="font-medium text-[#171717]">
                {billing?.nextBillingDate ? formatDate(billing.nextBillingDate) : '-'}
              </p>
              {billing?.amount && billing?.currency && (
                <p className="text-sm text-gray-500">
                  {formatSubscriptionPrice(billing.amount, billing.currency)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scheduled Downgrade Alert */}
        {scheduledDowngrade && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <WarningCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  {t('downgradeScheduled', { tier: getTierDisplayName(scheduledDowngrade.targetTier) })}
                </p>
                <p className="text-sm text-amber-700">
                  {t('downgradeEffective', { date: formatDate(scheduledDowngrade.effectiveDate) })}
                </p>
                <button
                  onClick={() => setShowCancelDowngradeModal(true)}
                  className="mt-2 text-sm font-medium text-amber-800 underline hover:no-underline"
                >
                  {t('cancelDowngrade')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Alert */}
        {isCancelled && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <WarningCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="font-medium text-red-800">{t('subscriptionCancelled')}</p>
                <p className="text-sm text-red-700">
                  {t('accessUntil', {
                    date: subscription?.currentPeriodEnd
                      ? formatDate(subscription.currentPeriodEnd)
                      : '-'
                  })}
                </p>
                <button
                  onClick={() => setShowResumeModal(true)}
                  className="mt-2 text-sm font-medium text-red-800 underline hover:no-underline"
                >
                  {t('resumeSubscription')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Method Section */}
      {!isFreeUser && paymentMethod && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-[#171717]">{t('paymentMethod')}</h3>

          <div className="mt-4 flex items-center gap-4">
            {paymentMethod.type === 'card' ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  <CreditCard className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-[#171717]">
                    {paymentMethod.brand || 'Card'} {t('endingIn')} {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-gray-500">{t('creditDebitCard')}</p>
                </div>
              </>
            ) : paymentMethod.type === 'mobile_money' ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  <SmartphoneDevice className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-[#171717]">
                    {t('mobileMoneyEnding')} {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-gray-500">{t('mobileMoney')}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-500">{t('noPaymentMethod')}</p>
            )}
          </div>
        </div>
      )}

      {/* Billing History Section */}
      {!isFreeUser && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-[#171717]">{t('billingHistory')}</h3>
          <p className="mt-2 text-sm text-gray-500">{t('billingHistoryDesc')}</p>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">{t('noInvoicesYet')}</span>
          </div>
        </div>
      )}

      {/* Cancel Subscription Section */}
      {!isFreeUser && !isCancelled && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-[#171717]">{t('cancelSubscription')}</h3>
          <p className="mt-2 text-sm text-gray-500">{t('cancelDesc')}</p>

          <button
            onClick={() => setShowChurnSurvey(true)}
            className="mt-4 rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {t('cancelButton')}
          </button>
        </div>
      )}

      {/* Upgrade CTA for Free Users */}
      {isFreeUser && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-[#171717]">{t('upgradeNow')}</h3>
          <p className="mt-2 text-sm text-gray-500">{t('upgradeDesc')}</p>
          <button
            onClick={() => {
              // Open subscription drawer
              window.dispatchEvent(new CustomEvent('open-subscriptions-drawer'));
            }}
            className="mt-4 rounded bg-[#87E64B] px-6 py-2 text-sm font-semibold text-[#171717] hover:bg-[#78d43f]"
          >
            {t('viewPlans')}
          </button>
        </div>
      )}

      {/* Churn Survey Modal - shown first when user clicks cancel */}
      {showChurnSurvey && subscription && (
        <ChurnSurveyModal
          previousTier={subscription.tier}
          onComplete={() => {
            setShowChurnSurvey(false);
            setShowCancelModal(true);
          }}
          onCancel={() => setShowChurnSurvey(false)}
        />
      )}

      {/* Cancel Subscription Modal - shown after churn survey */}
      <ConfirmationModal
        isOpen={showCancelModal}
        type="warning"
        title={t('cancelConfirmTitle')}
        message={t('cancelConfirmMessage')}
        confirmLabel={isCancelling ? t('cancelling') : t('confirmCancel')}
        cancelLabel={t('keepSubscription')}
        onConfirm={handleCancelSubscription}
        onCancel={() => setShowCancelModal(false)}
      />

      {/* Resume Subscription Modal */}
      <ConfirmationModal
        isOpen={showResumeModal}
        type="warning"
        title={t('resumeConfirmTitle')}
        message={t('resumeConfirmMessage')}
        confirmLabel={isResuming ? t('resuming') : t('confirmResume')}
        cancelLabel={t('cancel')}
        onConfirm={handleResumeSubscription}
        onCancel={() => setShowResumeModal(false)}
      />

      {/* Cancel Downgrade Modal */}
      <ConfirmationModal
        isOpen={showCancelDowngradeModal}
        type="warning"
        title={t('cancelDowngradeTitle')}
        message={t('cancelDowngradeMessage')}
        confirmLabel={isCancellingDowngrade ? t('cancelling') : t('confirmCancelDowngrade')}
        cancelLabel={t('keepDowngrade')}
        onConfirm={handleCancelScheduledDowngrade}
        onCancel={() => setShowCancelDowngradeModal(false)}
      />
    </div>
  );
}
