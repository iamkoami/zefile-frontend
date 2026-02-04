"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CreditCard,
  SmartphoneDevice,
  CheckCircle,
  XmarkCircle,
  Crown,
  Sparks,
  NavArrowDown,
  RefreshDouble,
  InfoCircle,
} from "iconoir-react";
import { TierDetailsSummary } from "./TierDetailsSummary";
import LoadingPanel from "@/components/LoadingPanel";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useDrawerStore, PaymentMethodInfo } from "@/stores/drawer-store";
import { useCurrencyStore, COUNTRY_CONFIG, ALL_COUNTRY_CODES } from "@/stores/currency-store";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import {
  subscriptionApi,
  formatSubscriptionPrice,
  getFirstChargeDate,
  getNextBillingDate,
  getPricingForCountry,
  getTierPriceMinorUnits,
} from "@/services/subscription-api";
import { toast } from "@/components/shared/Toast";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import type { CountryCode } from "libphonenumber-js";
import { authApi } from "@/services/auth-api";


/**
 * Mobile money provider info from API
 */
interface MobileMoneyProviderInfo {
  provider: MobileMoneyProvider;
  name: string;
  icon: string;
}

type CheckoutStep =
  | "country"
  | "method"
  | "phone"
  | "processing"
  | "success"
  | "failed";

/**
 * SubscriptionCheckoutPanel - Handles subscription payment flow
 * Step 1: User selects country
 * Step 2: User selects payment method (based on country)
 * Step 3: For mobile money, enter phone number
 * Step 4: Processing/Success/Failed
 */
export function SubscriptionCheckoutPanel() {
  const t = useTranslations("payment");
  const tSub = useTranslations("subscriptions");
  const { payload, popView, closeDrawer, setPaymentMethod, resetPaymentFlow } =
    useDrawerStore();

  const checkoutData = payload?.subscriptionCheckout;
  const user = authApi.getStoredUser();

  // Use global currency store for country selection
  const { countryCode: selectedCountry, setCountryCode: setSelectedCountry, hydrate, isHydrated } = useCurrencyStore();

  // Hydrate store from localStorage on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [step, setStep] = useState<CheckoutStep>("country");
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodInfo | null>(null);
  const [mobileMoneyProviders, setMobileMoneyProviders] = useState<
    MobileMoneyProviderInfo[]
  >([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Phone input state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>("GH");

  // Payment status state
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [error, setError] = useState<string>("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate price based on selected country
  const pricing = getPricingForCountry(selectedCountry);
  const currentAmount = checkoutData
    ? getTierPriceMinorUnits(
        checkoutData.tier,
        checkoutData.billingPeriod,
        selectedCountry,
      )
    : 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Fetch payment methods for selected country
  const fetchPaymentMethods = async (countryCode: string) => {
    setLoadingProviders(true);
    try {
      let url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods`;

      if (countryCode && countryCode !== "DEFAULT") {
        url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${countryCode}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      setMobileMoneyProviders(data.mobileMoney || []);
    } catch (error) {
      console.error("Failed to fetch payment methods:", error);
      // Fallback to common providers
      setMobileMoneyProviders([
        { provider: "mtn_momo", name: "MTN Mobile Money", icon: "mtn" },
        { provider: "vodafone_cash", name: "Vodafone Cash", icon: "vodafone" },
        { provider: "airtel_tigo", name: "AirtelTigo Money", icon: "airtel" },
        { provider: "mpesa", name: "M-Pesa", icon: "mpesa" },
        { provider: "orange_money", name: "Orange Money", icon: "orange" },
        { provider: "wave", name: "Wave", icon: "wave" },
      ]);
    } finally {
      setLoadingProviders(false);
    }
  };

  // Handle country selection and proceed to payment methods
  const handleCountrySelect = async (countryCode: string) => {
    setSelectedCountry(countryCode);
    setIsCountryDropdownOpen(false);
  };

  const handleContinueFromCountry = async () => {
    await fetchPaymentMethods(selectedCountry);
    setStep("method");
  };

  const handleSelectMethod = (method: PaymentMethodInfo) => {
    setSelectedMethod(method);
  };

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    [],
  );

  const startPolling = (reference: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const response =
          await subscriptionApi.getSubscriptionPaymentStatus(reference);
        if (response.data) {
          if (response.data.status === "SUCCESS") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setStep("success");
            toast.success(tSub("upgradeSuccess"));
          } else if (
            response.data.isTerminal &&
            response.data.status !== "PENDING"
          ) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setError(response.data.failureReason || t("paymentFailed"));
            setStep("failed");
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    // Stop after 2 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }, 120000);
  };

  const handleContinueFromMethod = async () => {
    if (!selectedMethod || !checkoutData || !user?.email) return;

    setPaymentMethod(selectedMethod);

    if (selectedMethod.type === "mobile_money") {
      setStep("phone");
    } else {
      // Card payment - redirect to Paystack
      setIsLoading(true);
      try {
        const response = await subscriptionApi.initializeSubscription({
          tier: checkoutData.tier,
          billingPeriod: checkoutData.billingPeriod,
          customerEmail: user.email,
          paymentMethod: "card",
          countryCode: selectedCountry === "DEFAULT" ? "NG" : selectedCountry,
          callbackUrl: `${window.location.origin}/subscription/callback`,
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          return;
        }

        if (response.data?.authorizationUrl) {
          window.location.href = response.data.authorizationUrl;
        }
      } catch (error) {
        console.error("Subscription initialization failed:", error);
        toast.error(t("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmitPhone = async () => {
    if (!isPhoneValid || !checkoutData || !selectedMethod || !user?.email)
      return;

    setIsLoading(true);

    try {
      const response = await subscriptionApi.initializeSubscription({
        tier: checkoutData.tier,
        billingPeriod: checkoutData.billingPeriod,
        customerEmail: user.email,
        paymentMethod: "mobile_money",
        mobileMoneyProvider: selectedMethod.provider,
        phoneNumber: phoneNumber,
        countryCode: selectedCountry === "DEFAULT" ? "NG" : selectedCountry,
      });

      if (response.error) {
        toast.error(response.error.message || t("paymentInitFailed"));
        setIsLoading(false);
        return;
      }

      if (response.data) {
        setPaymentReference(response.data.reference);
        setStep("processing");
        startPolling(response.data.reference);
      }
    } catch (error) {
      console.error("Mobile money payment initialization failed:", error);
      toast.error(t("paymentInitFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError("");
    setStep("phone");
  };

  const handleChangeMethod = () => {
    setError("");
    setStep("method");
    setSelectedMethod(null);
  };

  const handleClose = () => {
    resetPaymentFlow();
    closeDrawer();
  };

  const handleBackToPlans = () => {
    popView();
  };

  const getProviderIconPath = (icon: string): string => {
    return `/icons/payment/${icon}.svg`;
  };

  const isMethodSelected = (method: PaymentMethodInfo): boolean => {
    if (!selectedMethod) return false;
    if (method.type === "card" && selectedMethod.type === "card") return true;
    if (
      method.type === "mobile_money" &&
      selectedMethod.type === "mobile_money" &&
      method.provider === selectedMethod.provider
    ) {
      return true;
    }
    return false;
  };

  const getTierIcon = () => {
    if (checkoutData?.tier === "pro") {
      return <Crown className="w-6 h-6 text-[#5E53E0]" />;
    }
    return <Sparks className="w-6 h-6 text-[#87E64B]" />;
  };

  const getTierName = () => {
    if (checkoutData?.tier === "pro") return tSub("tiers.pro.name");
    if (checkoutData?.tier === "starter") return tSub("tiers.starter.name");
    return tSub("tiers.free.name");
  };

  const getBillingText = () => {
    return checkoutData?.billingPeriod === "annual"
      ? tSub("perYear")
      : tSub("perMonth");
  };

  if (!checkoutData || !isHydrated) {
    return <LoadingPanel fullHeight />;
  }

  // Country Selection Step
  if (step === "country") {
    return (
      <div className="flex flex-col lg:flex-row gap-8 max-w-4xl mx-auto">
        {/* Left: Checkout Form */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">{getTierIcon()}</div>
              <div>
                <h2 className="text-2xl font-semibold text-[#171717]">
                  {tSub("upgradeToTier", { tier: getTierName() })}
                </h2>
                <p className="text-sm text-gray-600">
                  {checkoutData.billingPeriod === "annual"
                    ? tSub("billedAnnually")
                    : tSub("billedMonthly")}
                </p>
              </div>
            </div>
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
                  <span className="text-lg">
                    {COUNTRY_CONFIG[selectedCountry]?.flag ||
                      COUNTRY_CONFIG.DEFAULT.flag}
                  </span>
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
                    className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    role="listbox"
                  >
                    {ALL_COUNTRY_CODES.map(
                      (code) => (
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
                          <span className="text-lg">
                            {COUNTRY_CONFIG[code]?.flag}
                          </span>
                          {COUNTRY_CONFIG[code]?.name}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Price Display - Only show on mobile, hidden on lg where summary is visible */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg lg:hidden">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t("amount")}</span>
              <span className="text-2xl font-bold text-[#171717]">
                {formatSubscriptionPrice(currentAmount, pricing.currency)}
                <span className="text-sm font-normal text-gray-500 ml-1">
                  {getBillingText()}
                </span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleContinueFromCountry}
              className="w-full px-5 py-3 text-sm font-medium text-[#171717] bg-[#87E64B] rounded hover:bg-[#78d43f] transition-colors"
            >
              {t("continue")}
            </button>

            <button
              onClick={handleBackToPlans}
              className="w-full px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {tSub("backToPlans")}
            </button>
          </div>
        </div>

        {/* Right: Tier Summary - Hidden on mobile */}
        <div className="hidden lg:block w-90 flex-shrink-0">
          <TierDetailsSummary
            tier={checkoutData.tier}
            billingPeriod={checkoutData.billingPeriod}
            countryCode={selectedCountry}
          />
        </div>
      </div>
    );
  }

  // Payment Method Selection Step
  if (step === "method") {
    // Calculate billing dates
    const firstChargeDate = getFirstChargeDate();
    const nextBillingDate = getNextBillingDate(checkoutData.billingPeriod);

    return (
      <div className="flex flex-col lg:flex-row gap-8 max-w-4xl mx-auto">
        {/* Left: Checkout Form */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">{getTierIcon()}</div>
              <div>
                <h2 className="text-2xl font-semibold text-[#171717]">
                  {tSub("upgradeToTier", { tier: getTierName() })}
                </h2>
                <p className="text-sm text-gray-600">
                  {checkoutData.billingPeriod === "annual"
                    ? tSub("billedAnnually")
                    : tSub("billedMonthly")}
                </p>
              </div>
            </div>
            {/* Price - Only show on mobile */}
            <p className="text-3xl font-bold text-[#171717] lg:hidden">
              {formatSubscriptionPrice(currentAmount, pricing.currency)}
              <span className="text-lg font-normal text-gray-500 ml-1">
                {getBillingText()}
              </span>
            </p>

            {/* Billing Summary (AC2 compliance - first charge date) */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{tSub("firstChargeDate")}</span>
                <span className="font-medium text-[#171717]">
                  {tSub("today")}
                </span>
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
          </div>

          {/* Payment Methods */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-4">
              {t("choosePaymentMethod")}
            </p>

            {loadingProviders ? (
              <LoadingPanel className="py-4" />
            ) : (
              <div
                className="space-y-3"
                role="radiogroup"
                aria-label={t("paymentMethods")}
              >
                {/* Mobile Money Options */}
                {mobileMoneyProviders.map((provider) => {
                  const method: PaymentMethodInfo = {
                    type: "mobile_money",
                    provider: provider.provider,
                  };
                  const isSelected = isMethodSelected(method);

                  return (
                    <button
                      key={provider.provider}
                      onClick={() => handleSelectMethod(method)}
                      className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:ring-offset-2 ${
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
                              setFailedIcons((prev) =>
                                new Set(prev).add(provider.icon),
                              );
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[#171717]">
                            {provider.name}
                          </span>
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
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Card Option */}
                <button
                  onClick={() => handleSelectMethod({ type: "card" })}
                  className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:ring-offset-2 ${
                    selectedMethod?.type === "card"
                      ? "border-[#5E53E0] bg-[#5E53E0]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  role="radio"
                  aria-checked={selectedMethod?.type === "card"}
                  aria-label={t("payWithCard")}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                    <CreditCard className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#171717]">
                        {t("payWithCard")}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                        <RefreshDouble className="w-3 h-3" />
                        {tSub("autoRenews")}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod?.type === "card"
                        ? "border-[#5E53E0]"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedMethod?.type === "card" && (
                      <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* Auto-renewal info box based on selected method */}
            {selectedMethod && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                  selectedMethod.type === "card"
                    ? "bg-green-50 border border-green-200"
                    : "bg-amber-50 border border-amber-200"
                }`}
              >
                <InfoCircle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    selectedMethod.type === "card"
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                />
                <div className="text-sm">
                  {selectedMethod.type === "card" ? (
                    <>
                      <p className="font-medium text-green-800 mb-1">
                        {tSub("autoRenewalEnabled")}
                      </p>
                      <p className="text-green-700">
                        {tSub("cardAutoRenewalDescription")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-amber-800 mb-1">
                        {tSub("manualRenewalRequired")}
                      </p>
                      <p className="text-amber-700">
                        {tSub("mobileMoneyRenewalDescription")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleContinueFromMethod}
              disabled={!selectedMethod || isLoading}
              className="w-full px-5 py-3 text-sm font-medium text-[#171717] bg-[#87E64B] rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t("continue")}
            </button>

            <button
              onClick={() => setStep("country")}
              disabled={isLoading}
              className="w-full px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              {tSub("previous")}
            </button>
          </div>
        </div>

        {/* Right: Tier Summary - Hidden on mobile */}
        <div className="hidden lg:block w-90 flex-shrink-0">
          <TierDetailsSummary
            tier={checkoutData.tier}
            billingPeriod={checkoutData.billingPeriod}
            countryCode={selectedCountry}
          />
        </div>
      </div>
    );
  }

  // Phone Input Step
  if (step === "phone") {
    return (
      <div className="flex flex-col lg:flex-row gap-8 max-w-4xl mx-auto">
        {/* Left: Phone Input Form */}
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-[#171717]">
              {t("enterPhoneNumber")}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
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

          <div className="flex gap-3">
            <button
              onClick={() => setStep("method")}
              disabled={isLoading}
              className="flex-1 px-5 py-3 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {tSub("previous")}
            </button>
            <button
              onClick={handleSubmitPhone}
              disabled={!isPhoneValid || isLoading}
              className="flex-1 px-5 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t("continue")}
            </button>
          </div>
        </div>

        {/* Right: Tier Summary - Hidden on mobile */}
        <div className="hidden lg:block w-90 flex-shrink-0">
          <TierDetailsSummary
            tier={checkoutData.tier}
            billingPeriod={checkoutData.billingPeriod}
            countryCode={selectedCountry}
          />
        </div>
      </div>
    );
  }

  // Processing Step
  if (step === "processing") {
    return (
      <div className="max-w-lg mx-auto text-center">
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
            <span className="font-medium">{getTierName()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">{t("amount")}</span>
            <span className="font-bold text-lg">
              {formatSubscriptionPrice(currentAmount, pricing.currency)}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          {t("waitingForConfirmation")}
        </p>

        <button
          onClick={handleClose}
          className="w-full px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          {t("cancel")}
        </button>
      </div>
    );
  }

  // Success Step
  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto text-center">
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
            {tSub("upgradeSuccessMessage", { tier: getTierName() })}
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

  // Failed Step
  if (step === "failed") {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <XmarkCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#171717] mb-2">
            {t("paymentFailed")}
          </h2>
          <p className="text-gray-600">{error || t("youWereNotCharged")}</p>
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

  return null;
}

export default SubscriptionCheckoutPanel;
