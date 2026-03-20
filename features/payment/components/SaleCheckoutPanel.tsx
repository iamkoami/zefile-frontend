"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Flag from "react-flagpack";
import {
  CreditCard,
  SmartphoneDevice,
  Lock,
  NavArrowDown,
  Globe,
  Bank,
  Hashtag,
} from "iconoir-react";
import { useTranslations } from "next-intl";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import { paymentApi, type PaymentMethodInfo } from "@/services/payment-api";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import type { CountryCode } from "libphonenumber-js";
import { toast } from "@/components/shared/Toast";
import { safePaymentRedirect } from "@/utils/security";

// Supported countries for payment — matches download page DOWNLOAD_PAYMENT_COUNTRIES
const PAYMENT_COUNTRIES = [
  { code: "CI", name: "Cote d'Ivoire", flagCode: "CI" as string | null, phoneCode: "CI" as CountryCode | null },
  { code: "NG", name: "Nigeria", flagCode: "NG" as string | null, phoneCode: "NG" as CountryCode | null },
  { code: "GH", name: "Ghana", flagCode: "GH" as string | null, phoneCode: "GH" as CountryCode | null },
  { code: "KE", name: "Kenya", flagCode: "KE" as string | null, phoneCode: "KE" as CountryCode | null },
  { code: "TG", name: "Togo", flagCode: "TG" as string | null, phoneCode: "TG" as CountryCode | null },
  { code: "BJ", name: "Benin", flagCode: "BJ" as string | null, phoneCode: "BJ" as CountryCode | null },
  { code: "INTL", name: "International", flagCode: null, phoneCode: null },
];

interface SaleCheckoutPanelProps {
  transferId: string;
  transferCurrency: string;
  buyerEmail: string;
  onBack: () => void;
  onPaymentInitiated: (reference: string, isMobileMoney: boolean) => void;
}

/**
 * Inline checkout panel for public sales — renders inside ze-upload-panel.
 * Matches the same style as the existing transfer payment form on the download page.
 */
export function SaleCheckoutPanel({
  transferId,
  transferCurrency,
  buyerEmail,
  onBack,
  onPaymentInitiated,
}: SaleCheckoutPanelProps) {
  const t = useTranslations("payment");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(PAYMENT_COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodInfo | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [, setPhoneCountryCode] = useState<CountryCode>("CI");

  // Fetch payment methods when country changes
  useEffect(() => {
    setSelectedMethod(null);

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

    if (selectedCountry.phoneCode) {
      setPhoneCountryCode(selectedCountry.phoneCode);
    }
  }, [selectedCountry.code, selectedCountry.phoneCode]);

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

  const getProviderIconPath = (icon: string): string => `/icons/payment/${icon}.svg`;

  const handlePay = async () => {
    if (!selectedMethod) return;

    setIsLoading(true);
    try {
      if (selectedMethod.type === "mobile_money") {
        if (!isPhoneValid) {
          toast.error(t("invalidPhoneNumber"));
          setIsLoading(false);
          return;
        }

        const response = await paymentApi.initializePaymentV2({
          transferId,
          customerEmail: buyerEmail,
          requestedCurrency: transferCurrency,
          paymentMethod: "mobile_money",
          mobileMoneyProvider: selectedMethod.provider as MobileMoneyProvider,
          phoneNumber,
          countryCode: selectedCountry.code === "INTL" ? undefined : selectedCountry.code,
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          return;
        }

        if (response.data) {
          onPaymentInitiated(response.data.reference, true);
        }
      } else if (selectedMethod.type === "card") {
        const response = await paymentApi.initializePaymentV2({
          transferId,
          customerEmail: buyerEmail,
          requestedCurrency: transferCurrency,
          paymentMethod: "card",
          countryCode: selectedCountry.code === "INTL" ? undefined : selectedCountry.code,
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          return;
        }

        if (response.data?.authorizationUrl) {
          onPaymentInitiated(response.data.reference, false);
          safePaymentRedirect(response.data.authorizationUrl);
        }
      } else {
        // bank_transfer, ussd — redirect flow
        type PaystackChannel = "card" | "bank_transfer" | "ussd" | "bank" | "qr";
        const channelMap: Record<string, PaystackChannel> = {
          bank_transfer: "bank_transfer",
          ussd: "ussd",
        };
        const preferredChannel: PaystackChannel =
          channelMap[selectedMethod.type] || "bank_transfer";

        const response = await paymentApi.initializePaymentV2({
          transferId,
          customerEmail: buyerEmail,
          requestedCurrency: transferCurrency,
          paymentMethod: "card",
          preferredChannel,
          countryCode: selectedCountry.code === "INTL" ? undefined : selectedCountry.code,
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          return;
        }

        if (response.data?.authorizationUrl) {
          onPaymentInitiated(response.data.reference, false);
          safePaymentRedirect(response.data.authorizationUrl);
        }
      }
    } catch {
      toast.error(t("paymentInitFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = (() => {
    if (!selectedMethod) return false;
    if (selectedMethod.type === "mobile_money") return isPhoneValid;
    return true;
  })();

  return (
    <>
      <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
        {t("securePayment")}
      </h1>
      <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-6">
        {t("makePaymentToDownload")}
      </p>

      {/* Buyer email (read-only, already collected) */}
      <div className="mb-4">
        <input
          type="email"
          value={buyerEmail}
          readOnly
          className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] bg-gray-50 dark:bg-[oklch(0.22_0_0)] cursor-default text-sm"
        />
      </div>

      {/* Payment Method Section */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-2">
          {t("paymentMethodTitle")}
        </p>

        {/* Country Selector */}
        <div className="relative mb-3">
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] bg-white dark:bg-[oklch(0.24_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors text-sm"
          >
            <div className="flex items-center gap-2">
              {selectedCountry.flagCode ? (
                <Flag code={selectedCountry.flagCode} size="s" hasBorder={false} />
              ) : (
                <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
              )}
              <span className="font-medium">{selectedCountry.name}</span>
            </div>
            <NavArrowDown
              className={`w-4 h-4 text-gray-400 dark:text-[oklch(0.50_0_0)] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isCountryDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[oklch(0.24_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded shadow-lg dark:shadow-black/30 max-h-[220px] overflow-y-auto">
              {PAYMENT_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(country);
                    localStorage.setItem("zefile_detected_country", country.code);
                    setIsCountryDropdownOpen(false);
                    setPhoneNumber("");
                    setIsPhoneValid(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] text-left ${
                    country.code === selectedCountry.code
                      ? "bg-gray-50 dark:bg-[oklch(0.24_0_0)]"
                      : ""
                  }`}
                >
                  {country.flagCode ? (
                    <Flag code={country.flagCode} size="s" hasBorder={false} />
                  ) : (
                    <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
                  )}
                  <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)]">
                    {country.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods Grid — API-driven */}
        {loadingMethods ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-[oklch(0.30_0_0)] border-t-[#5E53E0] rounded-full animate-spin" />
          </div>
        ) : paymentMethods.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] py-4 text-center">
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
                      <SmartphoneDevice className="w-4 h-4 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
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
              const MethodIcon =
                method.type === "bank_transfer"
                  ? Bank
                  : method.type === "ussd"
                    ? Hashtag
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
                    <MethodIcon className="w-4 h-4 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
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
                  <CreditCard className="w-4 h-4 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
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
      <div className="flex gap-3 mb-4">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 px-4 py-3.5 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors disabled:opacity-50 text-sm"
        >
          {t("cancel")}
        </button>
        <button
          onClick={handlePay}
          disabled={!isFormValid || isLoading}
          className="flex-1 px-4 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? t("processing") : t("payAndDownload")}
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-[oklch(0.50_0_0)]">
        <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <p>{t("securityGuarantee")}</p>
      </div>
    </>
  );
}
