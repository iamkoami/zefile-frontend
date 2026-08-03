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
import {
  paymentApi,
  type PaymentMethodInfo,
  type InitializePaymentV2Response,
} from "@/services/payment-api";
import { platformApi, type ProcessingFeeQuote } from "@/services/platform-api";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import type { CountryCode } from "libphonenumber-js";
import { toast } from "@/components/shared/Toast";
import { safePaymentRedirect } from "@/utils/security";
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstile } from "@/hooks/useTurnstile";
import { setCaptchaToken } from "@/services/api-client";
import { useCurrencyStore } from "@/stores/currency-store";
import { convertCurrency, formatCurrencyAmount, type CurrencyCode } from "@/lib/currency";

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
  /**
   * Story 135.1 (D3) — the film's price in minor units, needed to quote the processing surcharge
   * before the gateway is called. Optional so the panel degrades to its previous behaviour rather
   * than breaking if a caller does not supply it.
   */
  transferPriceMinorUnits?: number;
  buyerEmail: string;
  onBack: () => void;
  /**
   * Story 144.1 — `payment` is the AUTHORITATIVE initialize response, and callers must render money
   * from it rather than from the fee quote they already hold.
   *
   * The quote is re-fetched asynchronously whenever the buyer changes country, the effect does not
   * clear the previous quote while that request is in flight, and the Pay button is not gated on it
   * settling. So a buyer who switches from Togo to Côte d'Ivoire and pays quickly can initialize
   * against the NEW country while the quote in state still describes the OLD one — a total and a
   * settlement line that have nothing to do with what was charged. Passing the response closes that
   * race by construction. Found at cross-model review.
   */
  onPaymentInitiated: (
    reference: string,
    isMobileMoney: boolean,
    payment?: InitializePaymentV2Response,
  ) => void;
  /** Optional: parent's Turnstile getToken to avoid duplicate widgets on same page. */
  getCaptchaToken?: () => Promise<string | null>;
  /**
   * Story 134.8 — the film stopped being sellable between page load and checkout.
   *
   * The backend answers 409 `STREAM_NOT_READY`. A toast alone would leave the buyer sitting on a
   * checkout form for something that is not on sale, so the parent takes them back to the sale
   * page, where the prepared-state block explains it.
   */
  onStreamNotReady?: () => void;
  /**
   * Story 135.1 — publishes the fee quote so the sibling TransferSummaryCard can render the SAME
   * numbers from the SAME fetch. Without this the two panels disagreed on screen: the summary
   * showed a display-currency conversion ($8.26) while this panel showed the real charge
   * (5,208.34 Fr CFA).
   *
   * Must be a stable reference (a `useState` setter). It is called from inside the quote effect.
   */
  onQuoteChange?: (quote: ProcessingFeeQuote | null) => void;
}

/**
 * Inline checkout panel for public sales — renders inside ze-upload-panel.
 * Matches the same style as the existing transfer payment form on the download page.
 */
export function SaleCheckoutPanel({
  transferId,
  transferCurrency,
  transferPriceMinorUnits,
  buyerEmail,
  onBack,
  onPaymentInitiated,
  getCaptchaToken,
  onStreamNotReady,
  onQuoteChange,
}: SaleCheckoutPanelProps) {
  const t = useTranslations("payment");
  const tStreamSale = useTranslations("streamSale");
  // Use parent's token getter if provided (avoids duplicate Turnstile widgets on same page)
  const ownTurnstile = useTurnstile();
  const getTurnstileToken = getCaptchaToken || ownTurnstile.getToken;
  const turnstileEnabled = !getCaptchaToken && ownTurnstile.isEnabled;

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

  /**
   * Story 135.1 (D3, AC4) — quote the processing surcharge as soon as country AND method are known.
   *
   * Before this, the panel showed no fee at all. A mobile-money buyer met the surcharge on the
   * `payment-prompt` screen, AFTER initializePayment had created a Transaction; a card buyer was
   * redirected to Paystack and never saw it inside ZeFile at all. Fee-model principle 1 says the
   * buyer sees the full total before paying, so it belongs here — the last screen before the money.
   *
   * The quote endpoint is read-only: no Transaction, no velocity write, no gateway call. The total
   * it returns is computed through the same service calls the payment path uses, so it equals the
   * amount charged to the minor unit.
   */
  const [feeQuote, setFeeQuote] = useState<ProcessingFeeQuote | null>(null);

  /**
   * Which rate the backend will actually apply — found at review (High).
   *
   * `PaymentService.initializePayment` narrows to two rates only:
   *     paymentMethod = request.paymentMethod === 'mobile_money' ? 'mobile_money' : 'card'
   *
   * and `handlePay` below sends bank transfer and USSD as `paymentMethod: "card"`. So those two
   * methods are charged the CARD rate (4% in CI, against 2.95% for mobile money) — and quoting
   * only for `card`/`mobile_money` left them with no surcharge shown at all, reproducing for two
   * more methods the exact defect this story exists to close.
   *
   * Mirror the backend's narrowing rather than the UI's method list: anything that is not mobile
   * money is charged the card rate.
   *
   * NOTE: whether the card rate is the RIGHT rate for a bank transfer or a USSD push is a separate
   * question — PROCESSING_FEES has no `{country}.bank_transfer` or `.ussd` key today. Raised as its
   * own story; this only makes the buyer see what she is already being charged.
   */
  const quoteMethod: "mobile_money" | "card" | null = !selectedMethod
    ? null
    : selectedMethod.type === "mobile_money"
      ? "mobile_money"
      : "card";

  useEffect(() => {
    if (!quoteMethod || !transferPriceMinorUnits || transferPriceMinorUnits <= 0) {
      setFeeQuote(null);
      onQuoteChange?.(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const response = await platformApi.getProcessingFeeQuote({
        amountMinorUnits: transferPriceMinorUnits,
        paymentMethod: quoteMethod,
        countryCode: selectedCountry.code === "INTL" ? undefined : selectedCountry.code,
        // The gateway may not support this currency for this country, in which case the payment
        // path converts and charges the converted amount. Send it so the quote can say so.
        currency: transferCurrency,
      });
      if (cancelled) return;
      // A failed quote must never block checkout — degrade to the previous behaviour (no breakdown)
      // rather than stranding a buyer who is ready to pay.
      const quote = response.error ? null : (response.data ?? null);
      setFeeQuote(quote);
      onQuoteChange?.(quote);
    })();

    return () => {
      cancelled = true;
    };
    // `transferCurrency` belongs here: the quote is currency-specific, so a currency change must
    // re-quote rather than leave a stale settlement block on screen.
  }, [quoteMethod, transferPriceMinorUnits, selectedCountry.code, transferCurrency, onQuoteChange]);

  /**
   * Story 135.1 — formats through the SHARED `formatCurrencyAmount`, the same helper
   * TransferSummaryCard uses, so the two panels on this screen cannot disagree.
   *
   * A hand-rolled `${minor / 100} Fr CFA` was rendering "5,208.34 Fr CFA" beside the card's
   * "5,208 XOF" for the same purchase — different symbol AND different precision. The shared
   * helper also knows XOF is a zero-decimal currency, so it stops quoting buyers a fractional
   * franc that cannot be paid.
   */
  const formatMinor = (minorUnits: number) =>
    formatCurrencyAmount(minorUnits / 100, transferCurrency as CurrencyCode);

  /**
   * Story 135.1 — the buyer's own-currency reference beneath the authoritative total.
   *
   * The amount debited is in `transferCurrency`, so that is the headline. But an international
   * buyer reading "5,208.34 Fr CFA" has no way to judge what she is spending, which is its own
   * failure of fee-model principle 1 — a total you cannot interpret is not a total you can consent
   * to. "≈" because this uses approximate client-side rates, never the gateway's.
   */
  const { pricing } = useCurrencyStore();
  const displayCurrency = pricing.currency as CurrencyCode;
  const approxInDisplayCurrency = (minorUnits: number): string | null => {
    if (!transferCurrency || transferCurrency === displayCurrency) return null;
    const converted = convertCurrency(
      minorUnits / 100,
      transferCurrency as CurrencyCode,
      displayCurrency,
    );
    return `≈ ${formatCurrencyAmount(converted, displayCurrency)}`;
  };

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

  /**
   * Story 134.8 — surface a payment-init failure.
   *
   * Discriminates on `error.code`, NOT on the 409 status: `/v2/payments/initialize` already
   * answers 409 for "a pending payment already exists", which is a different situation with
   * different advice. `ApiError.code` is populated by api-client.ts:333 for every failed request.
   *
   * ⚠ Do NOT "simplify" this by adding `case 409:` to getErrorKey() in api-client.ts — that maps
   * a bare STATUS platform-wide and would rewrite the pending-payment 409 for every caller of
   * every endpoint.
   *
   * The backend's `message` is English-only, so the stream case renders our own localised copy.
   */
  const reportPaymentError = (error: { message?: string; code?: string }) => {
    if (error.code === "STREAM_NOT_READY") {
      toast.error(tStreamSale("notReady"));
      onStreamNotReady?.();
      return;
    }
    toast.error(error.message || t("paymentInitFailed"));
  };

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

        setCaptchaToken(await getTurnstileToken());
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
          reportPaymentError(response.error);
          return;
        }

        if (response.data) {
          onPaymentInitiated(response.data.reference, true, response.data);
        }
      } else if (selectedMethod.type === "card") {
        setCaptchaToken(await getTurnstileToken());
        const response = await paymentApi.initializePaymentV2({
          transferId,
          customerEmail: buyerEmail,
          requestedCurrency: transferCurrency,
          paymentMethod: "card",
          countryCode: selectedCountry.code === "INTL" ? undefined : selectedCountry.code,
        });

        if (response.error) {
          reportPaymentError(response.error);
          return;
        }

        if (response.data?.authorizationUrl) {
          onPaymentInitiated(response.data.reference, false, response.data);
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

        setCaptchaToken(await getTurnstileToken());
        const response = await paymentApi.initializePaymentV2({
          transferId,
          customerEmail: buyerEmail,
          requestedCurrency: transferCurrency,
          paymentMethod: "card",
          preferredChannel,
          countryCode: selectedCountry.code === "INTL" ? undefined : selectedCountry.code,
        });

        if (response.error) {
          reportPaymentError(response.error);
          return;
        }

        if (response.data?.authorizationUrl) {
          onPaymentInitiated(response.data.reference, false, response.data);
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
      {turnstileEnabled && (
        <Turnstile
          ref={ownTurnstile.turnstileRef}
          siteKey={ownTurnstile.siteKey}
          options={{ size: 'invisible' }}
          onSuccess={ownTurnstile.onSuccess}
          onError={ownTurnstile.onError}
          onExpire={ownTurnstile.onExpire}
        />
      )}
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

      {/* Story 135.1 (D3, AC4) — the exact total, before the gateway.
          Same three lines and the same labels the `payment-prompt` screen already uses, so a buyer
          who reaches that screen sees a number she has already been shown rather than a new one.
          `aria-live` because the total changes when she switches country or method, and a screen
          reader user must hear that the amount moved. */}
      {/* Rendered whenever a quote exists, including a 0% rate (review, Low). Gating on
          `processingFeeMinorUnits > 0` made the whole breakdown — price included — disappear if an
          admin ever configured a zero or out-of-range rate, which is the opposite of AC4's
          "price, processing fee and total are shown". A 0 fee line is honest; no line is not. */}
      {feeQuote && (
        <div
          className="bg-gray-50 dark:bg-[oklch(0.24_0_0)] rounded p-4 mb-4 text-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 dark:text-[oklch(0.65_0_0)]">{t("filePrice")}</span>
            <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {formatMinor(feeQuote.priceMinorUnits)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-500 dark:text-[oklch(0.65_0_0)]">
              {feeQuote.feePercent
                ? t("processingFee", {
                    percent: feeQuote.feePercent.toFixed(feeQuote.feePercent % 1 === 0 ? 0 : 2),
                  })
                : t("processingFeeGeneric")}
            </span>
            <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {formatMinor(feeQuote.processingFeeMinorUnits)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <span className="text-gray-600 dark:text-[oklch(0.65_0_0)] font-bold">
              {t("totalCharged")}
            </span>
            <span className="flex flex-col items-end">
              <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
                {formatMinor(feeQuote.totalMinorUnits)}
              </span>
              {approxInDisplayCurrency(feeQuote.totalMinorUnits) && (
                <span className="text-xs font-normal text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {approxInDisplayCurrency(feeQuote.totalMinorUnits)}
                </span>
              )}
            </span>
          </div>
          {/* The buyer's gateway cannot charge this currency, so the payment path converts and
              charges the converted amount. Without this line the total above is a number she will
              never be charged — the Critical found at review, which hits Togo, Benin and Senegal,
              three of the markets ZeFile is built for. */}
          {feeQuote.settlement && (
            <p className="text-xs text-gray-500 dark:text-[oklch(0.60_0_0)] mt-2">
              {t("chargedAs", {
                // Story 144.1 — prefer the backend's formatting; the local `/100` is only right
                // while every currency the gateway settles in is two-decimal.
                amount:
                  feeQuote.settlement.displayAmount ??
                  `${(feeQuote.settlement.amountMinorUnits / 100).toLocaleString()} ${feeQuote.settlement.currency}`,
              })}
            </p>
          )}
        </div>
      )}

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
