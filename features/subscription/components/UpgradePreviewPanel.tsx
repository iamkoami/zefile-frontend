"use client";

import { useEffect, useState } from "react";
import { ArrowRight, InfoCircle, Clock, CheckCircle, Xmark } from "iconoir-react";
import { useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import { useCurrencyStore } from "@/stores/currency-store";
import {
  subscriptionApi,
  type UpgradePreviewResponse,
} from "@/services/subscription-api";
import { SubscriptionSummaryCard } from "@/components/shared/SubscriptionSummaryCard";
import LoadingPanel from "@/components/LoadingPanel";
import { toast } from "@/components/shared/Toast";
import { authApi } from "@/services/auth-api";

/**
 * UpgradePreviewPanel - Shows proration details before upgrade
 * Displays credit from unused subscription and amount due
 */
export function UpgradePreviewPanel() {
  const t = useTranslations("subscriptions");
  const tPayment = useTranslations("payment");
  const {
    payload,
    pushView,
    popView,
    setPaymentFlowData,
    setOnBeforeBack,
  } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const user = authApi.getStoredUser();
  const { countryCode: selectedCountry } = useCurrencyStore();

  const [preview, setPreview] = useState<UpgradePreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set custom back handler
  useEffect(() => {
    setOnBeforeBack(() => {
      popView();
      return true;
    });
    return () => setOnBeforeBack(null);
  }, [setOnBeforeBack, popView]);

  // Fetch upgrade preview
  useEffect(() => {
    const fetchPreview = async () => {
      if (!checkoutData) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await subscriptionApi.getUpgradePreview({
          tier: checkoutData.tier,
          billingPeriod: checkoutData.billingPeriod,
          countryCode: checkoutData.countryCode || selectedCountry,
        });

        if (response.error) {
          setError(response.error.message || t("upgradePreviewError"));
          return;
        }

        if (response.data) {
          setPreview(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch upgrade preview:", err);
        setError(t("upgradePreviewError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [checkoutData, selectedCountry, t]);

  const handleContinue = async () => {
    if (!checkoutData || !preview || !user?.email) return;

    // If can't upgrade, show error
    if (!preview.canUpgrade) {
      toast.error(preview.reason || t("cannotUpgrade"));
      return;
    }

    // If amount due is 0, it's a free upgrade (credit covers it)
    if (preview.amountDue === 0) {
      setIsInitiating(true);
      try {
        const response = await subscriptionApi.initiateUpgrade({
          tier: checkoutData.tier,
          billingPeriod: checkoutData.billingPeriod,
          countryCode: checkoutData.countryCode || selectedCountry,
        });

        if (response.error) {
          toast.error(response.error.message || t("upgradeError"));
          return;
        }

        if (response.data?.status === "success") {
          toast.success(t("upgradeSuccess"));
          pushView("subscription-success");
          return;
        }
      } catch (err) {
        console.error("Free upgrade failed:", err);
        toast.error(t("upgradeError"));
      } finally {
        setIsInitiating(false);
      }
      return;
    }

    // Store proration data for payment flow
    setPaymentFlowData({
      isUpgrade: true,
      creditAmount: preview.creditAmount,
      creditDisplayAmount: preview.creditDisplayAmount,
      amountDue: preview.amountDue,
      amountDueDisplayAmount: preview.amountDueDisplayAmount,
    });

    // Navigate to payment method selection
    pushView("subscription-method");
  };

  const handleBack = () => {
    popView();
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
        <div className="flex-1 min-w-0">
          <LoadingPanel className="py-12" />
        </div>
        <div className="w-full lg:w-[400px] flex-shrink-0 order-first lg:order-last">
          <div className="lg:sticky lg:top-4">
            <SubscriptionSummaryCard
              tier={checkoutData.tier}
              billingPeriod={checkoutData.billingPeriod}
              countryCode={checkoutData.countryCode || selectedCountry}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Xmark className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-[#171717] mb-2">{t("upgradePreviewError")}</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
        >
          {t("goBack")}
        </button>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  // Check if user can't upgrade
  if (!preview.canUpgrade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <InfoCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-[#171717] mb-2">{t("cannotUpgrade")}</h2>
        <p className="text-gray-600 mb-6">{preview.reason}</p>
        <button
          onClick={handleBack}
          className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
        >
          {t("goBack")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left Column - Proration Details */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("upgradeTo", { tier: t(`tiers.${preview.targetTier}.name`) })}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {t("reviewUpgradeDetails")}
          </p>
        </div>

        {/* Current Plan Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{t("currentPlan")}</span>
            <span className="font-medium text-[#171717]">
              {t(`tiers.${preview.currentTier}.name`)}
              {preview.currentBillingPeriod && (
                <span className="text-gray-500 ml-1">
                  ({preview.currentBillingPeriod === "annual" ? t("annual") : t("monthly")})
                </span>
              )}
            </span>
          </div>
          {preview.daysRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t("daysRemaining")}</span>
              <span className="font-medium text-[#171717]">
                {preview.daysRemaining} {t("days")}
              </span>
            </div>
          )}
        </div>

        {/* Proration Breakdown */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-[#171717]">{t("priceSummary")}</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* New Plan Price */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {t(`tiers.${preview.targetTier}.name`)} ({preview.targetBillingPeriod === "annual" ? t("annual") : t("monthly")})
              </span>
              <span className="font-medium text-[#171717]">
                {preview.newPlanPriceDisplayAmount}
              </span>
            </div>

            {/* Credit Applied */}
            {preview.creditAmount > 0 && (
              <div className="flex items-center justify-between text-green-600">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {t("creditFromUnused", { tier: t(`tiers.${preview.currentTier}.name`) })}
                </span>
                <span className="font-medium">-{preview.creditDisplayAmount}</span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#171717]">{t("amountDueToday")}</span>
                <span className="text-xl font-bold text-[#171717]">
                  {preview.amountDueDisplayAmount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Free Upgrade Notice */}
        {preview.amountDue === 0 && preview.creditAmount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 mb-1">{t("noChargeRequired")}</p>
              <p className="text-sm text-green-700">{t("creditCoversUpgrade")}</p>
            </div>
          </div>
        )}

        {/* New Billing Cycle Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800 mb-1">{t("newBillingCycle")}</p>
            <p className="text-sm text-blue-700">
              {t("newCycleStartsToday")}
              {preview.newPeriodEnd && (
                <>
                  {" "}
                  {t("nextBillingOn", {
                    date: new Date(preview.newPeriodEnd).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }),
                  })}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleBack}
            disabled={isInitiating}
            className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t("goBack")}
          </button>
          <button
            onClick={handleContinue}
            disabled={isInitiating}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isInitiating ? (
              tPayment("processing")
            ) : preview.amountDue === 0 ? (
              <>
                {t("upgradeNow")}
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                {tPayment("continueToPayment")}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column - Summary (Sticky) */}
      <div className="w-full lg:w-[400px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <SubscriptionSummaryCard
            tier={checkoutData.tier}
            billingPeriod={checkoutData.billingPeriod}
            countryCode={checkoutData.countryCode || selectedCountry}
          />
        </div>
      </div>
    </div>
  );
}

export default UpgradePreviewPanel;
