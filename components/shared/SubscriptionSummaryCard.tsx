"use client";

import { useTranslations } from "next-intl";
import {
  formatSubscriptionPrice,
  getTierPriceMinorUnits,
  getPricingForCountry,
  getTierLimits,
  type SubscriptionTier,
  type BillingPeriod,
} from "@/services/subscription-api";

export interface SubscriptionSummaryCardProps {
  tier: SubscriptionTier;
  billingPeriod: BillingPeriod;
  countryCode: string;
  className?: string;
}

/**
 * SubscriptionSummaryCard - Displays subscription summary
 * Used in subscription checkout flow (similar to TransferSummaryCard)
 * Pro tier has purple background, Starter has beige background
 */
export function SubscriptionSummaryCard({
  tier,
  billingPeriod,
  countryCode,
  className = "",
}: SubscriptionSummaryCardProps) {
  const t = useTranslations("subscriptions");

  const pricing = getPricingForCountry(countryCode);
  const amount = getTierPriceMinorUnits(tier, billingPeriod, countryCode);

  // Pro tier styling (matching PlanCard.tsx)
  const isPro = tier === "pro";
  const cardBgClass = isPro ? "bg-[#5E53E0] shadow-xl" : "bg-[#FDF8F0]";
  const headerTextClass = isPro ? "text-white/70" : "text-gray-600";
  const titleTextClass = isPro ? "text-white" : "text-[#171717]";
  const subtitleTextClass = isPro ? "text-white/70" : "text-gray-500";
  const billingBgClass = isPro ? "bg-[#171717]/50" : "bg-white";
  const billingLabelClass = isPro ? "text-white" : "text-gray-600";
  const billingValueClass = isPro ? "text-white" : "text-[#171717]";
  const featureLabelClass = isPro ? "text-white/70" : "text-gray-600";
  const borderClass = isPro ? "border-white/20" : "border-[#E8E0D5]";
  const priceTextClass = isPro ? "text-white" : "text-[#171717]";
  const pricePeriodClass = isPro ? "text-white/70" : "text-gray-500";

  const getTierName = () => {
    if (tier === "pro") return t("tiers.pro.name");
    if (tier === "starter") return t("tiers.starter.name");
    return t("tiers.free.name");
  };

  const getTierDescription = () => {
    if (tier === "pro") return t("tiers.pro.description");
    if (tier === "starter") return t("tiers.starter.description");
    return t("tiers.free.description");
  };

  const getBillingText = () => {
    return billingPeriod === "annual" ? t("perYear") : t("perMonth");
  };

  // Get tier limits for summary details
  const limits = getTierLimits(tier);

  // Build tier details for display
  const tierDetails = [
    {
      label: t("platformFee"),
      value: `${limits.platformFeePercent}%`,
    },
    {
      label: t("storagePerTransfer"),
      value: `${limits.storagePerTransferGB}GB`,
    },
    {
      label: t("transfersPerMonth"),
      value:
        limits.transfersPerMonth === -1
          ? t("tiers.pro.unlimited")
          : `${limits.transfersPerMonth}`,
    },
    {
      label: t("transferExpiry"),
      value: `${limits.expiryDays} ${t("days")}`,
    },
    {
      label: t("fileVersioning"),
      value: `${limits.maxVersions} ${limits.maxVersions === 1 ? t("version") : t("versions")}`,
    },
  ];

  return (
    <div className={`${cardBgClass} rounded-lg p-6 flex flex-col ${className}`}>
      {/* Header */}
      <h3 className={`text-sm font-medium ${headerTextClass} mb-3`}>
        {t("orderSummary")}
      </h3>

      {/* Tier Info - No icon */}
      <div className="mb-4">
        <h4 className={`text-xl font-bold ${titleTextClass}`}>
          {getTierName()}
        </h4>
        <p className={`text-sm ${subtitleTextClass}`}>{getTierDescription()}</p>
      </div>

      {/* Billing Period */}
      <div className={`${billingBgClass} rounded-lg p-4 mb-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm ${billingLabelClass}`}>
            {t("billingPeriod")}
          </span>
          <span className={`font-medium ${billingValueClass}`}>
            {billingPeriod === "annual" ? t("annual") : t("monthly")}
          </span>
        </div>
      </div>

      {/* Tier Details */}
      <div className="mb-6">
        <p className={`text-sm font-medium ${featureLabelClass} mb-3`}>
          {t("included")}
        </p>
        <ul className="space-y-2">
          {tierDetails.map((detail, index) => (
            <li
              key={index}
              className={`flex items-center justify-between text-sm`}
            >
              <span className={featureLabelClass}>{detail.label}</span>
              <span className={`font-medium ${billingValueClass}`}>
                {detail.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Total */}
      <div
        className={`flex items-center justify-between pt-4 border-t ${borderClass}`}
      >
        <span className={`font-semibold ${priceTextClass}`}>{t("total")}</span>
        <div className="text-right">
          <span className={`text-xl font-bold ${priceTextClass}`}>
            {formatSubscriptionPrice(amount, pricing.currency)}
          </span>
          <span className={`text-sm ${pricePeriodClass} ml-1`}>
            {getBillingText()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionSummaryCard;
