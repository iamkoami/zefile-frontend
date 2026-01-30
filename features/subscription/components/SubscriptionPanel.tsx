"use client";

import React, { useState, useEffect } from "react";
import { Check, Sparks, Flash, Crown, NavArrowDown } from "iconoir-react";
import LoadingPanel from "@/components/LoadingPanel";
import { useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import { authApi } from "@/services/auth-api";
import {
  type SubscriptionTier,
  type BillingPeriod,
  TIER_LIMITS,
  formatSubscriptionPrice,
  getTierPriceMinorUnits,
  subscriptionApi,
} from "@/services/subscription-api";
import {
  useCurrencyStore,
  COUNTRY_CONFIG,
  ALL_COUNTRY_CODES,
} from "@/stores/currency-store";

// Feature list for each tier
interface TierFeature {
  text: string;
  included: boolean;
}

interface TierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: TierFeature[];
  platformFee: string;
  storagePerTransfer: string;
  transfersPerMonth: string;
  expiry: string;
  highlighted?: boolean;
}


/**
 * SubscriptionPanel - Displays subscription tiers and allows upgrades
 */
const SubscriptionPanel: React.FC = () => {
  const t = useTranslations("subscriptions");
  const { openSubscriptionCheckout, closeDrawer } = useDrawerStore();

  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTrialEligible, setIsTrialEligible] = useState(false);

  // Global currency/country selection from store
  const { countryCode, pricing, setCountryCode, hydrate } = useCurrencyStore();
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Handle country change
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setIsCurrencyDropdownOpen(false);
  };

  // Hydrate currency store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Fetch user's subscription on mount
  useEffect(() => {
    const initializePanel = async () => {
      try {
        // Check if user is authenticated
        const user = authApi.getStoredUser();
        const authenticated = authApi.isAuthenticated() && !!user;
        setIsAuthenticated(authenticated);

        // Fetch user's current subscription from backend
        if (authenticated) {
          setIsLoadingSubscription(true);
          try {
            const response = await subscriptionApi.getCurrentSubscription();
            if (response.data) {
              setCurrentTier(response.data.tier);
            }

            // Check trial eligibility
            const trialResponse = await subscriptionApi.checkTrialEligibility();
            if (trialResponse.data) {
              setIsTrialEligible(trialResponse.data.eligible);
            }
          } catch (err) {
            // User has no subscription, default to free
            console.log("No active subscription found");
          } finally {
            setIsLoadingSubscription(false);
          }
        }
      } catch (error) {
        console.error("Error initializing subscription panel:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePanel();
  }, []);

  // Build tier configurations from centralized TIER_LIMITS
  const tiers: TierConfig[] = [
    {
      id: "free",
      name: t("tiers.free.name"),
      description: t("tiers.free.description"),
      icon: <Flash className="w-6 h-6" />,
      platformFee: `${TIER_LIMITS.free.platformFeePercent}%`,
      storagePerTransfer: `${TIER_LIMITS.free.storagePerTransferGB} GB`,
      transfersPerMonth: String(TIER_LIMITS.free.transfersPerMonth),
      expiry: t("tiers.free.expiry"),
      features: [
        { text: t("features.basicUploads"), included: true },
        { text: t("features.watermarkedPreviews"), included: true },
        { text: t("features.emailNotifications"), included: true },
        { text: t("features.passwordProtection"), included: true },
        { text: t("features.fileVersioning"), included: false },
        {
          text: t("features.manualPreviewRegen"),
          included: TIER_LIMITS.free.manualPreviewRegen,
        },
        { text: t("features.prioritySupport"), included: false },
      ],
    },
    {
      id: "starter",
      name: t("tiers.starter.name"),
      description: t("tiers.starter.description"),
      icon: <Sparks className="w-6 h-6" />,
      platformFee: `${TIER_LIMITS.starter.platformFeePercent}%`,
      storagePerTransfer: `${TIER_LIMITS.starter.storagePerTransferGB} GB`,
      transfersPerMonth: String(TIER_LIMITS.starter.transfersPerMonth),
      expiry: t("tiers.starter.expiry"),
      highlighted: true,
      features: [
        { text: t("features.basicUploads"), included: true },
        { text: t("features.watermarkedPreviews"), included: true },
        { text: t("features.emailNotifications"), included: true },
        { text: t("features.passwordProtection"), included: true },
        { text: t("features.fileVersioning5"), included: true },
        {
          text: t("features.manualPreviewRegen"),
          included: TIER_LIMITS.starter.manualPreviewRegen,
        },
        { text: t("features.prioritySupport"), included: true },
      ],
    },
    {
      id: "pro",
      name: t("tiers.pro.name"),
      description: t("tiers.pro.description"),
      icon: <Crown className="w-6 h-6" />,
      platformFee: `${TIER_LIMITS.pro.platformFeePercent}%`,
      storagePerTransfer: `${TIER_LIMITS.pro.storagePerTransferGB} GB`,
      transfersPerMonth: t("tiers.pro.unlimited"),
      expiry: t("tiers.pro.expiry"),
      features: [
        { text: t("features.basicUploads"), included: true },
        { text: t("features.watermarkedPreviews"), included: true },
        { text: t("features.emailNotifications"), included: true },
        { text: t("features.passwordProtection"), included: true },
        { text: t("features.fileVersioningUnlimited"), included: true },
        {
          text: t("features.manualPreviewRegen"),
          included: TIER_LIMITS.pro.manualPreviewRegen,
        },
        { text: t("features.prioritySupportChat"), included: true },
      ],
    },
  ];

  // Get price for a tier based on selected country
  const getTierPrice = (tier: SubscriptionTier): string => {
    if (tier === "free") return t("free");
    const amountMinorUnits = getTierPriceMinorUnits(
      tier,
      billingPeriod,
      countryCode,
    );
    return formatSubscriptionPrice(amountMinorUnits, pricing.currency);
  };

  // Get billing period suffix
  const getBillingSuffix = (): string => {
    return billingPeriod === "monthly" ? t("perMonth") : t("perYear");
  };

  // Handle "Get started" click when not authenticated
  const handleGetStarted = () => {
    closeDrawer();
    // Dispatch event to open auth panel in Header
    window.dispatchEvent(new CustomEvent("open-auth-panel"));
  };

  // Handle upgrade click
  const handleUpgrade = (tier: SubscriptionTier) => {
    // Free tier: open auth panel to create free account
    if (tier === "free") {
      if (!isAuthenticated) {
        handleGetStarted();
      }
      return;
    }

    // Skip if current plan
    if (tier === currentTier) return;

    // Open checkout with selected country pricing
    const amountInMinorUnits = getTierPriceMinorUnits(
      tier,
      billingPeriod,
      countryCode,
    );

    openSubscriptionCheckout(
      tier,
      billingPeriod,
      amountInMinorUnits,
      pricing.currency,
      countryCode,
    );
  };

  if (isLoading) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="subscription-panel">
      {/* Header */}
      <div className="mt-8 mb-16">
        <h1 className="text-3xl font-bold text-[#171717] mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("subtitle")}</p>
      </div>

      {/* Billing Period Toggle and Currency Selector */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-14">
        {/* Billing Period Toggle */}
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingPeriod === "monthly"
                ? "bg-white text-[#171717] shadow-sm"
                : "text-gray-600 hover:text-[#171717]"
            }`}
          >
            {t("monthly")}
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingPeriod === "annual"
                ? "bg-white text-[#171717] shadow-sm"
                : "text-gray-600 hover:text-[#171717]"
            }`}
          >
            {t("annual")}
            <span className="ml-2 text-xs text-[#5E53E0] font-semibold">
              {t("save17")}
            </span>
          </button>
        </div>

        {/* Currency/Country Selector */}
        <div className="relative">
          <button
            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#171717] hover:border-gray-300 transition-all"
          >
            <span className="text-lg">
              {COUNTRY_CONFIG[countryCode]?.flag || COUNTRY_CONFIG.DEFAULT.flag}
            </span>
            <span>
              {COUNTRY_CONFIG[countryCode]?.name || COUNTRY_CONFIG.DEFAULT.name}
            </span>
            <NavArrowDown
              className={`w-4 h-4 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isCurrencyDropdownOpen && (
            <>
              {/* Click-outside overlay */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCurrencyDropdownOpen(false)}
              />
              <div className="absolute z-50 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {ALL_COUNTRY_CODES.map((code) => (
                  <button
                    key={code}
                    onClick={() => handleCountryChange(code)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                      code === countryCode ? "bg-gray-50 font-medium" : ""
                    }`}
                  >
                    <span className="text-lg">
                      {COUNTRY_CONFIG[code]?.flag}
                    </span>
                    {COUNTRY_CONFIG[code]?.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {tiers.map((tier) => {
          const isCurrentPlan = isAuthenticated && tier.id === currentTier;
          const isHighlighted = tier.highlighted;
          const isPro = tier.id === "pro";

          // Card styling based on tier
          const cardBgClass =
            isPro && !isCurrentPlan ? "bg-[#5E53E0]" : "bg-white";
          const textColorClass =
            isPro && !isCurrentPlan ? "text-white" : "text-[#171717]";
          const subtextColorClass =
            isPro && !isCurrentPlan ? "text-white/70" : "text-gray-500";
          const borderClass =
            isPro && !isCurrentPlan
              ? "border-transparent"
              : isHighlighted && !isCurrentPlan
                ? "border-2 border-[#171717]"
                : isCurrentPlan
                  ? "border-2 border-[#87E64B]"
                  : "border border-gray-200";
          const metricsBorderClass =
            isPro && !isCurrentPlan ? "border-white/20" : "border-gray-200";

          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-6 transition-all ${cardBgClass} ${borderClass} ${
                isPro && !isCurrentPlan
                  ? "shadow-xl"
                  : isHighlighted && !isCurrentPlan
                    ? "shadow-lg"
                    : ""
              }`}
            >
              {/* Recommended Badge - for Starter */}
              {isHighlighted && !isCurrentPlan && !isPro && (
                <div className="absolute -top-3 left-4">
                  <span className="bg-[#171717] text-white text-xs font-medium px-3 py-1 rounded">
                    {t("popular")}
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-4">
                  <span className="bg-[#87E64B] text-[#171717] text-xs font-medium px-3 py-1 rounded">
                    {t("currentPlan")}
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-4">
                <h3 className={`text-lg font-semibold ${textColorClass}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm font-medium mt-1 ${subtextColorClass}`}>
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${textColorClass}`}>
                    {getTierPrice(tier.id)}
                  </span>
                  {tier.id !== "free" && (
                    <span className={`font-medium ${subtextColorClass}`}>
                      {getBillingSuffix()}
                    </span>
                  )}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={isAuthenticated && isCurrentPlan}
                className={`w-full py-3 px-4 rounded font-semibold transition-all mb-6 ${
                  isAuthenticated && isCurrentPlan
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : isPro
                      ? "bg-[#87E64B] text-[#171717] hover:bg-[#78d43f]"
                      : "border border-gray-300 bg-white text-[#171717] hover:bg-gray-50"
                }`}
              >
                {isAuthenticated && isCurrentPlan
                  ? t("currentPlan")
                  : tier.id === "free"
                    ? t("getStarted")
                    : isPro
                      ? t("tryFree7Days")
                      : t("upgrade")}
              </button>

              {/* Key Metrics */}
              <div className={`space-y-2 py-4 border-t ${metricsBorderClass}`}>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("platformFee")}
                  </span>
                  <span className={`font-semibold ${textColorClass}`}>
                    {tier.platformFee}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("storagePerTransfer")}
                  </span>
                  <span className={`font-semibold ${textColorClass}`}>
                    {tier.storagePerTransfer}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("transfersPerMonth")}
                  </span>
                  <span className={`font-semibold ${textColorClass}`}>
                    {tier.transfersPerMonth}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("transferExpiry")}
                  </span>
                  <span className={`font-semibold ${textColorClass}`}>
                    {tier.expiry}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mt-4">
                {tier.features
                  .filter((f) => f.included)
                  .map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0 text-[#87E64B]" />
                      <span
                        className={`font-medium ${
                          isPro && !isCurrentPlan
                            ? "text-white/80"
                            : "text-gray-600"
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-20 mb-16">
        <h2 className="mb-6 text-xl font-semibold text-[#171717] mb-4 text-center">
          {t("faqTitle")}
        </h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {[1, 2, 3].map((num) => {
            const isExpanded = expandedFaq === num;
            return (
              <div
                key={num}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(isExpanded ? null : num)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-[#171717]">
                    {t(`faqQ${num}`)}
                  </span>
                  <NavArrowDown
                    className={`w-5 h-5 text-gray-500 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{t(`faqA${num}`)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500">
        <p>{t("cancelAnytime")}</p>
        <p className="mt-1">
          {t("questionsContact")}{" "}
          <a
            href="mailto:support@zefile.io"
            className="text-[#5E53E0] hover:underline"
          >
            support@zefile.io
          </a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPanel;
