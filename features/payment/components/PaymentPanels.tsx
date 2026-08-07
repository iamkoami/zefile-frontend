"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Flag from "react-flagpack";
import {
  CreditCard,
  SmartphoneDevice,
  CheckCircle,
  XmarkCircle,
  WarningCircle,
  Lock,
  NavArrowDown,
  Clock,
  Bank,
  Hashtag,
  Globe,
} from "iconoir-react";
import LoadingPanel from "@/components/LoadingPanel";
import { useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import { paymentApi, type PaymentMethodInfo } from "@/services/payment-api";
import { toast } from "@/components/shared/Toast";
import { TransferSummaryCard } from "@/components/shared/TransferSummaryCard";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import type { CountryCode } from "libphonenumber-js";
import usePaymentStatus from "@/hooks/usePaymentStatus";
import { useCurrencyStore } from "@/stores/currency-store";
import { getCurrentUserEmail, getCurrentUserName } from "@/utils/auth";
import { safePaymentRedirect } from "@/utils/security";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { trackPaymentMethodSelected, trackPaymentSubmitted } from "@/lib/posthog";
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstile } from "@/hooks/useTurnstile";
import { setCaptchaToken } from "@/services/api-client";
import { minorToMajorUnits } from "@/lib/currency";

// Supported countries for payment — methods are fetched from API per country
const PAYMENT_COUNTRIES = [
  { code: "CI", name: "Côte d'Ivoire", flagCode: "CI" as string | null, phoneCode: "CI" as CountryCode | null },
  { code: "NG", name: "Nigeria", flagCode: "NG" as string | null, phoneCode: "NG" as CountryCode | null },
  { code: "GH", name: "Ghana", flagCode: "GH" as string | null, phoneCode: "GH" as CountryCode | null },
  { code: "KE", name: "Kenya", flagCode: "KE" as string | null, phoneCode: "KE" as CountryCode | null },
  { code: "TG", name: "Togo", flagCode: "TG" as string | null, phoneCode: "TG" as CountryCode | null },
  { code: "BJ", name: "Benin", flagCode: "BJ" as string | null, phoneCode: "BJ" as CountryCode | null },
  { code: "INTL", name: "International", flagCode: null, phoneCode: null },
];

// Provider icon mapping (used by PaymentPhonePanel)
const getProviderIcon = (provider: string): string => {
  const iconMap: Record<string, string> = {
    mtn_momo: "/icons/payment/mtn.svg",
    vodafone_cash: "/icons/payment/vodafone.svg",
    airtel_tigo: "/icons/payment/airtel.svg",
    mpesa: "/icons/payment/mpesa.svg",
    airtel_money: "/icons/payment/airtel.svg",
    orange_money: "/icons/payment/orange.svg",
    wave: "/icons/payment/wave.svg",
    flooz: "/icons/payment/orange.svg",
    tmoney: "/icons/payment/mtn.svg",
  };
  return iconMap[provider] || "/icons/payment/mtn.svg";
};

// ============================================
// PaymentMethodPanel - Step 1: Select payment method
// ============================================

export function PaymentMethodPanel() {
  const t = useTranslations("payment");
  const { getToken: getTurnstileToken, isEnabled: turnstileEnabled, turnstileRef, siteKey, onSuccess: onTurnstileSuccess, onError: onTurnstileError, onExpire: onTurnstileExpire } = useTurnstile();
  const {
    selectedTransfer,
    payload,
    pushView,
    popView,
    canGoBack,
    setPaymentMethod,
    setPaymentFlowData,
    closeDrawer,
    setOnBeforeBack,
    resetPaymentFlow,
  } = useDrawerStore();

  // Get global currency selection to default country
  const { countryCode: globalCountryCode } = useCurrencyStore();

  // Logged-in user detection
  const isLoggedIn = !!getCurrentUserEmail();
  const loggedInName = getCurrentUserName();

  // Map global currency country to payment country (DEFAULT -> INTL)
  const getDefaultCountry = () => {
    if (globalCountryCode === "DEFAULT") {
      return (
        PAYMENT_COUNTRIES.find((c) => c.code === "INTL") ||
        PAYMENT_COUNTRIES[PAYMENT_COUNTRIES.length - 1]
      );
    }
    return (
      PAYMENT_COUNTRIES.find((c) => c.code === globalCountryCode) ||
      PAYMENT_COUNTRIES[0]
    );
  };

  const [customerName, setCustomerName] = useState("");
  // Priority: logged-in user email > flow data email > empty
  const [customerEmail, setCustomerEmail] = useState(() => {
    const loggedInEmail = getCurrentUserEmail();
    return loggedInEmail || payload?.paymentFlowData?.senderEmail || "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(getDefaultCountry);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // API-driven payment methods (replaces hardcoded capability flags)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodInfo | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>(() => {
    const defaultCountry = getDefaultCountry();
    return (
      defaultCountry.phoneCode || "GH"
    ) as CountryCode;
  });

  const transfer = selectedTransfer;

  // Pre-fill email: prioritize logged-in user, then flow data
  useEffect(() => {
    const loggedInEmail = getCurrentUserEmail();
    if (loggedInEmail) {
      setCustomerEmail(loggedInEmail);
    } else if (payload?.paymentFlowData?.senderEmail) {
      setCustomerEmail(payload.paymentFlowData.senderEmail);
    }
  }, [payload?.paymentFlowData?.senderEmail]);

  // Set custom back handler for payment method screen
  // If opened from inside drawer (has stack), go back to previous view
  // If opened from outside (no stack), close drawer
  useEffect(() => {
    setOnBeforeBack(() => {
      // Cancel any pending payment (fire and forget - don't block navigation)
      const reference = payload?.paymentFlowData?.paymentReference;
      if (reference) {
        paymentApi.cancelPayment(reference).catch(() => {
          console.error("Failed to cancel payment:", reference);
        });
      }
      resetPaymentFlow();

      // If there's a navigation stack, go back to previous view (e.g., transfer details)
      if (canGoBack()) {
        popView();
      } else {
        closeDrawer();
      }
      return true; // Handler took care of it
    });

    // Cleanup on unmount
    return () => setOnBeforeBack(null);
  }, [setOnBeforeBack, closeDrawer, popView, canGoBack, resetPaymentFlow, payload?.paymentFlowData?.paymentReference]);

  // Fetch payment methods from API when country changes
  useEffect(() => {
    setSelectedMethod(null);

    // International: card only, no API call needed
    if (selectedCountry.code === "INTL") {
      setPaymentMethods([{ type: "card", name: "Card", provider: "card", icon: "card" }]);
      setLoadingMethods(false);
      return;
    }

    const fetchMethods = async () => {
      setLoadingMethods(true);
      try {
        const response = await paymentApi.getPaymentMethods(selectedCountry.code);
        if (response.data?.methods) {
          setPaymentMethods(response.data.methods);
        } else {
          setPaymentMethods([]);
        }
      } catch {
        setPaymentMethods([]);
      } finally {
        setLoadingMethods(false);
      }
    };
    fetchMethods();

    // Update phone country to match selected country
    if (selectedCountry.phoneCode) {
      setPhoneCountryCode(selectedCountry.phoneCode);
    }
  }, [selectedCountry.code, selectedCountry.phoneCode]);

  // Split methods into mobile money and other types
  const momoMethods = useMemo(
    () => paymentMethods.filter((m) => m.type === "mobile_money"),
    [paymentMethods],
  );
  const cardMethod = useMemo(
    () => paymentMethods.find((m) => m.type === "card"),
    [paymentMethods],
  );
  const otherMethods = useMemo(
    () => paymentMethods.filter((m) => m.type !== "mobile_money" && m.type !== "card"),
    [paymentMethods],
  );

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    [],
  );

  const getProviderIconPath = (icon: string): string => {
    return `/icons/payment/${icon}.svg`;
  };

  const handleContinue = async () => {
    if (!selectedMethod || !transfer) return;

    // Validate email
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(t("invalidEmail"));
      return;
    }

    // Update flow data with email
    setPaymentFlowData({ senderEmail: customerEmail });

    trackPaymentMethodSelected(selectedMethod.type === "mobile_money" ? "mobile_money" : "card");

    if (selectedMethod.type === "mobile_money") {
      // Validate phone number for mobile money
      if (!isPhoneValid) {
        toast.error(t("invalidPhoneNumber"));
        return;
      }

      setIsLoading(true);
      try {
        setPaymentMethod({ type: "mobile_money", provider: selectedMethod.provider as MobileMoneyProvider });

        setCaptchaToken(await getTurnstileToken());
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "mobile_money",
          mobileMoneyProvider: selectedMethod.provider as MobileMoneyProvider,
          phoneNumber: phoneNumber,
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          setIsLoading(false);
          return;
        }

        if (response.data) {
          trackPaymentSubmitted({ method: "mobile_money", amount: response.data.pricingAmountMinorUnits, currency: transfer.currency });
          setPaymentFlowData({
            senderEmail: customerEmail,
            phoneNumber,
            phoneCountryCode,
            isPhoneValid: true,
            paymentReference: response.data.reference,
            paymentAmount: response.data.pricingAmountMinorUnits,
          });
          pushView("payment-prompt");
        }
      } catch {
        toast.error(t("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    } else if (selectedMethod.type === "card") {
      trackPaymentSubmitted({ method: "card", currency: transfer.currency });
      setPaymentMethod({ type: "card" });
      setPaymentFlowData({
        senderEmail: customerEmail,
        lastPaymentMethod: "card",
      });
      pushView("payment-card");
    } else {
      // For bank_transfer, ussd — redirect to payment gateway checkout
      setIsLoading(true);
      try {
        type PaystackChannel = "card" | "bank_transfer" | "ussd" | "bank" | "qr";
        const channelMap: Record<string, PaystackChannel> = {
          bank_transfer: "bank_transfer",
          ussd: "ussd",
        };
        const preferredChannel: PaystackChannel =
          channelMap[selectedMethod.type] || "bank_transfer";

        setCaptchaToken(await getTurnstileToken());
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "card",
          preferredChannel,
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          return;
        }

        if (response.data?.authorizationUrl) {
          trackPaymentSubmitted({ method: selectedMethod.type, currency: transfer.currency });
          try {
            safePaymentRedirect(response.data.authorizationUrl);
          } catch {
            toast.error(t("paymentInitFailed"));
          }
        }
      } catch {
        toast.error(t("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => {
      const fileSize = Number(file.fileSize) || Number(file.size) || 0;
      return acc + fileSize;
    }, 0);
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  // Validation: method selected + email + phone (for mobile money)
  const isFormValid = (() => {
    if (!selectedMethod || !customerEmail) return false;
    if (selectedMethod.type === "mobile_money") {
      return isPhoneValid;
    }
    return true;
  })();

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {turnstileEnabled && (
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          options={{ size: 'invisible' }}
          onSuccess={onTurnstileSuccess}
          onError={onTurnstileError}
          onExpire={onTurnstileExpire}
        />
      )}
      {/* Left Column - Payment Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
            {t("securePayment")}
          </h2>
          <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] mt-1 text-sm">
            {t("makePaymentToDownload")}
          </p>
        </div>

        {/* Name Input — hidden when logged in and user has a name */}
        {(!isLoggedIn || !loggedInName) && (
          <div className="mb-3">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t("yourName")}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder:text-gray-400 dark:placeholder-[oklch(0.60_0_0)] bg-white dark:bg-[oklch(0.22_0_0)] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
            />
          </div>
        )}

        {/* Email Input — hidden when logged in (auto-filled from stored email) */}
        {!isLoggedIn && (
          <div className="mb-5">
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder={t("yourEmail")}
              className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder:text-gray-400 dark:placeholder-[oklch(0.60_0_0)] bg-white dark:bg-[oklch(0.22_0_0)] focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
            />
          </div>
        )}

        {/* Payment Method Section */}
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-2">
            {t("paymentMethodTitle")}
          </p>

          {/* Country Selector */}
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] bg-white dark:bg-[oklch(0.22_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors"
            >
              <div className="flex items-center gap-2">
                {selectedCountry.flagCode ? (
                  <Flag code={selectedCountry.flagCode} size="s" hasBorder={false} />
                ) : (
                  <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
                )}
                <span className="text-sm font-medium">
                  {selectedCountry.name}
                </span>
              </div>
              <NavArrowDown
                className={`w-4 h-4 text-gray-400 dark:text-[oklch(0.60_0_0)] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCountryDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded shadow-lg dark:shadow-black/30 max-h-[220px] overflow-y-auto">
                {PAYMENT_COUNTRIES.map((country) => {
                  const isSelected = selectedCountry.code === country.code;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsCountryDropdownOpen(false);
                        // Reset phone when country changes
                        setPhoneNumber("");
                        setIsPhoneValid(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] text-left ${
                        isSelected ? "bg-gray-50 dark:bg-[oklch(0.22_0_0)]" : ""
                      }`}
                    >
                      {country.flagCode ? (
                        <Flag code={country.flagCode} size="s" hasBorder={false} />
                      ) : (
                        <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
                      )}
                      <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)]">{country.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Methods Grid — API-driven */}
          {loadingMethods ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-gray-300 dark:border-[oklch(0.30_0_0)] border-t-[#5E53E0] rounded-full animate-spin" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] py-4 text-center">
              {t("noMethodsAvailable")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Mobile Money Providers */}
              {momoMethods.map((method) => {
                const isSelected =
                  selectedMethod?.type === "mobile_money" &&
                  selectedMethod?.provider === method.provider;
                return (
                  <button
                    key={method.provider}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                      isSelected
                        ? "border-[#5E53E0] bg-[#5E53E0]/5"
                        : "border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                    }`}
                  >
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                      {failedIcons.has(method.icon) ? (
                        <SmartphoneDevice className="w-4 h-4 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
                      ) : (
                        <Image
                          src={getProviderIconPath(method.icon)}
                          alt={method.name}
                          width={16}
                          height={16}
                          onError={() => {
                            setFailedIcons((prev) => new Set(prev).add(method.icon));
                          }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
                      {method.name}
                    </span>
                  </button>
                );
              })}

              {/* Other methods (bank_transfer, ussd, etc.) */}
              {otherMethods.map((method) => {
                const isSelected =
                  selectedMethod?.type === method.type &&
                  selectedMethod?.provider === method.provider;
                const MethodIcon = method.type === "bank_transfer" ? Bank
                  : method.type === "ussd" ? Hashtag
                  : SmartphoneDevice;
                return (
                  <button
                    key={`${method.type}-${method.provider}`}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                      isSelected
                        ? "border-[#5E53E0] bg-[#5E53E0]/5"
                        : "border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                    }`}
                  >
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                      <MethodIcon className="w-4 h-4 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
                    </div>
                    <span className="text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
                      {method.name}
                    </span>
                  </button>
                );
              })}

              {/* Card Option */}
              {cardMethod && (
                <button
                  type="button"
                  onClick={() => setSelectedMethod(cardMethod)}
                  className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                    selectedMethod?.type === "card"
                      ? "border-[#5E53E0] bg-[#5E53E0]/5"
                      : "border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                  }`}
                >
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                    <CreditCard className="w-4 h-4 text-gray-500 dark:text-[oklch(0.75_0_0)]" />
                  </div>
                  <span className="text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
                    {cardMethod.name}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Phone Number — shown when mobile money is selected */}
          {selectedMethod?.type === "mobile_money" && (
            <div className="mt-3">
              <PhoneNumberInput
                value={phoneNumber}
                onChange={handlePhoneChange}
                defaultCountry={selectedCountry.phoneCode || "CI"}
                countryCode={selectedCountry.phoneCode || "CI"}
                hideCountrySelector
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 mb-6">
          <button
            onClick={closeDrawer}
            disabled={isLoading}
            className="px-8 py-3 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-bold rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleContinue}
            disabled={!isFormValid || isLoading}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? t("processing") : t("payAndDownload")}
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-[oklch(0.75_0_0)]">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{t("securityGuarantee")}</p>
        </div>
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-full lg:w-[450px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PaymentPhonePanel - Step 2: Enter phone number
// ============================================

export function PaymentPhonePanel() {
  const t = useTranslations("payment");
  const { getToken: getTurnstileToken, isEnabled: turnstileEnabled, turnstileRef: phoneTurnstileRef, siteKey, onSuccess: onTurnstileSuccess, onError: onTurnstileError, onExpire: onTurnstileExpire } = useTurnstile();
  const {
    selectedTransfer,
    payload,
    pushView,
    popView,
    setPaymentFlowData,
    setPaymentMethod,
  } = useDrawerStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>("GH");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<MobileMoneyProvider | null>(null);
  const [providers, setProviders] = useState<
    Array<{ provider: MobileMoneyProvider; name: string; icon: string }>
  >([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const transfer = selectedTransfer;
  const senderEmail = payload?.paymentFlowData?.senderEmail || "";

  // Fetch mobile money providers
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const cachedCountry = localStorage.getItem("zefile_detected_country");
        let url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods`;
        if (cachedCountry) {
          url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${cachedCountry}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        if (data.countryCode && data.countryCode !== "UNKNOWN") {
          localStorage.setItem("zefile_detected_country", data.countryCode);
        }
        setProviders(data.mobileMoney || []);
        // Auto-select first provider
        if (data.mobileMoney?.length > 0) {
          setSelectedProvider(data.mobileMoney[0].provider);
        }
      } catch {
        // Fallback providers
        const fallback = [
          {
            provider: "mtn_momo" as MobileMoneyProvider,
            name: "MTN Mobile Money",
            icon: "mtn",
          },
          {
            provider: "vodafone_cash" as MobileMoneyProvider,
            name: "Vodafone Cash",
            icon: "vodafone",
          },
          {
            provider: "airtel_tigo" as MobileMoneyProvider,
            name: "AirtelTigo Money",
            icon: "airtel",
          },
        ];
        setProviders(fallback);
        setSelectedProvider("mtn_momo");
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, []);

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    [],
  );

  const handleSubmit = async () => {
    if (!isPhoneValid || !transfer || !selectedProvider) {
      return;
    }

    setIsLoading(true);

    try {
      // Update payment method with selected provider
      setPaymentMethod({ type: "mobile_money", provider: selectedProvider });

      setCaptchaToken(await getTurnstileToken());
      const response = await paymentApi.initializePaymentV2({
        transferId: transfer.id,
        customerEmail: senderEmail,
        requestedCurrency: transfer.currency,
        paymentMethod: "mobile_money",
        mobileMoneyProvider: selectedProvider,
        phoneNumber: phoneNumber,
      });

      if (response.error) {
        toast.error(response.error.message || t("paymentInitFailed"));
        setIsLoading(false);
        return;
      }

      if (response.data) {
        // Store payment data and go to prompt step
        setPaymentFlowData({
          phoneNumber,
          phoneCountryCode,
          isPhoneValid: true,
          paymentReference: response.data.reference,
          paymentAmount: response.data.pricingAmountMinorUnits,
        });
        pushView("payment-prompt");
      }
    } catch {
      toast.error(t("paymentInitFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => {
      const fileSize = Number(file.fileSize) || Number(file.size) || 0;
      return acc + fileSize;
    }, 0);
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  return (
    <div className="flex gap-8 max-w-5xl mx-auto">
      {turnstileEnabled && (
        <Turnstile
          ref={phoneTurnstileRef}
          siteKey={siteKey}
          options={{ size: 'invisible' }}
          onSuccess={onTurnstileSuccess}
          onError={onTurnstileError}
          onExpire={onTurnstileExpire}
        />
      )}
      {/* Left Column - Phone Input Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
            {t("enterPhoneNumber")}
          </h2>
          <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] mt-2">{t("enterPhoneForMobileMoney")}</p>
        </div>

        {/* Provider Selection */}
        {loadingProviders ? (
          <div className="flex items-center justify-center py-8">
            <LoadingPanel />
          </div>
        ) : (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
              {t("selectProvider")}
            </h3>
            <div className="flex flex-wrap gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.provider}
                  onClick={() => setSelectedProvider(provider.provider)}
                  className={`px-4 py-2 border-2 rounded font-medium transition-all ${
                    selectedProvider === provider.provider
                      ? "border-[#5E53E0] bg-[#5E53E0]/5 text-[#5E53E0]"
                      : "border-gray-200 dark:border-[oklch(0.30_0_0)] text-gray-700 dark:text-[oklch(0.75_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                  }`}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phone Input */}
        <div className="mb-8">
          <PhoneNumberInput
            value={phoneNumber}
            onChange={handlePhoneChange}
            defaultCountry={phoneCountryCode}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={popView}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isPhoneValid || !selectedProvider || isLoading}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? t("processing") : t("payAndDownload")}
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-[oklch(0.75_0_0)]">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{t("securityGuarantee")}</p>
        </div>
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-[450px] flex-shrink-0">
        <div className="sticky top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PaymentPromptPanel - Step 3: STK Push waiting
// ============================================

export function PaymentPromptPanel() {
  const t = useTranslations("payment");
  const {
    selectedTransfer,
    payload,
    popView,
    pushView,
    closeDrawer,
    resetPaymentFlow,
    setPaymentFlowData,
  } = useDrawerStore();

  const transfer = selectedTransfer;
  const paymentMethod = payload?.paymentMethod;
  const flowData = payload?.paymentFlowData;

  const {
    pollingStatus,
    error,
    startPolling,
    stopPolling,
    reset: resetPolling,
  } = usePaymentStatus({
    interval: 3000,
    timeout: 120000, // 2 minutes
    onSuccess: () => {
      // Navigate to success panel instead of reloading
      setPaymentFlowData({
        transactionDetails: {
          reference: flowData?.paymentReference || "",
          amount: flowData?.paymentAmount || transfer?.price || 0,
          currency: transfer?.currency || "XOF",
          paidAt: new Date(),
        },
      });
      pushView("payment-success");
    },
    onFailed: (payment) => {
      // Navigate to failed panel
      setPaymentFlowData({
        paymentError: {
          code: "PAYMENT_FAILED",
          message: payment.failureReason || t("paymentFailed"),
        },
        lastPaymentMethod: "mobile_money",
      });
      pushView("payment-failed");
    },
    onTimeout: () => {
      // Keep showing the prompt, user can retry
    },
  });

  // Start polling when component mounts
  useEffect(() => {
    if (flowData?.paymentReference) {
      startPolling(flowData.paymentReference);
    }

    return () => {
      stopPolling();
    };
  }, [flowData?.paymentReference, startPolling, stopPolling]);

  const handleRetry = () => {
    resetPolling();
    popView(); // Go back to phone input
  };

  const handleChangeMethod = () => {
    resetPolling();
    resetPaymentFlow();
    // Go back to payment method selection (pop twice)
    popView();
    popView();
  };

  const handleCancel = async () => {
    // Stop polling first
    resetPolling();

    // Cancel the pending payment (fire and forget - don't block drawer close)
    const reference = flowData?.paymentReference;
    if (reference) {
      paymentApi.cancelPayment(reference).catch(() => {
        console.error("Failed to cancel payment:", reference);
      });
    }

    resetPaymentFlow();
    closeDrawer();
  };

  const getCurrencySymbol = (currency?: string): string => {
    const symbols: Record<string, string> = {
      XOF: "Fr CFA",
      NGN: "₦",
      GHS: "₵",
      KES: "KSh",
      ZAR: "R",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency || "XOF"] || currency || "";
  };

  const formatAmount = (amount: number, currency?: string): string => {
    // Story 144.7 — shared helper, not a hand-rolled `/ 100`.
    const majorUnits = minorToMajorUnits(amount, currency || "XOF");
    const symbol = getCurrencySymbol(currency);
    if (currency === "XOF") {
      return `${majorUnits.toLocaleString()} ${symbol}`;
    }
    return `${symbol}${majorUnits.toLocaleString()}`;
  };

  const getProviderName = (provider?: string): string => {
    const names: Record<string, string> = {
      mtn_momo: "MTN Mobile Money",
      vodafone_cash: "Vodafone Cash",
      airtel_tigo: "AirtelTigo Money",
      mpesa: "M-Pesa",
      airtel_money: "Airtel Money",
      orange_money: "Orange Money",
      wave: "Wave",
    };
    return names[provider || ""] || provider || "";
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => {
      const fileSize = Number(file.fileSize) || Number(file.size) || 0;
      return acc + fileSize;
    }, 0);
  };

  if (!transfer || !paymentMethod || !flowData) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const isSuccess = pollingStatus === "success";
  const isFailed = pollingStatus === "failed";
  const isTimeout = pollingStatus === "timeout";
  const isPolling = pollingStatus === "polling";

  return (
    <div className="flex gap-8 max-w-5xl mx-auto">
      {/* Left Column - Status */}
      <div className="flex-1 min-w-0">
        {/* Status Icon */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          ) : isFailed ? (
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XmarkCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          ) : isTimeout ? (
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <WarningCircle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-[#5E53E0]/10 rounded-full flex items-center justify-center animate-pulse">
              <Clock className="w-10 h-10 text-[#5E53E0]" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="mb-6">
          {isSuccess ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                {t("paymentSuccessful")}
              </h2>
              <p className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("redirectingToDownload")}</p>
            </>
          ) : isFailed ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                {t("paymentFailed")}
              </h2>
              <p className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{error || t("youWereNotCharged")}</p>
            </>
          ) : isTimeout ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                {t("takingLongerThanUsual")}
              </h2>
              <p className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("didntReceivePrompt")}</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                {t("checkYourPhone")}
              </h2>
              <p className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("confirmPaymentOn")}</p>
            </>
          )}
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("payWith")}</span>
            <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {getProviderName(paymentMethod.provider)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("phoneNumber")}</span>
            <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {flowData.phoneNumber}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("amount")}</span>
            <span className="font-bold text-lg text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {formatAmount(
                flowData.paymentAmount || transfer.price || 0,
                transfer.currency,
              )}
            </span>
          </div>
        </div>

        {/* Polling Status */}
        {isPolling && (
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-6">
            {t("waitingForConfirmation")}
          </p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {(isFailed || isTimeout) && (
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
            >
              {t("resend")}
            </button>
          )}

          {!isSuccess && (
            <button
              onClick={handleChangeMethod}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors"
            >
              {t("useDifferentMethod")}
            </button>
          )}

          {!isSuccess && (
            <button
              onClick={handleCancel}
              className="w-full px-6 py-2 text-sm font-medium text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-gray-800 dark:hover:text-[oklch(0.91_0_0)]"
            >
              {t("cancel")}
            </button>
          )}
        </div>
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-[450px] flex-shrink-0">
        <div className="sticky top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// CardPaymentPanel - Card payment via popup or hosted checkout (Epic 19, Story 19.5)
// ============================================

export function CardPaymentPanel() {
  const t = useTranslations("payment");
  const { getToken: getTurnstileToken, isEnabled: turnstileEnabled, turnstileRef: cardTurnstileRef, siteKey, onSuccess: onTurnstileSuccess, onError: onTurnstileError, onExpire: onTurnstileExpire } = useTurnstile();
  const {
    selectedTransfer,
    payload,
    pushView,
    setPaymentFlowData,
    closeDrawer,
    clearBackNavigation,
  } = useDrawerStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // Hide back button on card payment screen - popup is opening
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);
  const [initError, setInitError] = useState<string | null>(null);
  const hasInitialized = React.useRef(false);

  const transfer = selectedTransfer;
  const customerEmail = payload?.paymentFlowData?.senderEmail || "";

  useEffect(() => {
    if (hasInitialized.current || !transfer) return;
    hasInitialized.current = true;

    const initializePayment = async () => {
      try {
        // Initialize payment on backend
        setCaptchaToken(await getTurnstileToken());
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "card",
          preferredChannel: "card",
        });

        if (response.error || !response.data) {
          setInitError(response.error?.message || t("paymentInitFailed"));
          setIsInitializing(false);
          return;
        }

        // Store reference for later use
        setPaymentFlowData({
          paymentReference: response.data.reference,
          paymentAmount: response.data.pricingAmountMinorUnits,
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
          email: customerEmail,
          amount: response.data.pricingAmountMinorUnits,
          currency: response.data.pricingCurrency || transfer.currency,
          ref: response.data.reference,
          onSuccess: (transaction: { reference: string }) => {
            // Navigate to processing panel for confirmation polling
            setPaymentFlowData({
              paymentReference: transaction.reference,
              transactionDetails: {
                reference: transaction.reference,
                amount: response.data!.pricingAmountMinorUnits,
                currency: response.data!.pricingCurrency,
                paidAt: new Date(),
              },
            });
            pushView("payment-processing");
          },
          onCancel: () => {
            setPaymentFlowData({
              paymentError: {
                code: "CANCELLED",
                message: t("errorCancelled"),
              },
              lastPaymentMethod: "card",
            });
            pushView("payment-failed");
          },
          onLoad: () => {
            setIsInitializing(false);
          },
        });
      } catch (error) {
        console.error("Payment initialization failed:", error);
        setInitError(t("paymentInitFailed"));
        setIsInitializing(false);
      }
    };

    initializePayment();
  }, [transfer, customerEmail, pushView, setPaymentFlowData, t]);

  // Navigate back to payment method selection (using pushView since stack is cleared)
  const handleBack = () => {
    if (isInitializing || initError) {
      pushView("payment-method");
    }
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce(
      (sum, file) => sum + (Number(file.size) || Number(file.fileSize) || 0),
      0,
    );
  };

  if (initError) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 py-4">
        {/* Left Column - Error Content */}
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <XmarkCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 dark:text-[oklch(0.91_0_0)]">{t("paymentFailed")}</h2>
          <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] text-center mb-6">{initError}</p>
          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors"
            >
              {t("useDifferentMethod")}
            </button>
            <button
              onClick={closeDrawer}
              className="px-6 py-3 text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-gray-800 dark:hover:text-[oklch(0.91_0_0)]"
            >
              {t("cancel")}
            </button>
          </div>
        </div>

        {/* Right Column - Transfer Summary (Sticky) */}
        <div className="w-full lg:w-[450px] flex-shrink-0 order-first lg:order-last">
          <div className="lg:sticky lg:top-4">
            <TransferSummaryCard
              title={transfer.title || "Untitled"}
              fileCount={transfer.files?.length || 0}
              totalSize={calculateTotalSize()}
              price={transfer.price || 0}
              currency={transfer.currency || "XOF"}
              message={transfer.message}
              createdAt={transfer.createdAt}
              senderEmail={
                typeof transfer.senderId === "object"
                  ? transfer.senderId?.email
                  : undefined
              }
              versionCount={transfer.versionCount}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 py-4">
      {turnstileEnabled && (
        <Turnstile
          ref={cardTurnstileRef}
          siteKey={siteKey}
          options={{ size: 'invisible' }}
          onSuccess={onTurnstileSuccess}
          onError={onTurnstileError}
          onExpire={onTurnstileExpire}
        />
      )}
      {/* Left Column - Loading Content */}
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        {/* Card icons */}
        <div className="flex gap-3 mb-6">
          <Image
            src="/icons/payment/visa.svg"
            alt="Visa"
            width={48}
            height={32}
            className="h-8 w-auto"
          />
          <Image
            src="/icons/payment/mastercard.svg"
            alt="Mastercard"
            width={48}
            height={32}
            className="h-8 w-auto"
          />
        </div>

        {/* Loading message */}
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <Clock className="w-12 h-12 text-[#5E53E0] mx-auto" />
          </div>
          <p className="text-lg font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
            {t("openingSecurePayment")}
          </p>
          <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] text-sm mt-2">
            {t("paymentWindowOpening")}
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={handleBack}
          className="mt-6 text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium"
        >
          {t("cancel")}
        </button>
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-full lg:w-[450px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PaymentProcessingPanel - Status polling (Epic 19, Story 19.6)
// ============================================

export function PaymentProcessingPanel() {
  const t = useTranslations("payment");
  const {
    selectedTransfer,
    payload,
    pushView,
    popView,
    setPaymentFlowData,
    resetPaymentFlow,
    clearBackNavigation,
  } = useDrawerStore();

  const [timeoutReached, setTimeoutReached] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const hasVerified = React.useRef(false);

  // Hide back button on processing screen to prevent navigation during transaction
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  const transfer = selectedTransfer;
  const flowData = payload?.paymentFlowData;
  const reference = flowData?.paymentReference;

  const {
    pollingStatus,
    startPolling,
    stopPolling,
    reset: resetPolling,
  } = usePaymentStatus({
    interval: 5000, // Poll every 5 seconds
    timeout: 10 * 60 * 1000, // 10 minutes
    onSuccess: () => {
      setPaymentFlowData({
        transactionDetails: {
          reference: reference || "",
          amount: flowData?.paymentAmount || transfer?.price || 0,
          currency: transfer?.currency || "XOF",
          paidAt: new Date(),
        },
      });
      pushView("payment-success");
    },
    onFailed: (payment) => {
      setPaymentFlowData({
        paymentError: {
          code: "PAYMENT_FAILED",
          message: payment.failureReason || t("paymentFailed"),
        },
      });
      pushView("payment-failed");
    },
    onTimeout: () => {
      setTimeoutReached(true);
    },
  });

  // Verify payment with Paystack first, then fall back to polling
  // This is necessary because webhooks don't work in local development
  useEffect(() => {
    if (!reference || hasVerified.current) return;
    hasVerified.current = true;

    const verifyAndPoll = async () => {
      try {
        // Call verify endpoint to check status with Paystack API
        const verifyResponse = await paymentApi.verifyPaymentV2(reference);

        if (verifyResponse.data) {
          const status = verifyResponse.data.status;

          if (status === "SUCCESS") {
            // Payment confirmed - navigate to success
            setPaymentFlowData({
              transactionDetails: {
                reference: reference,
                amount: flowData?.paymentAmount || transfer?.price || 0,
                currency: transfer?.currency || "XOF",
                paidAt: new Date(),
              },
            });
            pushView("payment-success");
            return;
          } else if (status === "FAILED" || status === "CANCELLED") {
            // Payment failed
            setPaymentFlowData({
              paymentError: {
                code: "PAYMENT_FAILED",
                message:
                  verifyResponse.data.failureReason || t("paymentFailed"),
              },
            });
            pushView("payment-failed");
            return;
          }
        }
      } catch (error) {
        console.warn(
          "[Payment] Verification failed, falling back to polling:",
          error,
        );
      }

      // If verification didn't give conclusive result, start polling
      setIsVerifying(false);
      startPolling(reference);
    };

    verifyAndPoll();

    return () => stopPolling();
  }, [
    reference,
    startPolling,
    stopPolling,
    pushView,
    setPaymentFlowData,
    flowData?.paymentAmount,
    transfer?.price,
    transfer?.currency,
    t,
  ]);

  const handleRetry = () => {
    setTimeoutReached(false);
    resetPolling();
    if (reference) {
      startPolling(reference);
    }
  };

  const handleCancel = async () => {
    // Stop polling first
    stopPolling();

    // Cancel the pending payment (fire and forget - don't block navigation)
    if (reference) {
      paymentApi.cancelPayment(reference).catch(() => {
        console.error("Failed to cancel payment:", reference);
      });
    }

    resetPaymentFlow();
    popView(); // Back to payment method
    popView();
  };

  const getMethodInstructions = (): string => {
    const method = flowData?.lastPaymentMethod;
    switch (method) {
      case "mobile_money":
        return (
          t("checkPhoneForPrompt") || "Check your phone for the payment prompt."
        );
      case "card":
        return t("verifyingCardPayment") || "Verifying your card payment...";
      default:
        return t("waitingForConfirmation");
    }
  };

  if (!transfer || !reference) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const getCurrencySymbol = (currency?: string): string => {
    const symbols: Record<string, string> = {
      XOF: "Fr CFA",
      NGN: "₦",
      GHS: "₵",
      KES: "KSh",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency || "XOF"] || currency || "";
  };

  const formatAmount = (amount: number, currency?: string): string => {
    // Story 144.7 — shared helper, not a hand-rolled `/ 100`.
    const majorUnits = minorToMajorUnits(amount, currency || "XOF");
    const symbol = getCurrencySymbol(currency);
    if (currency === "XOF") {
      return `${majorUnits.toLocaleString()} ${symbol}`;
    }
    return `${symbol}${majorUnits.toLocaleString()}`;
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce(
      (sum, file) => sum + (Number(file.size) || Number(file.fileSize) || 0),
      0,
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 py-4">
      {/* Left Column - Processing Content */}
      <div className="flex-1 flex flex-col items-center py-8">
        {/* Processing Icon */}
        <div className="w-20 h-20 bg-[#5E53E0]/10 rounded-full flex items-center justify-center mb-6">
          <div className="animate-pulse">
            <Clock className="w-10 h-10 text-[#5E53E0]" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold mb-2 dark:text-[oklch(0.91_0_0)]">
          {timeoutReached ? t("takingLongerThanUsual") : t("processing")}
        </h2>

        {/* Instructions */}
        <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] text-center mb-6">
          {timeoutReached ? t("didntReceivePrompt") : getMethodInstructions()}
        </p>

        {/* Payment Details */}
        <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-4 w-full max-w-sm mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("amount")}</span>
            <span className="font-medium dark:text-[oklch(0.91_0_0)]">
              {formatAmount(
                flowData?.paymentAmount || transfer.price || 0,
                transfer.currency,
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("transactionReference")}</span>
            <span className="font-mono text-sm dark:text-[oklch(0.91_0_0)]">{reference}</span>
          </div>
        </div>

        {/* Status */}
        {(isVerifying || pollingStatus === "polling") && !timeoutReached && (
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-6">
            {isVerifying
              ? t("verifyingPayment") || "Verifying payment..."
              : t("waitingForConfirmation")}
          </p>
        )}

        {/* Actions */}
        {timeoutReached && (
          <div className="space-y-3 w-full max-w-sm">
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
            >
              {t("tryAgain")}
            </button>
            <button
              onClick={handleCancel}
              className="w-full px-6 py-3 text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-gray-800 dark:hover:text-[oklch(0.91_0_0)]"
            >
              {t("cancel")}
            </button>
          </div>
        )}

        {!timeoutReached && (
          <button onClick={handleCancel} className="text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium">
            {t("cancel")}
          </button>
        )}
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-full lg:w-[450px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PaymentSuccessPanel - Success state (Epic 19, Story 19.7)
// ============================================

export function PaymentSuccessPanel() {
  const t = useTranslations("payment");
  const { selectedTransfer, payload, clearBackNavigation } = useDrawerStore();

  const transfer = selectedTransfer;
  const flowData = payload?.paymentFlowData;
  const transaction = flowData?.transactionDetails;

  const { checkForPoll } = usePollEligibility();

  // Hide back button on success screen - transaction is complete
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  useEffect(() => {
    const timer = setTimeout(() => { checkForPoll('after_payment'); }, 5000);
    return () => clearTimeout(timer);
  }, [checkForPoll]);

  const handleDownload = () => {
    // Trigger download and close drawer
    if (transfer?.shortCode) {
      // Redirect to download page
      window.location.href = `/downloads/${transfer.id}/${transfer.shortCode}`;
    }
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const getCurrencySymbol = (currency?: string): string => {
    const symbols: Record<string, string> = {
      XOF: "Fr CFA",
      NGN: "₦",
      GHS: "₵",
      KES: "KSh",
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    return symbols[currency || "XOF"] || currency || "";
  };

  const formatAmount = (amount: number, currency?: string): string => {
    // Story 144.7 — shared helper, not a hand-rolled `/ 100`.
    const majorUnits = minorToMajorUnits(amount, currency || "XOF");
    const symbol = getCurrencySymbol(currency);
    if (currency === "XOF") {
      return `${majorUnits.toLocaleString()} ${symbol}`;
    }
    return `${symbol}${majorUnits.toLocaleString()}`;
  };

  const formatDate = (date?: Date): string => {
    if (!date) return "";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce(
      (sum, file) => sum + (Number(file.size) || Number(file.fileSize) || 0),
      0,
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 py-4">
      {/* Left Column - Success Content */}
      <div className="flex-1 flex flex-col items-center py-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold mb-2 dark:text-[oklch(0.91_0_0)]">
          {t("paymentSuccessful")}
        </h2>
        <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] text-center mb-6">
          {t("paymentSuccessMessage")}
        </p>

        {/* Transaction Details */}
        {transaction && (
          <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-4 w-full max-w-sm mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("amount")}</span>
              <span className="font-medium dark:text-[oklch(0.91_0_0)]">
                {formatAmount(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("transactionReference")}</span>
              <span className="font-mono text-sm dark:text-[oklch(0.91_0_0)]">{transaction.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-[oklch(0.75_0_0)]">{t("paidOn")}</span>
              <span className="dark:text-[oklch(0.91_0_0)]">{formatDate(transaction.paidAt)}</span>
            </div>
          </div>
        )}

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="bg-[#87E64B] text-[#171717] rounded px-6 py-3 w-full max-w-sm flex items-center justify-center gap-2 font-medium hover:bg-[#78d43f] transition-colors"
        >
          {t("downloadFiles")}
        </button>
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-full lg:w-[450px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// PaymentFailedPanel - Failure state (Epic 19, Story 19.7)
// ============================================

export function PaymentFailedPanel() {
  const t = useTranslations("payment");
  const {
    selectedTransfer,
    payload,
    pushView,
    resetPaymentFlow,
    closeDrawer,
    clearBackNavigation,
  } = useDrawerStore();

  const transfer = selectedTransfer;
  const flowData = payload?.paymentFlowData;
  const error = flowData?.paymentError;
  const lastMethod = flowData?.lastPaymentMethod;

  // Hide back button - panel has its own retry/different method buttons
  useEffect(() => {
    clearBackNavigation();
  }, [clearBackNavigation]);

  const getErrorMessage = (code?: string): string => {
    switch (code) {
      case "INSUFFICIENT_FUNDS":
        return t("errorInsufficientFundsDesc");
      case "CARD_DECLINED":
        return t("errorCardDeclinedDesc");
      case "TIMEOUT":
        return t("errorTimeoutDesc") || "Payment timed out. Please try again.";
      case "CANCELLED":
        return t("errorCancelled") || "Payment was cancelled.";
      default:
        return error?.message || t("paymentFailedMessage");
    }
  };

  const handleRetry = () => {
    // Navigate directly to appropriate panel based on last method
    // (popView doesn't work since clearBackNavigation emptied the stack)
    if (lastMethod === "mobile_money") {
      // For mobile money, go back to phone input
      pushView("payment-phone");
    } else if (lastMethod === "card") {
      // For card, try again
      pushView("payment-card");
    } else {
      // Default: go to method selection
      pushView("payment-method");
    }
  };

  const handleDifferentMethod = () => {
    // Reset flow and navigate directly to method selection
    resetPaymentFlow();
    pushView("payment-method");
  };

  const handleClose = () => {
    resetPaymentFlow();
    closeDrawer();
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce(
      (sum, file) => sum + (Number(file.size) || Number(file.fileSize) || 0),
      0,
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 py-4">
      {/* Left Column - Failed Content */}
      <div className="flex-1 flex flex-col items-center py-8">
        {/* Failed Icon */}
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <XmarkCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold mb-2 dark:text-[oklch(0.91_0_0)]">{t("paymentFailed")}</h2>

        {/* Error Message */}
        <p className="text-gray-600 dark:text-[oklch(0.75_0_0)] text-center mb-2">
          {getErrorMessage(error?.code)}
        </p>

        {/* Reassurance */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg px-4 py-3 mb-6 w-full max-w-sm">
          <p className="text-yellow-800 dark:text-amber-300 text-sm text-center">
            ⚠️ {t("youWereNotCharged")}
          </p>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          className="bg-[#87E64B] text-[#171717] rounded px-6 py-3 w-full max-w-sm mb-4 font-medium hover:bg-[#78d43f] transition-colors"
        >
          {t("tryAgain")}
        </button>

        {/* Different Method Link */}
        <button
          onClick={handleDifferentMethod}
          className="text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium mb-4"
        >
          {t("useDifferentMethod")}
        </button>

        {/* Close Link */}
        <button onClick={handleClose} className="text-gray-500 dark:text-[oklch(0.75_0_0)]">
          {t("cancel")}
        </button>
      </div>

      {/* Right Column - Transfer Summary (Sticky) */}
      <div className="w-full lg:w-[450px] flex-shrink-0 order-first lg:order-last">
        <div className="lg:sticky lg:top-4">
          <TransferSummaryCard
            title={transfer.title || "Untitled"}
            fileCount={transfer.files?.length || 0}
            totalSize={calculateTotalSize()}
            price={transfer.price || 0}
            currency={transfer.currency || "XOF"}
            message={transfer.message}
            createdAt={transfer.createdAt}
            senderEmail={
              typeof transfer.senderId === "object"
                ? transfer.senderId?.email
                : undefined
            }
            versionCount={transfer.versionCount}
          />
        </div>
      </div>
    </div>
  );
}
