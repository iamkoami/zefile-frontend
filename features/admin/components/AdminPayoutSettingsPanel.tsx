'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Refresh, Check, WarningTriangle } from 'iconoir-react';
import {
  adminPayoutsApi,
  PayoutSettings,
  RefundSettings,
  PayoutRefundSettings,
} from '@/services/admin-payouts-api';
import { RefundReason, REFUND_REASON_CONFIG } from '@/services/refunds-api';
import LoadingPanel from '@/components/LoadingPanel';

/**
 * AdminPayoutSettingsPanel - Configure payout and refund settings
 * Story 14-18: Admin Settings Panel for Payout/Refund Config
 */
const AdminPayoutSettingsPanel: React.FC = () => {
  const t = useTranslations('adminPayoutSettings');

  // State
  const [settings, setSettings] = useState<PayoutRefundSettings | null>(null);
  const [defaults, setDefaults] = useState<PayoutRefundSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'payouts' | 'refunds'>('payouts');

  // Form states (payout settings)
  const [minWithdrawal, setMinWithdrawal] = useState('');
  const [maxWithdrawal, setMaxWithdrawal] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [feePercent, setFeePercent] = useState('');
  const [feeFlat, setFeeFlat] = useState('');
  const [feeCap, setFeeCap] = useState('');
  const [autoApproveThreshold, setAutoApproveThreshold] = useState('');

  // Form states (refund settings)
  const [refundWindowDays, setRefundWindowDays] = useState('');
  const [autoRefundReasons, setAutoRefundReasons] = useState<RefundReason[]>([]);
  const [requireScreenshot, setRequireScreenshot] = useState(false);

  // Saving states
  const [isSavingPayouts, setIsSavingPayouts] = useState(false);
  const [isSavingRefunds, setIsSavingRefunds] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Dirty tracking
  const [isPayoutsDirty, setIsPayoutsDirty] = useState(false);
  const [isRefundsDirty, setIsRefundsDirty] = useState(false);

  // Confirmation modal
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [settingsRes, defaultsRes] = await Promise.all([
        adminPayoutsApi.getSettings(),
        adminPayoutsApi.getDefaultSettings(),
      ]);

      if (settingsRes.data) {
        setSettings(settingsRes.data);
        populatePayoutForm(settingsRes.data.payouts);
        populateRefundForm(settingsRes.data.refunds);
      } else if (settingsRes.error) {
        setError(settingsRes.error.message);
      }

      if (defaultsRes.data) {
        setDefaults(defaultsRes.data);
      }
    } catch (err) {
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Populate payout form from settings
  const populatePayoutForm = (payouts: PayoutSettings) => {
    setMinWithdrawal((payouts.minWithdrawalAmount / 100).toString());
    setMaxWithdrawal((payouts.maxWithdrawalAmount / 100).toString());
    setDailyLimit((payouts.dailyWithdrawalLimit / 100).toString());
    setFeePercent(payouts.withdrawalFeePercent.toString());
    setFeeFlat((payouts.withdrawalFeeFlat / 100).toString());
    setFeeCap((payouts.withdrawalFeeCap / 100).toString());
    setAutoApproveThreshold((payouts.autoApproveThreshold / 100).toString());
    setIsPayoutsDirty(false);
  };

  // Populate refund form from settings
  const populateRefundForm = (refunds: RefundSettings) => {
    setRefundWindowDays(refunds.refundWindowDays.toString());
    setAutoRefundReasons(refunds.autoRefundReasons || []);
    setRequireScreenshot(refunds.requireScreenshot);
    setIsRefundsDirty(false);
  };

  // Save payout settings
  const handleSavePayouts = async () => {
    setIsSavingPayouts(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedSettings: Partial<PayoutSettings> = {
        minWithdrawalAmount: parseFloat(minWithdrawal) * 100,
        maxWithdrawalAmount: parseFloat(maxWithdrawal) * 100,
        dailyWithdrawalLimit: parseFloat(dailyLimit) * 100,
        withdrawalFeePercent: parseFloat(feePercent),
        withdrawalFeeFlat: parseFloat(feeFlat) * 100,
        withdrawalFeeCap: parseFloat(feeCap) * 100,
        autoApproveThreshold: parseFloat(autoApproveThreshold) * 100,
      };

      const response = await adminPayoutsApi.updatePayoutSettings(updatedSettings);

      if (response.data) {
        setSuccessMessage(t('payoutsSaved'));
        setIsPayoutsDirty(false);
        // Update local settings
        if (settings) {
          setSettings({
            ...settings,
            payouts: response.data,
          });
        }
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('saveError'));
    } finally {
      setIsSavingPayouts(false);
    }
  };

  // Save refund settings
  const handleSaveRefunds = async () => {
    setIsSavingRefunds(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedSettings: Partial<RefundSettings> = {
        refundWindowDays: parseInt(refundWindowDays, 10),
        autoRefundReasons,
        requireScreenshot,
      };

      const response = await adminPayoutsApi.updateRefundSettings(updatedSettings);

      if (response.data) {
        setSuccessMessage(t('refundsSaved'));
        setIsRefundsDirty(false);
        // Update local settings
        if (settings) {
          setSettings({
            ...settings,
            refunds: response.data,
          });
        }
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('saveError'));
    } finally {
      setIsSavingRefunds(false);
    }
  };

  // Reset to defaults
  const handleResetToDefaults = async () => {
    setIsResetting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (activeTab === 'payouts') {
        const response = await adminPayoutsApi.resetPayoutSettings();
        if (response.data) {
          populatePayoutForm(response.data);
          setSuccessMessage(t('payoutsReset'));
        } else if (response.error) {
          setError(response.error.message);
        }
      } else {
        const response = await adminPayoutsApi.resetRefundSettings();
        if (response.data) {
          populateRefundForm(response.data);
          setSuccessMessage(t('refundsReset'));
        } else if (response.error) {
          setError(response.error.message);
        }
      }
    } catch (err) {
      setError(t('resetError'));
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  // Toggle auto-refund reason
  const toggleAutoRefundReason = (reason: RefundReason) => {
    setAutoRefundReasons((prev) => {
      if (prev.includes(reason)) {
        return prev.filter((r) => r !== reason);
      }
      return [...prev, reason];
    });
    setIsRefundsDirty(true);
  };

  // Validation
  const validatePayouts = (): boolean => {
    const min = parseFloat(minWithdrawal);
    const max = parseFloat(maxWithdrawal);
    const daily = parseFloat(dailyLimit);
    const percent = parseFloat(feePercent);
    const flat = parseFloat(feeFlat);
    const cap = parseFloat(feeCap);
    const threshold = parseFloat(autoApproveThreshold);

    if (isNaN(min) || min < 0) return false;
    if (isNaN(max) || max < min) return false;
    if (isNaN(daily) || daily < max) return false;
    if (isNaN(percent) || percent < 0 || percent > 100) return false;
    if (isNaN(flat) || flat < 0) return false;
    if (isNaN(cap) || cap < 0) return false;
    if (isNaN(threshold) || threshold < 0) return false;

    return true;
  };

  const validateRefunds = (): boolean => {
    const days = parseInt(refundWindowDays, 10);
    if (isNaN(days) || days < 1 || days > 365) return false;
    return true;
  };

  // All refund reasons for selection
  const allRefundReasons: RefundReason[] = Object.values(RefundReason);

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#171717]">{t('title')}</h1>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#171717] bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          <Refresh className="w-4 h-4" />
          {t('refresh')}
        </button>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <WarningTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('payouts')}
            className={`pb-4 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'payouts'
                ? 'border-[#5E53E0] text-[#5E53E0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('payoutsTab')}
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`pb-4 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'refunds'
                ? 'border-[#5E53E0] text-[#5E53E0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('refundsTab')}
          </button>
        </nav>
      </div>

      {/* Payout Settings Tab */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-bold mb-6">{t('payoutSettings')}</h2>

            {/* Withdrawal Limits */}
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                {t('withdrawalLimits')}
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('minWithdrawal')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t('minWithdrawalDesc')}</p>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={minWithdrawal}
                      onChange={(e) => {
                        setMinWithdrawal(e.target.value);
                        setIsPayoutsDirty(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                      XOF
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('maxWithdrawal')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t('maxWithdrawalDesc')}</p>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={maxWithdrawal}
                      onChange={(e) => {
                        setMaxWithdrawal(e.target.value);
                        setIsPayoutsDirty(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                      XOF
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('dailyLimit')}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">{t('dailyLimitDesc')}</p>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => {
                        setDailyLimit(e.target.value);
                        setIsPayoutsDirty(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                      XOF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawal Fees */}
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                {t('withdrawalFees')}
              </h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('feePercent')}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      value={feePercent}
                      onChange={(e) => {
                        setFeePercent(e.target.value);
                        setIsPayoutsDirty(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('feeFlat')}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={feeFlat}
                      onChange={(e) => {
                        setFeeFlat(e.target.value);
                        setIsPayoutsDirty(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                      XOF
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('feeCap')}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={feeCap}
                      onChange={(e) => {
                        setFeeCap(e.target.value);
                        setIsPayoutsDirty(true);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                    />
                    <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                      XOF
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto-Approval */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                {t('autoApproval')}
              </h3>

              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('autoApproveThreshold')}
                </label>
                <p className="text-xs text-gray-500 mb-2">{t('autoApproveThresholdDesc')}</p>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={autoApproveThreshold}
                    onChange={(e) => {
                      setAutoApproveThreshold(e.target.value);
                      setIsPayoutsDirty(true);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                    XOF
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('resetToDefaults')}
            </button>
            <button
              onClick={handleSavePayouts}
              disabled={!isPayoutsDirty || !validatePayouts() || isSavingPayouts}
              className="px-6 py-2 text-sm font-medium text-white bg-[#87E64B] rounded hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingPayouts ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* Refund Settings Tab */}
      {activeTab === 'refunds' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-bold mb-6">{t('refundSettings')}</h2>

            {/* Refund Window */}
            <div className="space-y-4 mb-8">
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('refundWindow')}
                </label>
                <p className="text-xs text-gray-500 mb-2">{t('refundWindowDesc')}</p>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={refundWindowDays}
                    onChange={(e) => {
                      setRefundWindowDays(e.target.value);
                      setIsRefundsDirty(true);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-sm text-gray-600">
                    {t('days')}
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-Refund Reasons */}
            <div className="space-y-4 mb-8">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                {t('autoRefundReasons')}
              </h3>
              <p className="text-xs text-gray-500">{t('autoRefundReasonsDesc')}</p>

              <div className="space-y-2">
                {allRefundReasons.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={autoRefundReasons.includes(reason)}
                      onChange={() => toggleAutoRefundReason(reason)}
                      className="w-4 h-4 text-[#87E64B] border-gray-300 rounded focus:ring-[#171717]"
                    />
                    <span className="text-sm text-gray-700">
                      {REFUND_REASON_CONFIG[reason]?.label || reason}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Require Screenshot */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
                {t('screenshotRequirement')}
              </h3>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="requireScreenshot"
                    checked={requireScreenshot}
                    onChange={() => {
                      setRequireScreenshot(true);
                      setIsRefundsDirty(true);
                    }}
                    className="w-4 h-4 text-[#87E64B] border-gray-300 focus:ring-[#171717]"
                  />
                  <span className="text-sm text-gray-700">{t('yes')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="requireScreenshot"
                    checked={!requireScreenshot}
                    onChange={() => {
                      setRequireScreenshot(false);
                      setIsRefundsDirty(true);
                    }}
                    className="w-4 h-4 text-[#87E64B] border-gray-300 focus:ring-[#171717]"
                  />
                  <span className="text-sm text-gray-700">{t('no')}</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">{t('screenshotDesc')}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {t('resetToDefaults')}
            </button>
            <button
              onClick={handleSaveRefunds}
              disabled={!isRefundsDirty || !validateRefunds() || isSavingRefunds}
              className="px-6 py-2 text-sm font-medium text-white bg-[#87E64B] rounded hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingRefunds ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-[#171717] mb-4">
              {t('confirmReset')}
            </h2>
            <p className="text-gray-600 mb-6">
              {activeTab === 'payouts' ? t('confirmResetPayouts') : t('confirmResetRefunds')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleResetToDefaults}
                disabled={isResetting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isResetting ? t('resetting') : t('resetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayoutSettingsPanel;
