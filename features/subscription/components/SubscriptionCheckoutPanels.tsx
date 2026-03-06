"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import React from "react";
import Flag from "react-flagpack";
import {
  CreditCard,
  SmartphoneDevice,
  CheckCircle,
  XmarkCircle,
  NavArrowDown,
  RefreshDouble,
  InfoCircle,
  Lock,
  Clock,
  Xmark,
  Globe,
} from "iconoir-react";
import Image from "next/image";
import LoadingPanel from "@/components/LoadingPanel";
import { useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import {
  useCurrencyStore,
  COUNTRY_CONFIG,
  ALL_COUNTRY_CODES,
} from "@/stores/currency-store";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import {
  subscriptionApi,
  formatSubscriptionPrice,
  getNextBillingDate,
  getPricingForCountry,
  getTierPriceMinorUnits,
} from "@/services/subscription-api";
import { SubscriptionSummaryCard } from "@/components/shared/SubscriptionSummaryCard";
import { toast } from "@/components/shared/Toast";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import type { CountryCode } from "libphonenumber-js";
import { authApi } from "@/services/auth-api";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { safePaymentRedirect } from "@/utils/security";

/**
 * Mobile money provider info from API
 */
interface MobileMoneyProviderInfo {
  provider: MobileMoneyProvider;
  name: string;
  icon: string;
}

// ============================================
// SubscriptionCountryPanel - Step 1: Select country
// ============================================

export function SubscriptionCountryPanel() {
  const t = useTranslations("payment");
  const tSub = useTranslations("subscriptions");
  const {
    payload,
    pushView,
    popView,
    setSubscriptionCheckout,
    setOnBeforeBack,
    resetPaymentFlow,
  } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;

  // Use global currency store for country selection
  const {
    countryCode: selectedCountry,
    setCountryCode: setSelectedCountry,
    hydrate,
    isHydrated,
  } = useCurrencyStore();

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Hydrate store from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Set custom back handler
  useEffect(() => {
    setOnBeforeBack(() => {
      resetPaymentFlow();
      popView();
      return true;
    });
    return () => setOnBeforeBack(null);
  }, [setOnBeforeBack, popView, resetPaymentFlow]);

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setIsCountryDropdownOpen(false);
  };

  const handleContinue = () => {
    // Update checkout data with selected country
    if (checkoutData) {
      const pricing = getPricingForCountry(selectedCountry);
      const amount = getTierPriceMinorUnits(
        checkoutData.tier,
        checkoutData.billingPeriod,
        selectedCountry
      );
      setSubscriptionCheckout({
        ...checkoutData,
        countryCode: selectedCountry,
        amount,
        currency: pricing.currency,
      });
    }
    pushView("subscription-method");
  };

  const handleBack = () => {
    popView();
  };

  if (!checkoutData || !isHydrated) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left Column - Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#171717]">
            {tSub("upgradeToTier", { tier: tSub(`tiers.${checkoutData.tier}.name`) })}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {tSub("selectYourCountry")}
          </p>
        </div>

        {/* Country Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("selectCountry")}
          </label>
          <div className="relative">
            <button
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-[#171717] hover:border-gray-300 transition-colors"
              aria-expanded={isCountryDropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="flex items-center gap-2">
                {(COUNTRY_CONFIG[selectedCountry]?.flagCode || COUNTRY_CONFIG.DEFAULT.flagCode) ? (
                  <Flag code={(COUNTRY_CONFIG[selectedCountry]?.flagCode || COUNTRY_CONFIG.DEFAULT.flagCode)!} size="s" hasBorder={false} />
                ) : (
                  <Globe className="w-5 h-5 text-gray-500" />
                )}
                {COUNTRY_CONFIG[selectedCountry]?.name ||
                  COUNTRY_CONFIG.DEFAULT.name}
              </span>
              <NavArrowDown
                className={`w-5 h-5 text-gray-500 transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCountryDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsCountryDropdownOpen(false)}
                  aria-hidden="true"
                />
                <div
                  className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto"
                  role="listbox"
                >
                  {ALL_COUNTRY_CODES.map((code) => (
                    <button
                      key={code}
                      onClick={() => handleCountrySelect(code)}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 ${
                        selectedCountry === code
                          ? "bg-[#5E53E0]/5 text-[#5E53E0] font-medium"
                          : "text-gray-700"
                      }`}
                      role="option"
                      aria-selected={selectedCountry === code}
                    >
                      {COUNTRY_CONFIG[code]?.flagCode ? (
                        <Flag code={COUNTRY_CONFIG[code].flagCode!} size="s" hasBorder={false} />
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

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
          >
            {tSub("backToPlans")}
          </button>
          <button
            onClick={handleContinue}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
          >
            {t("continue")}
          </button>
        </div>
      </div>

      {/* Right Column - Summary (Sticky) */}
      <div className="w-full lg:w-[400px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <SubscriptionSummaryCard
            tier={checkoutData.tier}
            billingPeriod={checkoutData.billingPeriod}
            countryCode={selectedCountry}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// SubscriptionMethodPanel - Step 2: Select payment method
// ============================================

export function SubscriptionMethodPanel() {
  const t = useTranslations("payment");
  const tSub = useTranslations("subscriptions");
  const {
    payload,
    pushView,
    popView,
    setPaymentMethod,
    setOnBeforeBack,
  } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const user = authApi.getStoredUser();
  const { countryCode: selectedCountry } = useCurrencyStore();

  const [selectedMethodType, setSelectedMethodType] = useState<
    "mobile_money" | "card" | null
  >(null);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [mobileMoneyProviders, setMobileMoneyProviders] = useState<MobileMoneyProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  // Set custom back handler
  useEffect(() => {
    setOnBeforeBack(() => {
      popView();
      return true;
    });
    return () => setOnBeforeBack(null);
  }, [setOnBeforeBack, popView]);

  // Fetch mobile money providers when component mounts
  useEffect(() => {
    const fetchProviders = async () => {
      const countryCode = checkoutData?.countryCode || selectedCountry;
      if (countryCode === "DEFAULT") {
        setMobileMoneyProviders([]);
        return;
      }

      setLoadingProviders(true);
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${countryCode}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setMobileMoneyProviders(data.mobileMoney || []);
      } catch {
        // Fallback providers
        setMobileMoneyProviders([
          { provider: "mtn_momo", name: "MTN Mobile Money", icon: "mtn" },
          { provider: "vodafone_cash", name: "Vodafone Cash", icon: "vodafone" },
          { provider: "mpesa", name: "M-Pesa", icon: "mpesa" },
        ]);
      } finally {
        setLoadingProviders(false);
      }
    };

    fetchProviders();
  }, [checkoutData?.countryCode, selectedCountry]);

  const getProviderIconPath = (icon: string): string => {
    return `/icons/payment/${icon}.svg`;
  };

  const handleSelectMethod = (type: "mobile_money" | "card", provider?: MobileMoneyProvider) => {
    setSelectedMethodType(type);
    if (type === "mobile_money" && provider) {
      setSelectedProvider(provider);
    } else {
      setSelectedProvider(null);
    }
  };

  const handleContinue = async () => {
    if (!selectedMethodType || !checkoutData || !user?.email) return;

    if (selectedMethodType === "mobile_money") {
      if (!selectedProvider) {
        toast.error(t("selectProvider"));
        return;
      }
      setPaymentMethod({ type: "mobile_money", provider: selectedProvider });
      pushView("subscription-phone");
    } else {
      // Card payment - navigate to card panel
      setPaymentMethod({ type: "card" });
      pushView("subscription-card");
    }
  };

  const handleBack = () => {
    popView();
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  const nextBillingDate = getNextBillingDate(checkoutData.billingPeriod);

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left Column - Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("choosePaymentMethod")}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {tSub("selectPaymentMethod")}
          </p>
        </div>

        {/* Billing Summary */}
        <div className="p-4 bg-gray-50 rounded-lg mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{tSub("firstChargeDate")}</span>
            <span className="font-medium text-[#171717]">{tSub("today")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{tSub("nextBillingDate")}</span>
            <span className="font-medium text-[#171717]">
              {nextBillingDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {t("paymentMethodTitle")}
          </p>

          {loadingProviders ? (
            <LoadingPanel className="py-4" />
          ) : (
            <div className="space-y-3" role="radiogroup" aria-label={t("paymentMethods")}>
              {/* Mobile Money Options */}
              {mobileMoneyProviders.map((provider) => {
                const isSelected =
                  selectedMethodType === "mobile_money" &&
                  selectedProvider === provider.provider;

                return (
                  <button
                    key={provider.provider}
                    onClick={() => handleSelectMethod("mobile_money", provider.provider)}
                    className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#171717] focus:ring-offset-2 ${
                      isSelected
                        ? "border-[#5E53E0] bg-[#5E53E0]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={provider.name}
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                      {failedIcons.has(provider.icon) ? (
                        <SmartphoneDevice className="w-6 h-6 text-gray-500" />
                      ) : (
                        <Image
                          src={getProviderIconPath(provider.icon)}
                          alt={provider.name}
                          width={24}
                          height={24}
                          onError={() => {
                            setFailedIcons((prev) => new Set(prev).add(provider.icon));
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#171717]">{provider.name}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          {tSub("manualRenewal")}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-[#5E53E0]" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />}
                    </div>
                  </button>
                );
              })}

              {/* Card Option */}
              <button
                onClick={() => handleSelectMethod("card")}
                className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#171717] focus:ring-offset-2 ${
                  selectedMethodType === "card"
                    ? "border-[#5E53E0] bg-[#5E53E0]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                role="radio"
                aria-checked={selectedMethodType === "card"}
                aria-label={t("payWithCard")}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                  <CreditCard className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#171717]">{t("payWithCard")}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                      <RefreshDouble className="w-3 h-3" />
                      {tSub("autoRenews")}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedMethodType === "card" ? "border-[#5E53E0]" : "border-gray-300"
                  }`}
                >
                  {selectedMethodType === "card" && (
                    <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Auto-renewal info box */}
          {selectedMethodType && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                selectedMethodType === "card"
                  ? "bg-green-50 border border-green-200"
                  : "bg-amber-50 border border-amber-200"
              }`}
            >
              <InfoCircle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  selectedMethodType === "card" ? "text-green-600" : "text-amber-600"
                }`}
              />
              <div className="text-sm">
                {selectedMethodType === "card" ? (
                  <>
                    <p className="font-medium text-green-800 mb-1">
                      {tSub("autoRenewalEnabled")}
                    </p>
                    <p className="text-green-700">{tSub("cardAutoRenewalDescription")}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-amber-800 mb-1">
                      {tSub("manualRenewalRequired")}
                    </p>
                    <p className="text-amber-700">{tSub("mobileMoneyRenewalDescription")}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {tSub("previous")}
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedMethodType || isLoading}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t("processing") : t("continue")}
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 text-sm text-gray-500">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{t("securityGuarantee")}</p>
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

// ============================================
// SubscriptionPhonePanel - Step 3: Enter phone number
// ============================================

export function SubscriptionPhonePanel() {
  const t = useTranslations("payment");
  const tSub = useTranslations("subscriptions");
  const {
    payload,
    pushView,
    popView,
    setPaymentFlowData,
    setOnBeforeBack,
  } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const paymentMethod = payload?.paymentMethod;
  const user = authApi.getStoredUser();
  const { countryCode: selectedCountry } = useCurrencyStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>("GH");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);

  // Set custom back handler
  useEffect(() => {
    setOnBeforeBack(() => {
      popView();
      return true;
    });
    return () => setOnBeforeBack(null);
  }, [setOnBeforeBack, popView]);

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    []
  );

  const handleSubmit = async () => {
    if (!isPhoneValid || !checkoutData || !paymentMethod || !user?.email) return;

    setIsLoading(true);

    try {
      const response = await subscriptionApi.initializeSubscription({
        tier: checkoutData.tier,
        billingPeriod: checkoutData.billingPeriod,
        customerEmail: user.email,
        paymentMethod: "mobile_money",
        mobileMoneyProvider: paymentMethod.provider,
        phoneNumber: phoneNumber,
        countryCode: checkoutData.countryCode === "DEFAULT" ? "NG" : checkoutData.countryCode || "NG",
      });

      if (response.error) {
        if (response.status === 503) {
          setPaymentsDisabled(true);
          toast.error(tSub("paymentsUnavailable"));
        } else {
          toast.error(response.error.message || t("paymentInitFailed"));
        }
        setIsLoading(false);
        return;
      }

      if (response.data) {
        setPaymentFlowData({
          phoneNumber,
          phoneCountryCode,
          isPhoneValid: true,
          paymentReference: response.data.reference,
          paymentAmount: checkoutData.amount,
          senderEmail: user.email,
        });
        pushView("subscription-processing");
      }
    } catch (error) {
      console.error("Mobile money payment initialization failed:", error);
      toast.error(t("paymentInitFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    popView();
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left Column - Form */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("enterPhoneNumber")}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {t("enterPhoneForMobileMoney")}
          </p>
        </div>

        <div className="mb-8">
          <PhoneNumberInput
            value={phoneNumber}
            onChange={handlePhoneChange}
            defaultCountry={phoneCountryCode}
          />
        </div>

        {paymentsDisabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 flex items-start gap-3">
            <InfoCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{tSub("paymentsUnavailableDesc")}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleBack}
            disabled={isLoading}
            className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {tSub("previous")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isPhoneValid || isLoading || paymentsDisabled}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t("processing") : t("continue")}
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

// ============================================
// SubscriptionCardPanel - Card payment via popup or hosted checkout
// ============================================

export function SubscriptionCardPanel() {
  const t = useTranslations("payment");
  const tSub = useTranslations("subscriptions");
  const {
    payload,
    pushView,
    setPaymentFlowData,
    clearBackNavigation,
  } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const user = authApi.getStoredUser();
  const { countryCode: selectedCountry } = useCurrencyStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  // Hide back button during card payment
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  useEffect(() => {
    if (hasInitialized.current || !checkoutData || !user?.email) return;
    hasInitialized.current = true;

    const initializePayment = async () => {
      try {
        // Initialize subscription payment on backend
        const countryCode = checkoutData.countryCode === "DEFAULT" ? "NG" : checkoutData.countryCode || selectedCountry || "NG";

        const response = await subscriptionApi.initializeSubscription({
          tier: checkoutData.tier,
          billingPeriod: checkoutData.billingPeriod,
          customerEmail: user.email,
          paymentMethod: "card",
          countryCode,
        });

        if (response.error || !response.data) {
          if (response.status === 503) {
            setInitError(tSub("paymentsUnavailableDesc"));
          } else {
            setInitError(response.error?.message || t("paymentInitFailed"));
          }
          setIsInitializing(false);
          return;
        }

        // Store reference for later use
        setPaymentFlowData({
          paymentReference: response.data.reference,
          paymentAmount: response.data.amount,
          lastPaymentMethod: "card",
        });

        // Dual-flow: prefer hosted checkout redirect when authorizationUrl is present
        if (response.data.authorizationUrl) {
          // Hosted checkout redirect (Startbutton or similar gateway)
          setIsInitializing(false);
          safePaymentRedirect(response.data.authorizationUrl);
          return;
        }

        // Paystack popup flow (accessCode present, no authorizationUrl)
        const PaystackPop = (await import("@paystack/inline-js")).default;
        const paystack = new PaystackPop();

        paystack.checkout({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
          email: user.email,
          amount: response.data.amount,
          currency: response.data.currency || "NGN",
          ref: response.data.reference,
          onSuccess: (transaction: { reference: string }) => {
            setPaymentFlowData({
              paymentReference: transaction.reference,
              transactionDetails: {
                reference: transaction.reference,
                amount: response.data!.amount,
                currency: response.data!.currency || "NGN",
                paidAt: new Date(),
              },
            });
            pushView("subscription-processing");
          },
          onCancel: () => {
            setPaymentFlowData({
              paymentError: {
                code: "CANCELLED",
                message: t("errorCancelled"),
              },
              lastPaymentMethod: "card",
            });
            pushView("subscription-failed");
          },
          onLoad: () => {
            setIsInitializing(false);
          },
        });
      } catch (error) {
        console.error("Subscription payment initialization failed:", error);
        setInitError(t("paymentInitFailed"));
        setIsInitializing(false);
      }
    };

    initializePayment();
  }, [checkoutData, user?.email, selectedCountry, pushView, setPaymentFlowData, t]);

  const handleRetry = () => {
    hasInitialized.current = false;
    setInitError(null);
    setIsInitializing(true);
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <Xmark className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-[#171717] mb-2">{t("paymentInitFailed")}</h2>
        <p className="text-gray-600 mb-6">{initError}</p>
        <button
          onClick={handleRetry}
          className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left Column - Loading state */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          {isInitializing && (
            <>
              <div className="animate-pulse mb-4">
                <Clock className="w-12 h-12 text-[#5E53E0]" />
              </div>
              <h2 className="text-xl font-bold text-[#171717] mb-2">
                {t("openingPaymentWindow")}
              </h2>
              <p className="text-gray-600">
                {t("pleaseWait")}
              </p>
            </>
          )}
          {!isInitializing && (
            <>
              <div className="animate-pulse mb-4">
                <CreditCard className="w-12 h-12 text-[#5E53E0]" />
              </div>
              <h2 className="text-xl font-bold text-[#171717] mb-2">
                {t("completePaymentInPopup")}
              </h2>
              <p className="text-gray-600">
                {t("paymentWindowOpen")}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right Column - Summary */}
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

// ============================================
// SubscriptionProcessingPanel - Step 4: Processing/Polling
// ============================================

export function SubscriptionProcessingPanel() {
  const t = useTranslations("payment");
  const tSub = useTranslations("subscriptions");
  const {
    payload,
    pushView,
    closeDrawer,
    resetPaymentFlow,
    clearBackNavigation,
  } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const flowData = payload?.paymentFlowData;
  const { countryCode: selectedCountry } = useCurrencyStore();

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clear back navigation to prevent interruption during payment
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  // Start polling for payment status
  useEffect(() => {
    if (!flowData?.paymentReference) return;

    pollingRef.current = setInterval(async () => {
      try {
        const response = await subscriptionApi.getSubscriptionPaymentStatus(
          flowData.paymentReference
        );
        if (response.data) {
          if (response.data.status === "SUCCESS") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            toast.success(tSub("upgradeSuccess"));
            pushView("subscription-success");
          } else if (response.data.isTerminal && response.data.status !== "PENDING") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pushView("subscription-failed");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    // Stop after 2 minutes
    const timeoutId = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 120000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      clearTimeout(timeoutId);
    };
  }, [flowData?.paymentReference, pushView, tSub]);

  const handleCancel = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    resetPaymentFlow();
    closeDrawer();
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  const pricing = getPricingForCountry(checkoutData.countryCode || selectedCountry);

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="mb-6">
        <LoadingPanel />
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#171717] mb-2">
          {t("checkYourPhone")}
        </h2>
        <p className="text-gray-600">{t("confirmPaymentOn")}</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">{tSub("plan")}</span>
          <span className="font-medium">{tSub(`tiers.${checkoutData.tier}.name`)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">{t("amount")}</span>
          <span className="font-bold text-lg">
            {formatSubscriptionPrice(checkoutData.amount, pricing.currency)}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">{t("waitingForConfirmation")}</p>

      <button
        onClick={handleCancel}
        className="w-full px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
      >
        {t("cancel")}
      </button>
    </div>
  );
}

// ============================================
// SubscriptionSuccessPanel - Step 5: Success
// ============================================

export function SubscriptionSuccessPanel() {
  const tSub = useTranslations("subscriptions");
  const { payload, closeDrawer, resetPaymentFlow, clearBackNavigation } = useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;

  const { checkForPoll } = usePollEligibility();

  // Clear back navigation
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  useEffect(() => {
    const timer = setTimeout(() => { checkForPoll('after_subscription_upgrade'); }, 5000);
    return () => clearTimeout(timer);
  }, [checkForPoll]);

  const handleClose = () => {
    resetPaymentFlow();
    closeDrawer();
    // Optionally reload to refresh subscription status
    window.location.reload();
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#171717] mb-2">
          {tSub("upgradeSuccessTitle")}
        </h2>
        <p className="text-gray-600">
          {tSub("upgradeSuccessMessage", { tier: tSub(`tiers.${checkoutData.tier}.name`) })}
        </p>
      </div>

      <button
        onClick={handleClose}
        className="w-full px-5 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
      >
        {tSub("getStarted")}
      </button>
    </div>
  );
}

// ============================================
// SubscriptionFailedPanel - Step 6: Failed
// ============================================

export function SubscriptionFailedPanel() {
  const t = useTranslations("payment");
  const { payload, pushView, closeDrawer, resetPaymentFlow, clearBackNavigation } =
    useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const flowData = payload?.paymentFlowData;

  // Clear back navigation
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  const handleRetry = () => {
    // Go back to phone input
    pushView("subscription-phone");
  };

  const handleChangeMethod = () => {
    // Go back to method selection
    pushView("subscription-method");
  };

  const handleClose = () => {
    resetPaymentFlow();
    closeDrawer();
  };

  if (!checkoutData) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <div className="mb-6">
        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <XmarkCircle className="w-10 h-10 text-red-600" />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#171717] mb-2">
          {t("paymentFailed")}
        </h2>
        <p className="text-gray-600">
          {flowData?.paymentError?.message || t("youWereNotCharged")}
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleRetry}
          className="w-full px-5 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
        >
          {t("tryAgain")}
        </button>

        <button
          onClick={handleChangeMethod}
          className="w-full px-5 py-3 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors"
        >
          {t("useDifferentMethod")}
        </button>

        <button
          onClick={handleClose}
          className="w-full px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
