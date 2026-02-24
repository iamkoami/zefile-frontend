"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { paymentApi } from "@/services/payment-api";
import { toast } from "@/components/shared/Toast";
import { TransferSummaryCard } from "@/components/shared/TransferSummaryCard";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import type { CountryCode } from "libphonenumber-js";
import usePaymentStatus from "@/hooks/usePaymentStatus";
import { useCurrencyStore } from "@/stores/currency-store";
import { getCurrentUserEmail } from "@/utils/auth";
import { safePaymentRedirect } from "@/utils/security";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { trackPaymentMethodSelected, trackPaymentSubmitted } from "@/lib/posthog";

// Country data - Paystack-supported countries + International (card only)
// Paystack coverage: GH (Ghana), KE (Kenya), CI (Côte d'Ivoire), NG (Nigeria)
// Nigeria: OPay Wallet (via Pay with Bank), Bank Transfer, USSD, Cards (no Mobile Money)
// Ghana/Kenya/CI: Mobile Money, Cards
const PAYSTACK_COUNTRIES = [
  {
    code: "GH",
    name: "Ghana",
    flagCode: "GH" as string | null,
    phoneCode: "+233",
    hasMobileMoney: true,
    hasBankTransfer: false,
    hasUSSD: false,
    hasOPayWallet: false,
  },
  {
    code: "KE",
    name: "Kenya",
    flagCode: "KE" as string | null,
    phoneCode: "+254",
    hasMobileMoney: true,
    hasBankTransfer: false,
    hasUSSD: false,
    hasOPayWallet: false,
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flagCode: "CI" as string | null,
    phoneCode: "+225",
    hasMobileMoney: true,
    hasBankTransfer: false,
    hasUSSD: false,
    hasOPayWallet: false,
  },
  {
    code: "NG",
    name: "Nigeria",
    flagCode: "NG" as string | null,
    phoneCode: "+234",
    hasMobileMoney: false,
    hasBankTransfer: true,
    hasUSSD: true,
    hasOPayWallet: true, // OPay via Paystack "Pay with Bank" channel (launched Nov 2024)
  },
  {
    code: "INTL",
    name: "International",
    flagCode: null as string | null,
    phoneCode: "",
    hasMobileMoney: false,
    hasBankTransfer: false,
    hasUSSD: false,
    hasOPayWallet: false,
  },
];

// Provider icon mapping
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

  // Map global currency country to payment country (DEFAULT -> INTL)
  const getDefaultCountry = () => {
    if (globalCountryCode === "DEFAULT") {
      return (
        PAYSTACK_COUNTRIES.find((c) => c.code === "INTL") ||
        PAYSTACK_COUNTRIES[4]
      );
    }
    return (
      PAYSTACK_COUNTRIES.find((c) => c.code === globalCountryCode) ||
      PAYSTACK_COUNTRIES[0]
    );
  };

  const [selectedMethodType, setSelectedMethodType] = useState<
    "mobile_money" | "card" | "bank_transfer" | "ussd" | "opay_wallet" | null
  >(null);
  const [customerName, setCustomerName] = useState("");
  // Priority: logged-in user email > flow data email > empty
  const [customerEmail, setCustomerEmail] = useState(() => {
    const loggedInEmail = getCurrentUserEmail();
    return loggedInEmail || payload?.paymentFlowData?.senderEmail || "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(getDefaultCountry);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [providers, setProviders] = useState<
    Array<{ provider: MobileMoneyProvider; name: string; icon: string }>
  >([]);
  const [selectedProvider, setSelectedProvider] =
    useState<MobileMoneyProvider | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>(() => {
    const defaultCountry = getDefaultCountry();
    return (
      defaultCountry.code !== "INTL" ? defaultCountry.code : "GH"
    ) as CountryCode;
  });

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

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

  // Fetch mobile money providers when country changes or mobile money is selected
  useEffect(() => {
    const fetchProviders = async () => {
      // Skip if not mobile money or country doesn't support it
      if (
        selectedMethodType !== "mobile_money" ||
        !selectedCountry.hasMobileMoney
      ) {
        setProviders([]);
        setSelectedProvider(null);
        return;
      }

      setLoadingProviders(true);
      try {
        // Always use selected country for fetching providers
        const url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${selectedCountry.code}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch");

        const data = await response.json();
        setProviders(data.mobileMoney || []);
        // Auto-select first provider
        if (data.mobileMoney?.length > 0) {
          setSelectedProvider(data.mobileMoney[0].provider);
        }
      } catch {
        // Fallback providers based on selected country
        const fallbackByCountry: Record<
          string,
          Array<{ provider: MobileMoneyProvider; name: string; icon: string }>
        > = {
          GH: [
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
          ],
          KE: [
            {
              provider: "mpesa" as MobileMoneyProvider,
              name: "M-Pesa",
              icon: "mpesa",
            },
            {
              provider: "airtel_money" as MobileMoneyProvider,
              name: "Airtel Money",
              icon: "airtel",
            },
          ],
          CI: [
            {
              provider: "mtn_momo" as MobileMoneyProvider,
              name: "MTN Mobile Money",
              icon: "mtn",
            },
            {
              provider: "orange_money" as MobileMoneyProvider,
              name: "Orange Money",
              icon: "orange",
            },
            {
              provider: "wave" as MobileMoneyProvider,
              name: "Wave",
              icon: "wave",
            },
          ],
        };
        const fallback = fallbackByCountry[selectedCountry.code] || [];
        setProviders(fallback);
        if (fallback.length > 0) {
          setSelectedProvider(fallback[0].provider);
        }
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, [
    selectedMethodType,
    selectedCountry.code,
    selectedCountry.hasMobileMoney,
  ]);

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    [],
  );

  // Format card number with spaces
  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : v;
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (value: string): string => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? "/" + v.substring(2, 4) : "");
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value.replace("/", ""));
    setExpiryDate(formatted);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/gi, "");
    if (v.length <= 4) {
      setCvv(v);
    }
  };

  // Validate card fields
  const isCardValid =
    cardNumber.replace(/\s/g, "").length >= 15 &&
    expiryDate.length === 5 &&
    cvv.length >= 3;

  const handleContinue = async () => {
    if (!selectedMethodType || !transfer) return;

    // Validate email
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(t("invalidEmail"));
      return;
    }

    // Update flow data with email
    setPaymentFlowData({ senderEmail: customerEmail });

    trackPaymentMethodSelected(selectedMethodType === "mobile_money" ? "mobile_money" : "card");

    if (selectedMethodType === "mobile_money") {
      // Validate phone number for mobile money
      if (!isPhoneValid || !selectedProvider) {
        toast.error(t("invalidPhoneNumber"));
        return;
      }

      setIsLoading(true);
      try {
        // Update payment method with selected provider
        setPaymentMethod({ type: "mobile_money", provider: selectedProvider });

        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
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
          trackPaymentSubmitted({ method: "mobile_money", amount: response.data.pricingAmountMinorUnits, currency: transfer.currency });
          // Store payment data and go to prompt step
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
    } else if (selectedMethodType === "card") {
      // Card payments use Paystack popup (Epic 19, Story 19.5)
      trackPaymentSubmitted({ method: "card", currency: transfer.currency });
      setPaymentMethod({ type: "card" });
      setPaymentFlowData({
        senderEmail: customerEmail,
        lastPaymentMethod: "card",
      });
      pushView("payment-card");
    } else {
      // For bank_transfer, ussd, and opay_wallet - redirect to Paystack checkout
      setIsLoading(true);
      try {
        // Map method type to Paystack channel preference
        // OPay uses "bank" channel - user selects "OPay Digital Services Limited (OPay)" from bank list
        type PaystackChannel =
          | "card"
          | "bank_transfer"
          | "ussd"
          | "bank"
          | "qr";
        const channelMap: Record<string, PaystackChannel> = {
          bank_transfer: "bank_transfer",
          ussd: "ussd",
          opay_wallet: "bank", // OPay via "Pay with Bank" channel
        };
        const preferredChannel: PaystackChannel =
          channelMap[selectedMethodType] || "bank_transfer";

        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "card", // Backend treats non-mobile_money as checkout flow
          preferredChannel, // Pass channel preference for Paystack
        });

        if (response.error) {
          toast.error(response.error.message || t("paymentInitFailed"));
          return;
        }

        if (response.data?.authorizationUrl) {
          trackPaymentSubmitted({ method: selectedMethodType, currency: transfer.currency });
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

  const formatPrice = (price: number, currency?: string): string => {
    const majorUnits = price / 100;
    if (currency === "XOF") {
      return `${majorUnits.toLocaleString()} XOF`;
    }
    return `${majorUnits.toLocaleString()} ${currency || ""}`;
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  // Validation rules by payment method:
  // - Card/Bank Transfer/USSD: only email required (Paystack handles the rest)
  // - Mobile Money: email + phone + provider required
  const isFormValid = (() => {
    if (!selectedMethodType || !customerEmail) return false;

    // Mobile Money requires phone and provider
    if (selectedMethodType === "mobile_money") {
      return isPhoneValid && !!selectedProvider;
    }

    // Card, Bank Transfer, USSD only need email
    return true;
  })();

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Left Column - Payment Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("securePayment")}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {t("makePaymentToDownload")}
          </p>
        </div>

        {/* Name Input */}
        <div className="mb-3">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t("yourName")}
            className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
          />
        </div>

        {/* Email Input */}
        <div className="mb-5">
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder={t("yourEmail")}
            className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
          />
        </div>

        {/* Payment Method Section */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-[#171717] mb-3">
            {t("paymentMethodTitle")}
          </h3>

          {/* Country Selector - styled like CurrencySwitcher */}
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg text-[#171717] bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {selectedCountry.flagCode ? (
                  <Flag code={selectedCountry.flagCode} size="s" hasBorder={false} />
                ) : (
                  <Globe className="w-5 h-5 text-gray-500" />
                )}
                <span className="text-sm font-medium">
                  {selectedCountry.name}
                </span>
                {!selectedCountry.hasMobileMoney &&
                  !selectedCountry.hasBankTransfer && (
                    <span className="text-xs text-gray-400">
                      ({t("cardOnly")})
                    </span>
                  )}
              </div>
              <NavArrowDown
                className={`w-4 h-4 text-gray-400 transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isCountryDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                {PAYSTACK_COUNTRIES.map((country) => {
                  const isSelected = selectedCountry.code === country.code;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        setSelectedCountry(country);
                        // Sync phone country code with selected country (skip for International)
                        if (country.code !== "INTL") {
                          setPhoneCountryCode(country.code as CountryCode);
                        }
                        setIsCountryDropdownOpen(false);
                        // Reset phone number when country changes
                        setPhoneNumber("");
                        setIsPhoneValid(false);
                        // Reset payment method if new country doesn't support it
                        if (
                          !country.hasMobileMoney &&
                          selectedMethodType === "mobile_money"
                        ) {
                          setSelectedMethodType(null);
                          setSelectedProvider(null);
                        }
                        if (
                          !country.hasBankTransfer &&
                          selectedMethodType === "bank_transfer"
                        ) {
                          setSelectedMethodType(null);
                        }
                        if (!country.hasUSSD && selectedMethodType === "ussd") {
                          setSelectedMethodType(null);
                        }
                        if (
                          !country.hasOPayWallet &&
                          selectedMethodType === "opay_wallet"
                        ) {
                          setSelectedMethodType(null);
                        }
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        isSelected
                          ? "bg-gray-50 font-medium text-[#5E53E0]"
                          : "text-gray-700"
                      }`}
                    >
                      {country.flagCode ? (
                        <Flag code={country.flagCode} size="s" hasBorder={false} />
                      ) : (
                        <Globe className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="flex-1">{country.name}</span>
                      {!country.hasMobileMoney && !country.hasBankTransfer && (
                        <span className="text-xs text-gray-400">
                          ({t("cardOnly")})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Method Buttons */}
          <div className="flex flex-wrap gap-3 mb-3">
            {/* Mobile Money Button - Only show if country supports it */}
            {selectedCountry.hasMobileMoney && (
              <button
                onClick={() => setSelectedMethodType("mobile_money")}
                className={`flex items-center gap-2 px-5 py-3 border rounded transition-all ${
                  selectedMethodType === "mobile_money"
                    ? "border-[#87E64B] bg-[#87E64B]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <SmartphoneDevice
                  className={`w-5 h-5 ${selectedMethodType === "mobile_money" ? "text-[#171717]" : "text-gray-400"}`}
                />
                <span className="font-medium text-[#171717] text-sm">
                  {t("mobileMoney")}
                </span>
              </button>
            )}

            {/* Bank Transfer Button - Only show for Nigeria */}
            {selectedCountry.hasBankTransfer && (
              <button
                onClick={() => setSelectedMethodType("bank_transfer")}
                className={`flex items-center gap-2 px-5 py-3 border rounded transition-all ${
                  selectedMethodType === "bank_transfer"
                    ? "border-[#87E64B] bg-[#87E64B]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Bank
                  className={`w-5 h-5 ${selectedMethodType === "bank_transfer" ? "text-[#171717]" : "text-gray-400"}`}
                />
                <span className="font-medium text-[#171717] text-sm">
                  {t("bankTransfer")}
                </span>
              </button>
            )}

            {/* USSD Button - Only show for Nigeria */}
            {selectedCountry.hasUSSD && (
              <button
                onClick={() => setSelectedMethodType("ussd")}
                className={`flex items-center gap-2 px-5 py-3 border rounded transition-all ${
                  selectedMethodType === "ussd"
                    ? "border-[#87E64B] bg-[#87E64B]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Hashtag
                  className={`w-5 h-5 ${selectedMethodType === "ussd" ? "text-[#171717]" : "text-gray-400"}`}
                />
                <span className="font-medium text-[#171717] text-sm">
                  {t("ussd")}
                </span>
              </button>
            )}

            {/* OPay Wallet Button - Only show for Nigeria (40M+ users) */}
            {selectedCountry.hasOPayWallet && (
              <button
                onClick={() => setSelectedMethodType("opay_wallet")}
                className={`flex items-center gap-2 px-5 py-3 border rounded transition-all ${
                  selectedMethodType === "opay_wallet"
                    ? "border-[#00B22E] bg-[#00B22E]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Image
                  src="/icons/payment/opay.svg"
                  alt="OPay"
                  width={20}
                  height={20}
                  className="flex-shrink-0"
                  onError={(e) => {
                    // Fallback to text if icon fails to load
                    e.currentTarget.style.display = "none";
                  }}
                />
                <span className="font-medium text-[#171717] text-sm">
                  {t("opayWallet")}
                </span>
              </button>
            )}

            {/* Card Button */}
            <button
              onClick={() => setSelectedMethodType("card")}
              className={`flex items-center gap-2 px-5 py-3 border rounded transition-all ${
                selectedMethodType === "card"
                  ? "border-[#87E64B] bg-[#87E64B]/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <CreditCard
                className={`w-5 h-5 ${selectedMethodType === "card" ? "text-[#171717]" : "text-gray-400"}`}
              />
              <span className="font-medium text-[#171717] text-sm">
                {t("bankCard")}
              </span>
            </button>
          </div>

          {/* Provider Selection - Show when Mobile Money is selected */}
          {selectedMethodType === "mobile_money" && (
            <>
              {loadingProviders ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingPanel />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {providers.map((provider) => (
                    <button
                      key={provider.provider}
                      onClick={() => setSelectedProvider(provider.provider)}
                      className={`flex items-center gap-3 px-3 py-2.5 border rounded transition-all ${
                        selectedProvider === provider.provider
                          ? "border-[#87E64B] bg-[#87E64B]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Image
                          src={getProviderIcon(provider.provider)}
                          alt={provider.name}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="block font-medium text-[#171717] text-sm truncate">
                          {provider.name}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {formatPrice(transfer.price || 0, transfer.currency)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Phone Input - Country code synced with selected payment country */}
              <div className="mb-3">
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  defaultCountry={phoneCountryCode}
                  countryCode={selectedCountry.code as CountryCode}
                  hideCountrySelector={true}
                />
              </div>
            </>
          )}

          {/* Card Input Fields - Show when Card is selected */}
          {selectedMethodType === "card" && (
            <>
              {/* Card Number */}
              <div className="mb-3">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder={t("cardNumber")}
                  className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
              </div>

              {/* Expiry Date and CVV */}
              <div className="flex gap-3 mb-3">
                <input
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  placeholder={t("expiryDate")}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  inputMode="numeric"
                  maxLength={5}
                  autoComplete="cc-exp"
                />
                <input
                  type="text"
                  value={cvv}
                  onChange={handleCvvChange}
                  placeholder={t("cvv")}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="cc-csc"
                />
              </div>

              {/* Billing Address */}
              <div className="mb-3">
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder={t("billingAddress")}
                  className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  autoComplete="street-address"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 mb-6">
          <button
            onClick={closeDrawer}
            disabled={isLoading}
            className="px-8 py-3 bg-gray-100 text-[#171717] font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
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
        <div className="flex items-start gap-3 text-sm text-gray-500">
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
      {/* Left Column - Phone Input Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#171717]">
            {t("enterPhoneNumber")}
          </h2>
          <p className="text-gray-600 mt-2">{t("enterPhoneForMobileMoney")}</p>
        </div>

        {/* Provider Selection */}
        {loadingProviders ? (
          <div className="flex items-center justify-center py-8">
            <LoadingPanel />
          </div>
        ) : (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#171717] mb-3">
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
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
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
            className="flex-1 px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
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
        <div className="flex items-start gap-3 text-sm text-gray-500">
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
    const majorUnits = amount / 100;
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
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          ) : isFailed ? (
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XmarkCircle className="w-10 h-10 text-red-600" />
            </div>
          ) : isTimeout ? (
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <WarningCircle className="w-10 h-10 text-yellow-600" />
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
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t("paymentSuccessful")}
              </h2>
              <p className="text-gray-600">{t("redirectingToDownload")}</p>
            </>
          ) : isFailed ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t("paymentFailed")}
              </h2>
              <p className="text-gray-600">{error || t("youWereNotCharged")}</p>
            </>
          ) : isTimeout ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t("takingLongerThanUsual")}
              </h2>
              <p className="text-gray-600">{t("didntReceivePrompt")}</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t("checkYourPhone")}
              </h2>
              <p className="text-gray-600">{t("confirmPaymentOn")}</p>
            </>
          )}
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t("payWith")}</span>
            <span className="font-medium text-[#171717]">
              {getProviderName(paymentMethod.provider)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t("phoneNumber")}</span>
            <span className="font-medium text-[#171717]">
              {flowData.phoneNumber}
            </span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="text-gray-600">{t("amount")}</span>
            <span className="font-bold text-lg text-[#171717]">
              {formatAmount(
                flowData.paymentAmount || transfer.price || 0,
                transfer.currency,
              )}
            </span>
          </div>
        </div>

        {/* Polling Status */}
        {isPolling && (
          <p className="text-sm text-gray-500 mb-6">
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
              className="w-full px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
            >
              {t("useDifferentMethod")}
            </button>
          )}

          {!isSuccess && (
            <button
              onClick={handleCancel}
              className="w-full px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
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
// CardPaymentPanel - Card payment with Paystack popup (Epic 19, Story 19.5)
// ============================================

export function CardPaymentPanel() {
  const t = useTranslations("payment");
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

        // Dynamically import and use Paystack InlineJS
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
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XmarkCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t("paymentFailed")}</h2>
          <p className="text-gray-600 text-center mb-6">{initError}</p>
          <div className="flex gap-4">
            <button
              onClick={handleBack}
              className="px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
            >
              {t("useDifferentMethod")}
            </button>
            <button
              onClick={closeDrawer}
              className="px-6 py-3 text-gray-600 hover:text-gray-800"
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
          <p className="text-lg font-medium text-[#171717]">
            {t("openingSecurePayment")}
          </p>
          <p className="text-gray-600 text-sm mt-2">
            {t("paymentWindowOpening")}
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={handleBack}
          className="mt-6 text-[#171717] underline font-medium"
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
    const majorUnits = amount / 100;
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
        <h2 className="text-2xl font-semibold mb-2">
          {timeoutReached ? t("takingLongerThanUsual") : t("processing")}
        </h2>

        {/* Instructions */}
        <p className="text-gray-600 text-center mb-6">
          {timeoutReached ? t("didntReceivePrompt") : getMethodInstructions()}
        </p>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{t("amount")}</span>
            <span className="font-medium">
              {formatAmount(
                flowData?.paymentAmount || transfer.price || 0,
                transfer.currency,
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">{t("transactionReference")}</span>
            <span className="font-mono text-sm">{reference}</span>
          </div>
        </div>

        {/* Status */}
        {(isVerifying || pollingStatus === "polling") && !timeoutReached && (
          <p className="text-sm text-gray-500 mb-6">
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
              className="w-full px-6 py-3 text-gray-600 hover:text-gray-800"
            >
              {t("cancel")}
            </button>
          </div>
        )}

        {!timeoutReached && (
          <button onClick={handleCancel} className="text-[#171717] underline font-medium">
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
    const majorUnits = amount / 100;
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
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold mb-2">
          {t("paymentSuccessful")}
        </h2>
        <p className="text-gray-600 text-center mb-6">
          {t("paymentSuccessMessage")}
        </p>

        {/* Transaction Details */}
        {transaction && (
          <div className="bg-gray-50 rounded-lg p-4 w-full max-w-sm mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">{t("amount")}</span>
              <span className="font-medium">
                {formatAmount(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">{t("transactionReference")}</span>
              <span className="font-mono text-sm">{transaction.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t("paidOn")}</span>
              <span>{formatDate(transaction.paidAt)}</span>
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
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <XmarkCircle className="w-10 h-10 text-red-600" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-semibold mb-2">{t("paymentFailed")}</h2>

        {/* Error Message */}
        <p className="text-gray-600 text-center mb-2">
          {getErrorMessage(error?.code)}
        </p>

        {/* Reassurance */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6 w-full max-w-sm">
          <p className="text-yellow-800 text-sm text-center">
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
          className="text-[#171717] underline font-medium mb-4"
        >
          {t("useDifferentMethod")}
        </button>

        {/* Close Link */}
        <button onClick={handleClose} className="text-gray-500">
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
