"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import Flag from "react-flagpack";
import { Check, Sparks, Flash, Crown, NavArrowDown, Globe } from "iconoir-react";
import LoadingPanel from "@/components/LoadingPanel";
import { useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import { authApi } from "@/services/auth-api";
import {
  type SubscriptionTier,
  type BillingPeriod,
  formatSubscriptionPrice,
  subscriptionApi,
} from "@/services/subscription-api";
import { useTierLimits } from "@/hooks/useTierLimits";
import { TransactionFeesSection } from "./TransactionFeesSection";
import {
  useCurrencyStore,
  COUNTRY_CONFIG,
  ALL_COUNTRY_CODES,
} from "@/stores/currency-store";
import { trackPlanSelected } from "@/lib/posthog";

// Feature list for each tier
interface TierFeature {
  text: string;
  included: boolean;
  shared?: boolean;
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
  const { openSubscriptionCheckout, closeDrawer, pushView, setSubscriptionCheckout } = useDrawerStore();

  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTrialEligible, setIsTrialEligible] = useState(false);

  // Dynamic tier limits and pricing from API
  const {
    tierLimits,
    isLoading: isTierLoading,
    getTierPrice: getApiTierPrice,
    getTierCurrency,
  } = useTierLimits();

  // Global currency/country selection from store
  const { countryCode, setCountryCode, hydrate } = useCurrencyStore();
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

  // Build tier configurations from dynamic tier limits
  const tiers: TierConfig[] = [
    {
      id: "free",
      name: t("tiers.free.name"),
      description: t("tiers.free.description"),
      icon: <Flash className="w-6 h-6" />,
      platformFee: `${tierLimits.free.platformFeePercent}%`,
      storagePerTransfer: `${tierLimits.free.storagePerTransferGB} GB`,
      transfersPerMonth: String(tierLimits.free.transfersPerMonth),
      expiry: `${tierLimits.free.expiryDays} ${t("days")}`,
      features: [
        { text: t("features.basicUploads"), included: true, shared: true },
        { text: t("features.watermarkedPreviews"), included: true, shared: true },
        { text: t("features.emailNotifications"), included: true, shared: true },
        { text: t("features.passwordProtection"), included: true, shared: true },
        {
          text: tierLimits.free.maxVersions === -1
            ? t("features.fileVersioningUnlimited")
            : tierLimits.free.maxVersions > 1
              ? t("features.fileVersioningCount", { count: tierLimits.free.maxVersions })
              : t("features.fileVersioning"),
          included: tierLimits.free.maxVersions > 1,
        },
        {
          text: t("features.manualPreviewRegen"),
          included: tierLimits.free.manualPreviewRegen,
        },
        { text: t("features.customBranding"), included: tierLimits.free.customBranding },
        { text: t("features.customDomain"), included: tierLimits.free.customDomain },
        { text: t("features.prioritySupport"), included: false },
      ],
    },
    {
      id: "starter",
      name: t("tiers.starter.name"),
      description: t("tiers.starter.description"),
      icon: <Sparks className="w-6 h-6" />,
      platformFee: `${tierLimits.starter.platformFeePercent}%`,
      storagePerTransfer: `${tierLimits.starter.storagePerTransferGB} GB`,
      transfersPerMonth: String(tierLimits.starter.transfersPerMonth),
      expiry: `${tierLimits.starter.expiryDays} ${t("days")}`,
      highlighted: true,
      features: [
        { text: t("features.basicUploads"), included: true, shared: true },
        { text: t("features.watermarkedPreviews"), included: true, shared: true },
        { text: t("features.emailNotifications"), included: true, shared: true },
        { text: t("features.passwordProtection"), included: true, shared: true },
        {
          text: tierLimits.starter.maxVersions === -1
            ? t("features.fileVersioningUnlimited")
            : t("features.fileVersioningCount", { count: tierLimits.starter.maxVersions }),
          included: true,
        },
        {
          text: t("features.manualPreviewRegen"),
          included: tierLimits.starter.manualPreviewRegen,
        },
        { text: t("features.customBranding"), included: tierLimits.starter.customBranding },
        { text: t("features.customDomain"), included: tierLimits.starter.customDomain },
        // Display-only: Starter gets basic email support (backend prioritySupport=false means no priority queue)
        { text: t("features.prioritySupport"), included: true },
      ],
    },
    {
      id: "pro",
      name: t("tiers.pro.name"),
      description: t("tiers.pro.description"),
      icon: <Crown className="w-6 h-6" />,
      platformFee: `${tierLimits.pro.platformFeePercent}%`,
      storagePerTransfer: `${tierLimits.pro.storagePerTransferGB} GB`,
      transfersPerMonth: t("tiers.pro.unlimited"),
      expiry: `${tierLimits.pro.expiryDays} ${t("days")}`,
      features: [
        { text: t("features.basicUploads"), included: true, shared: true },
        { text: t("features.watermarkedPreviews"), included: true, shared: true },
        { text: t("features.emailNotifications"), included: true, shared: true },
        { text: t("features.passwordProtection"), included: true, shared: true },
        {
          text: tierLimits.pro.maxVersions === -1
            ? t("features.fileVersioningUnlimited")
            : t("features.fileVersioningCount", { count: tierLimits.pro.maxVersions }),
          included: true,
        },
        {
          text: t("features.manualPreviewRegen"),
          included: tierLimits.pro.manualPreviewRegen,
        },
        { text: t("features.customBranding"), included: tierLimits.pro.customBranding },
        { text: t("features.customDomain"), included: tierLimits.pro.customDomain },
        { text: t("features.prioritySupportChat"), included: true },
      ],
    },
  ];

  // Get price for a tier based on selected country (from DB via API)
  const getTierPrice = (tier: SubscriptionTier): string => {
    if (tier === "free") return t("free");
    const amountMinorUnits = getApiTierPrice(tier, countryCode, billingPeriod);
    const currency = getTierCurrency(countryCode);
    return formatSubscriptionPrice(amountMinorUnits, currency);
  };

  // Get billing period suffix
  const getBillingSuffix = (): string => {
    return billingPeriod === "monthly" ? t("perMonth") : t("perYear");
  };

  // Handle "Get started" click when not authenticated
  const handleGetStarted = () => {
    closeDrawer();
    // Dispatch event to open auth panel in Header
    window.dispatchEvent(new CustomEvent("open-auth-panel", {
      detail: { returnTo: "subscriptions" },
    }));
  };

  // Handle upgrade click
  const handleUpgrade = (tier: SubscriptionTier) => {
    trackPlanSelected(tier, billingPeriod);

    // Free tier: open auth panel to create free account
    if (tier === "free") {
      if (!isAuthenticated) {
        handleGetStarted();
      }
      return;
    }

    // Skip if current plan
    if (tier === currentTier) return;

    // Get amount for selected tier (from DB via API)
    const amountInMinorUnits = getApiTierPrice(tier, countryCode, billingPeriod);
    const currency = getTierCurrency(countryCode);

    // Epic 24: If user is on a paid tier, show upgrade preview with proration
    if (currentTier !== "free") {
      // Store checkout data and navigate to upgrade preview
      setSubscriptionCheckout({
        tier,
        billingPeriod,
        amount: amountInMinorUnits,
        currency,
        countryCode,
      });
      pushView("subscription-upgrade-preview");
      return;
    }

    // Free users go directly to country selection checkout
    openSubscriptionCheckout(
      tier,
      billingPeriod,
      amountInMinorUnits,
      currency,
      countryCode,
    );
  };

  if (isLoading || isTierLoading) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="subscription-panel">
      {/* Header */}
      <div className="mt-8 mb-16">
        <h1 className="text-4xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
          {t.rich("title", {
            highlight: (chunks: ReactNode) => (
              <span className="ze-highlight-green">{chunks}</span>
            ),
          })}
        </h1>
        <p className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("subtitle")}</p>
      </div>

      {/* Billing Period Toggle and Currency Selector */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-14">
        {/* Billing Period Toggle */}
        <div className="bg-gray-100 dark:bg-[oklch(0.28_0_0)] p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingPeriod === "monthly"
                ? "bg-white dark:bg-[oklch(0.24_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] shadow-sm dark:shadow-black/30"
                : "text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.91_0_0)]"
            }`}
          >
            {t("monthly")}
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              billingPeriod === "annual"
                ? "bg-white dark:bg-[oklch(0.24_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] shadow-sm dark:shadow-black/30"
                : "text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.91_0_0)]"
            }`}
          >
            {t("annual")}
            <span className="ml-2 text-xs text-[#5E53E0] font-bold">
              {(() => {
                const currency = getTierCurrency(countryCode);
                const starterSavings = (getApiTierPrice("starter", countryCode, "monthly") * 12) - getApiTierPrice("starter", countryCode, "annual");
                const proSavings = (getApiTierPrice("pro", countryCode, "monthly") * 12) - getApiTierPrice("pro", countryCode, "annual");
                const maxSavings = Math.max(starterSavings, proSavings);
                return maxSavings > 0
                  ? t("saveAmount", { amount: formatSubscriptionPrice(maxSavings, currency) })
                  : t("save17");
              })()}
            </span>
          </button>
        </div>

        {/* Currency/Country Selector */}
        <div className="relative">
          <button
            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[oklch(0.24_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded-lg text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)] transition-all"
          >
            {COUNTRY_CONFIG[countryCode]?.flagCode ? (
              <Flag code={COUNTRY_CONFIG[countryCode].flagCode!} size="s" hasBorder={false} />
            ) : (
              <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
            )}
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
              <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-[oklch(0.24_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded-lg shadow-lg dark:shadow-black/30 overflow-hidden">
                {ALL_COUNTRY_CODES.map((code) => (
                  <button
                    key={code}
                    onClick={() => handleCountryChange(code)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors flex items-center gap-2 ${
                      code === countryCode ? "bg-gray-50 dark:bg-[oklch(0.28_0_0)] font-bold" : ""
                    }`}
                  >
                    {COUNTRY_CONFIG[code]?.flagCode ? (
                      <Flag code={COUNTRY_CONFIG[code].flagCode!} size="s" hasBorder={false} />
                    ) : (
                      <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
                    )}
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
            isPro && !isCurrentPlan ? "bg-[#5E53E0]" : "bg-white dark:bg-[oklch(0.24_0_0)]";
          const textColorClass =
            isPro && !isCurrentPlan ? "text-white" : "text-[#171717] dark:text-[oklch(0.91_0_0)]";
          const subtextColorClass =
            isPro && !isCurrentPlan ? "text-white/70" : "text-gray-500 dark:text-[oklch(0.75_0_0)]";
          const borderClass =
            isPro && !isCurrentPlan
              ? "border-transparent"
              : isHighlighted && !isCurrentPlan
                ? "border-2 border-[#171717]"
                : isCurrentPlan
                  ? "border-2 border-[#87E64B]"
                  : "border border-gray-200 dark:border-[oklch(0.30_0_0)]";
          const metricsBorderClass =
            isPro && !isCurrentPlan ? "border-white/20" : "border-gray-200 dark:border-[oklch(0.30_0_0)]";

          return (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-6 transition-all flex flex-col ${cardBgClass} ${borderClass} ${
                isPro && !isCurrentPlan
                  ? "shadow-xl dark:shadow-black/30"
                  : isHighlighted && !isCurrentPlan
                    ? "shadow-lg dark:shadow-black/30"
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
                <h3 className={`text-lg font-bold ${textColorClass}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm font-medium mt-1 min-h-[3.5rem] ${subtextColorClass}`}>
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${textColorClass}`}>
                    {getTierPrice(tier.id)}
                  </span>
                  <span className={`font-medium ${tier.id === "free" ? "invisible" : subtextColorClass}`}>
                    {getBillingSuffix()}
                  </span>
                </div>
                {billingPeriod === "annual" && (
                  <p
                    className={`text-xs mt-1 ${
                      tier.id === "free"
                        ? "invisible"
                        : isPro && !isCurrentPlan
                          ? "text-white/50"
                          : "text-gray-400 dark:text-[oklch(0.60_0_0)]"
                    }`}
                  >
                    {tier.id !== "free"
                      ? t("monthlyEquivalent", {
                          amount: formatSubscriptionPrice(
                            Math.round(
                              getApiTierPrice(tier.id, countryCode, "annual") / 12,
                            ),
                            getTierCurrency(countryCode),
                          ),
                        })
                      : "\u00A0"}
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(tier.id)}
                disabled={isAuthenticated && isCurrentPlan}
                className={`w-full py-3 px-4 rounded font-bold transition-all mb-6 ${
                  isAuthenticated && isCurrentPlan
                    ? "bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-gray-400 dark:text-[oklch(0.60_0_0)] cursor-not-allowed"
                    : isPro
                      ? "bg-[#87E64B] text-[#171717] hover:bg-[#78d43f]"
                      : "border border-gray-300 dark:border-[oklch(0.30_0_0)] bg-white dark:bg-[oklch(0.24_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)]"
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
                  <span className={`font-bold ${textColorClass}`}>
                    {tier.platformFee}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("storagePerTransfer")}
                  </span>
                  <span className={`font-bold ${textColorClass}`}>
                    {tier.storagePerTransfer}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("transfersPerMonth")}
                  </span>
                  <span className={`font-bold ${textColorClass}`}>
                    {tier.transfersPerMonth}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${subtextColorClass}`}>
                    {t("transferExpiry")}
                  </span>
                  <span className={`font-bold ${textColorClass}`}>
                    {tier.expiry}
                  </span>
                </div>
              </div>

              {/* Differentiating features (unique to this tier) */}
              <ul className="space-y-3 mt-4">
                {tier.features
                  .filter((f) => f.included && !f.shared)
                  .map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 flex-shrink-0 text-[#87E64B]" />
                      <span
                        className={`font-medium ${
                          isPro && !isCurrentPlan
                            ? "text-white/80"
                            : "text-gray-600 dark:text-[oklch(0.75_0_0)]"
                        }`}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
              </ul>

              {/* Shared features summary */}
              <p
                className={`text-xs mt-3 ${
                  isPro && !isCurrentPlan
                    ? "text-white/40"
                    : "text-gray-400 dark:text-[oklch(0.60_0_0)]"
                }`}
              >
                {t("includesBasics")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Transaction Fees */}
      <TransactionFeesSection compact />

      {/* FAQ Section */}
      <div className="mt-20 mb-16">
        <h2 className="mb-6 text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-4 text-center">
          {t.rich("faqTitle", {
            highlight: (chunks: ReactNode) => (
              <span className="ze-highlight-green">{chunks}</span>
            ),
          })}
        </h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {[1, 2, 3].map((num) => {
            const isExpanded = expandedFaq === num;
            return (
              <div
                key={num}
                className="rounded-2xl bg-[#F5F5F4] dark:bg-[oklch(0.22_0_0)] transition-colors duration-300"
              >
                <button
                  onClick={() => setExpandedFaq(isExpanded ? null : num)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] pr-4">
                    {t(`faqQ${num}`)}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <NavArrowDown className="w-3.5 h-3.5 text-gray-400 dark:text-[oklch(0.60_0_0)]" />
                  </div>
                </button>
                <div
                  className="grid transition-all duration-400 ease-in-out"
                  style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5">
                      <div className="border-t border-black/[0.06] dark:border-[oklch(0.30_0_0)] pt-3">
                        <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] leading-relaxed">
                          {t(`faqA${num}`)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500 dark:text-[oklch(0.75_0_0)]">
        <p>{t("cancelAnytime")}</p>
        <p className="mt-1">
          {t("questionsContact")}{" "}
          <a
            href="mailto:hello@zefile.io"
            className="text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium"
          >
            hello@zefile.io
          </a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPanel;
