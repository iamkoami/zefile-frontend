"use client";

export const runtime = "edge";

import { useState, useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import Flag from "react-flagpack";
import {
  Check,
  Sparks,
  Flash,
  Crown,
  NavArrowDown,
  Globe,
} from "iconoir-react";
import Link from "next/link";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import { safePaymentRedirect } from "@/utils/security";
import { toast } from "@/components/shared/Toast";
import {
  FeatureComparisonTable,
  UpgradeModal,
  TransactionFeesSection,
} from "@/features/subscription/components";
import {
  type SubscriptionTier,
  type BillingPeriod,
  formatSubscriptionPrice,
  subscriptionApi,
} from "@/services/subscription-api";
import { useTierLimits } from "@/hooks/useTierLimits";
import {
  useCurrencyStore,
  COUNTRY_CONFIG,
  ALL_COUNTRY_CODES,
} from "@/stores/currency-store";
import { authApi } from "@/services/auth-api";
import { trackPricingViewed } from "@/lib/posthog";

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

function BrandCross({
  size = 80,
  color = "#87E64B",
  opacity = 0.15,
  rotate = 0,
  className = "",
}: {
  size?: number;
  color?: string;
  opacity?: number;
  rotate?: number;
  className?: string;
}) {
  const bar = size * 0.3;
  const r = size * 0.08;
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: "100%",
          height: bar,
          marginTop: -(bar / 2),
          backgroundColor: color,
          opacity,
          borderRadius: r,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          height: "100%",
          width: bar,
          marginLeft: -(bar / 2),
          backgroundColor: color,
          opacity,
          borderRadius: r,
        }}
      />
    </div>
  );
}

export default function PricingPage() {
  const t = useTranslations("subscriptions");
  const tPage = useTranslations("subscription");

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("starter");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  // Dynamic tier limits and pricing from API
  const {
    tierLimits,
    isLoading: isTierLoading,
    getTierPrice: getApiTierPrice,
    getTierCurrency,
  } = useTierLimits();

  // Global currency/country selection from store
  const { countryCode, setCountryCode, hydrate } = useCurrencyStore();

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setIsCurrencyDropdownOpen(false);
  };

  // Hydrate currency store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const initPage = async () => {
      const user = authApi.getStoredUser();
      const authenticated = authApi.isAuthenticated() && !!user;
      setIsAuthenticated(authenticated);

      if (authenticated) {
        try {
          const response = await subscriptionApi.getCurrentSubscription();
          if (response.data) {
            setCurrentTier(response.data.tier as SubscriptionTier);
          }
        } catch (error) {
          console.error("Failed to fetch subscription:", error);
        }
      }

      setIsLoading(false);
      trackPricingViewed();
    };

    initPage();
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
          text:
            tierLimits.free.maxVersions === -1
              ? t("features.fileVersioningUnlimited")
              : tierLimits.free.maxVersions > 1
                ? t("features.fileVersioningCount", {
                    count: tierLimits.free.maxVersions,
                  })
                : t("features.fileVersioning"),
          included: tierLimits.free.maxVersions > 1,
        },
        {
          text: t("features.manualPreviewRegen"),
          included: tierLimits.free.manualPreviewRegen,
        },
        {
          text: t("features.customBranding"),
          included: tierLimits.free.customBranding,
        },
        {
          text: t("features.customDomain"),
          included: tierLimits.free.customDomain,
        },
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
          text:
            tierLimits.starter.maxVersions === -1
              ? t("features.fileVersioningUnlimited")
              : t("features.fileVersioningCount", {
                  count: tierLimits.starter.maxVersions,
                }),
          included: true,
        },
        {
          text: t("features.manualPreviewRegen"),
          included: tierLimits.starter.manualPreviewRegen,
        },
        {
          text: t("features.customBranding"),
          included: tierLimits.starter.customBranding,
        },
        {
          text: t("features.customDomain"),
          included: tierLimits.starter.customDomain,
        },
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
          text:
            tierLimits.pro.maxVersions === -1
              ? t("features.fileVersioningUnlimited")
              : t("features.fileVersioningCount", {
                  count: tierLimits.pro.maxVersions,
                }),
          included: true,
        },
        {
          text: t("features.manualPreviewRegen"),
          included: tierLimits.pro.manualPreviewRegen,
        },
        {
          text: t("features.customBranding"),
          included: tierLimits.pro.customBranding,
        },
        {
          text: t("features.customDomain"),
          included: tierLimits.pro.customDomain,
        },
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

  const getBillingSuffix = (): string => {
    return billingPeriod === "monthly" ? t("perMonth") : t("perYear");
  };

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier === "free") {
      if (!isAuthenticated) {
        window.dispatchEvent(
          new CustomEvent("open-auth-panel", {
            detail: { returnTo: "subscriptions" },
          }),
        );
      }
      return;
    }

    if (tier === currentTier) return;

    setSelectedTier(tier);
    setUpgradeModalOpen(true);
  };

  const handleConfirmUpgrade = async (
    paymentMethod: "card" | "mobile_money",
  ) => {
    try {
      const response = await subscriptionApi.initializeSubscription({
        tier: selectedTier,
        billingPeriod,
        customerEmail: "",
        paymentMethod,
      });

      if (response.data?.authorizationUrl) {
        try {
          safePaymentRedirect(response.data.authorizationUrl);
        } catch {
          toast.error("Failed to redirect to payment provider.");
        }
      } else {
        toast.error("No authorization URL returned from payment provider.");
      }
    } catch (error) {
      console.error("Failed to initialize subscription:", error);
      toast.error("Failed to initialize subscription payment.");
    }
  };

  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  if (isLoading || isTierLoading) {
    return <LoadingFullscreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero + decorative crosses */}
      <div className="relative overflow-x-clip">
        <PageHero
          title={t.rich("title", { highlight })}
          subtitle={t("subtitle")}
        />
        <BrandCross
          size={100}
          color="#87E64B"
          opacity={0.15}
          rotate={12}
          className="absolute -bottom-6 -right-4 hidden md:block"
        />
        <BrandCross
          size={56}
          color="#5E53E0"
          opacity={0.1}
          rotate={-8}
          className="absolute bottom-12 left-10 hidden md:block"
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-20 pb-10">
        {/* Billing Period Toggle + Currency Selector */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
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
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-[#171717] hover:border-gray-300 transition-all"
            >
              {COUNTRY_CONFIG[countryCode]?.flagCode ? (
                <Flag
                  code={COUNTRY_CONFIG[countryCode].flagCode!}
                  size="s"
                  hasBorder={false}
                />
              ) : (
                <Globe className="w-5 h-5 text-gray-500" />
              )}
              <span>
                {COUNTRY_CONFIG[countryCode]?.name ||
                  COUNTRY_CONFIG.DEFAULT.name}
              </span>
              <NavArrowDown
                className={`w-4 h-4 transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCurrencyDropdownOpen && (
              <>
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
                        code === countryCode ? "bg-gray-50 font-bold" : ""
                      }`}
                    >
                      {COUNTRY_CONFIG[code]?.flagCode ? (
                        <Flag
                          code={COUNTRY_CONFIG[code].flagCode!}
                          size="s"
                          hasBorder={false}
                        />
                      ) : (
                        <Globe className="w-5 h-5 text-gray-500" />
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
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {tiers.map((tier) => {
            const isCurrentPlan = isAuthenticated && tier.id === currentTier;
            const isHighlighted = tier.highlighted;
            const isPro = tier.id === "pro";

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
                  <p
                    className={`text-sm font-medium mt-1 ${subtextColorClass}`}
                  >
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
                  {billingPeriod === "annual" && (
                    <p
                      className={`text-xs mt-1 ${
                        tier.id === "free"
                          ? "invisible"
                          : isPro && !isCurrentPlan
                            ? "text-white/50"
                            : "text-gray-400"
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
                  onClick={() => handleSelectTier(tier.id)}
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
                <div
                  className={`space-y-2 py-4 border-t ${metricsBorderClass}`}
                >
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

                {/* Differentiating features (unique to this tier) */}
                <ul className="space-y-3 mt-4">
                  {tier.features
                    .filter((f) => f.included && !f.shared)
                    .map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
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

                {/* Shared features summary */}
                <p
                  className={`text-xs mt-3 ${
                    isPro && !isCurrentPlan
                      ? "text-white/40"
                      : "text-gray-400"
                  }`}
                >
                  {t("includesBasics")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison + FAQ gradient section */}
      <section className="relative overflow-x-clip bg-gradient-to-b from-white via-[#F3F0FF]/40 to-white">
        <BrandCross
          size={140}
          color="#5E53E0"
          opacity={0.06}
          rotate={15}
          className="absolute top-12 -right-10 hidden md:block"
        />
        <BrandCross
          size={70}
          color="#87E64B"
          opacity={0.1}
          rotate={-12}
          className="absolute top-[40%] -left-4 hidden lg:block"
        />
        <BrandCross
          size={50}
          color="#5E53E0"
          opacity={0.07}
          rotate={25}
          className="absolute bottom-[15%] right-[6%] hidden md:block"
        />

        <div className="mx-auto max-w-6xl px-6 py-20 md:pb-32 md:pt-24 relative z-10">
          {/* Feature Comparison Table */}
          <div className="relative">
            <h2 className="mb-6 text-center text-3xl md:text-5xl font-bold text-[#171717]">
              {tPage.rich("compareFeatures", { highlight })}
            </h2>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <FeatureComparisonTable currentTier={currentTier} />
            </div>
          </div>

          {/* Transaction Fees Section */}
          <TransactionFeesSection />

          {/* FAQ Section - matching how-it-works style */}
          <div className="mt-32 max-w-[55rem] mx-auto relative">
            <BrandCross
              size={80}
              color="#87E64B"
              opacity={0.12}
              rotate={-10}
              className="absolute -top-8 -left-20 hidden lg:block"
            />
            <h2 className="text-3xl md:text-5xl font-bold text-[#171717] mb-12 text-center">
              {tPage.rich("faqTitle", { highlight })}
            </h2>
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3].map((num) => {
                const isExpanded = expandedFaq === num;
                return (
                  <div
                    key={num}
                    className="rounded-2xl bg-[#F5F5F4] transition-colors duration-300"
                  >
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : num)}
                      className="flex items-center justify-between w-full px-6 md:px-8 py-5 md:py-6 text-left"
                      aria-expanded={isExpanded}
                    >
                      <span className="text-base md:text-lg font-semibold text-[#171717] pr-6">
                        {t(`faqQ${num}`)}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </button>
                    <div
                      className="grid transition-all duration-400 ease-in-out"
                      style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-6 md:px-8 pb-6">
                          <div className="border-t border-black/[0.06] pt-4">
                            <p className="text-sm font-medium md:text-[15px] text-gray-500 leading-relaxed">
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
          <div className="mt-16 text-center text-sm text-gray-500">
            <p>{t("cancelAnytime")}</p>
            <p className="mt-1">
              {t("questionsContact")}{" "}
              <a
                href="mailto:hello@zefile.io"
                className="text-[#171717] underline font-medium"
              >
                hello@zefile.io
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-28 pt-4">
        <div className="bg-[#87E64B] rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-28 rounded-3xl bg-white/15 rotate-12 pointer-events-none" />
          <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-1/2 right-[15%] w-16 h-16 rounded-full bg-white/[0.08] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-[#171717] mb-4">
              {t.rich("pricingCtaTitle", {
                highlight: (chunks: ReactNode) => (
                  <span className="ze-highlight-purple">{chunks}</span>
                ),
              })}
            </h2>
            <p className="text-[#171717]/70 font-medium text-base mb-10 max-w-3xl mx-auto">
              {t("pricingCtaSubtext")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="bg-[#171717] text-white px-8 py-3.5 rounded font-bold text-lg hover:bg-[#2a2a2a] transition-colors"
              >
                {t("pricingCtaButton")}
              </Link>
              <Link
                href="/how-it-works"
                className="text-[#171717] font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                {t("pricingCtaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

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
