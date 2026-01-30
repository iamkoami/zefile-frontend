'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, SmartphoneDevice, Wallet, WarningTriangle, NavArrowDown, Check, Xmark, RefreshDouble } from 'iconoir-react';
import { subscriptionApi, AutoRenewStatusDto, RenewalAttemptDto, formatSubscriptionPrice } from '@/services/subscription-api';
import LoadingPanel from '@/components/LoadingPanel';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { toast } from '@/components/shared/Toast';

/**
 * SubscriptionSettingsPanel - Auto-renewal settings and subscription management
 * Story 15.9: Auto-Renewal Toggle UI
 */
const SubscriptionSettingsPanel: React.FC = () => {
  const t = useTranslations('subscriptionSettings');
  const [status, setStatus] = useState<AutoRenewStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    const response = await subscriptionApi.getAutoRenewStatus();
    if (response.data) {
      setStatus(response.data);
    }
    setIsLoading(false);
  };

  const handleToggle = (newValue: boolean) => {
    setPendingValue(newValue);
    setShowConfirmDialog(true);
  };

  const confirmToggle = async () => {
    if (pendingValue === null) return;

    setIsUpdating(true);
    setShowConfirmDialog(false);

    const response = await subscriptionApi.updateAutoRenew({ enabled: pendingValue });

    if (response.data) {
      setStatus(response.data);
      toast.success(
        pendingValue
          ? t('autoRenewalEnabled')
          : t('autoRenewalDisabled')
      );
    } else if (response.error) {
      toast.error(response.error.message || t('updateFailed'));
    }

    setIsUpdating(false);
    setPendingValue(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  if (!status) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">{t('noSubscription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold text-[#171717]">
          {t('title')}
        </h3>
        <p className="text-gray-500 mt-1">{t('description')}</p>
      </div>

      {/* Grace Period Banner */}
      {status.isInGracePeriod && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <WarningTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                {t('gracePeriodWarning', { days: status.gracePeriodDaysRemaining ?? 0 })}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {t('gracePeriodDescription')}
              </p>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="mt-3 px-4 py-2 bg-[#87E64B] text-[#171717] rounded font-medium hover:bg-[#78d43f] transition-colors"
              >
                {t('renewNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Info */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-[#171717]">{t('currentPlan')}</h4>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">{t('plan')}</p>
            <p className="font-medium text-[#171717]">{status.planName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('price')}</p>
            <p className="font-medium text-[#171717]">
              {formatSubscriptionPrice(status.planPriceMinorUnits, status.currency)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('nextBillingDate')}</p>
            <p className="font-medium text-[#171717]">
              {formatDate(status.currentPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('paymentMethod')}</p>
            <p className="font-medium text-[#171717] flex items-center gap-2">
              {status.paymentMethodType === 'card' && (
                <>
                  <CreditCard className="w-4 h-4" />
                  {status.cardType} **** {status.cardLast4}
                </>
              )}
              {status.paymentMethodType === 'mobile_money' && (
                <>
                  <SmartphoneDevice className="w-4 h-4" />
                  {t('mobileMoney')}
                </>
              )}
              {status.paymentMethodType === 'wallet' && (
                <>
                  <Wallet className="w-4 h-4" />
                  {t('wallet')}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Renewal Toggle */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <RefreshDouble className="w-5 h-5 text-[#5E53E0]" />
              <h4 className="font-semibold text-[#171717]">{t('autoRenewal')}</h4>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {status.willAutoRenew
                ? t('autoRenewalOnDescription')
                : t('autoRenewalOffDescription')}
            </p>
            {status.autoRenewNotice && (
              <p className="text-sm text-yellow-600 mt-1">
                {status.autoRenewNotice}
              </p>
            )}
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => handleToggle(!status.autoRenewEnabled)}
            disabled={isUpdating || status.paymentMethodType === 'mobile_money'}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${status.autoRenewEnabled ? 'bg-[#5E53E0]' : 'bg-gray-200'}
              ${(isUpdating || status.paymentMethodType === 'mobile_money') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${status.autoRenewEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Mobile money notice */}
        {status.paymentMethodType === 'mobile_money' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {t('mobileMoneyNotice')}
            </p>
          </div>
        )}
      </div>

      {/* Renewal History */}
      <RenewalHistorySection />

      {/* Confirmation Dialog */}
      <ConfirmationModal
        isOpen={showConfirmDialog}
        type="warning"
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingValue(null);
        }}
        onConfirm={confirmToggle}
        title={pendingValue ? t('enableAutoRenewal') : t('disableAutoRenewal')}
        message={
          pendingValue
            ? t('enableAutoRenewalMessage', { date: formatDate(status.currentPeriodEnd) })
            : t('disableAutoRenewalMessage', { date: formatDate(status.currentPeriodEnd) })
        }
        confirmLabel={pendingValue ? t('enable') : t('disable')}
        cancelLabel={t('cancel')}
        isLoading={isUpdating}
      />
    </div>
  );
};

/**
 * RenewalHistorySection - Expandable renewal attempt history
 */
const RenewalHistorySection: React.FC = () => {
  const t = useTranslations('subscriptionSettings');
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<RenewalAttemptDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = async () => {
    if (history.length > 0) return; // Already loaded
    setIsLoading(true);
    const response = await subscriptionApi.getRenewalHistory({ page: 1, limit: 10 });
    if (response.data) {
      setHistory(response.data.items);
    }
    setIsLoading(false);
  };

  const handleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded) {
      loadHistory();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="border-t pt-6">
      <button
        onClick={handleExpand}
        className="flex items-center justify-between w-full group"
      >
        <h4 className="font-semibold text-[#171717]">{t('renewalHistory')}</h4>
        <NavArrowDown
          className={`w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <LoadingPanel className="py-4" />
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">{t('noRenewalHistory')}</p>
          ) : (
            history.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="text-sm text-[#171717]">
                    {formatDate(attempt.attemptedAt)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {attempt.paymentMethodType === 'card' && t('cardPayment')}
                    {attempt.paymentMethodType === 'wallet' && t('walletPayment')}
                    {attempt.paymentMethodType === 'mobile_money' && t('mobileMoneyPayment')}
                  </p>
                  {attempt.failureReason && (
                    <p className="text-xs text-red-500 mt-1">{attempt.failureReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#171717]">
                    {formatSubscriptionPrice(attempt.amountMinorUnits, attempt.currency)}
                  </p>
                  <span
                    className={`
                      text-xs px-2 py-0.5 rounded inline-flex items-center gap-1
                      ${attempt.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : attempt.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }
                    `}
                  >
                    {attempt.status === 'success' && <Check className="w-3 h-3" />}
                    {attempt.status === 'failed' && <Xmark className="w-3 h-3" />}
                    {attempt.status === 'success' && t('success')}
                    {attempt.status === 'failed' && t('failed')}
                    {attempt.status === 'pending' && t('pending')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SubscriptionSettingsPanel;
