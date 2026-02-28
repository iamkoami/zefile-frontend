"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import Flag from "react-flagpack";
import { Globe } from "iconoir-react";

// Payout fee data per country for calculator computation
interface PayoutFee {
  type: "percent" | "fixed";
  value: number; // percent value (2.5) or fixed amount in major currency units
}

interface CountryCalcData {
  countryCode: string;
  flagCode: string | null;
  currency: string;
  currencySymbol: string;
  payoutFee: PayoutFee | null;
  noDecimals: boolean;
}

const COUNTRY_CALC_DATA: CountryCalcData[] = [
  { countryCode: "CI", flagCode: "CI", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "NG", flagCode: "NG", currency: "NGN", currencySymbol: "\u20A6", payoutFee: { type: "fixed", value: 50 }, noDecimals: true },
  { countryCode: "GH", flagCode: "GH", currency: "GHS", currencySymbol: "GH\u20B5", payoutFee: { type: "fixed", value: 2 }, noDecimals: false },
  { countryCode: "KE", flagCode: "KE", currency: "KES", currencySymbol: "KSh", payoutFee: { type: "fixed", value: 50 }, noDecimals: true },
  { countryCode: "SN", flagCode: "SN", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "BJ", flagCode: "BJ", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "TG", flagCode: "TG", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "BF", flagCode: "BF", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "ML", flagCode: "ML", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "GN", flagCode: "GN", currency: "XOF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "CM", flagCode: "CM", currency: "XAF", currencySymbol: "CFA", payoutFee: { type: "percent", value: 2.5 }, noDecimals: true },
  { countryCode: "ZA", flagCode: "ZA", currency: "ZAR", currencySymbol: "R", payoutFee: { type: "fixed", value: 5 }, noDecimals: false },
  { countryCode: "TZ", flagCode: "TZ", currency: "TZS", currencySymbol: "TSh", payoutFee: { type: "percent", value: 3 }, noDecimals: true },
  { countryCode: "UG", flagCode: "UG", currency: "UGX", currencySymbol: "USh", payoutFee: { type: "fixed", value: 1150 }, noDecimals: true },
  { countryCode: "RW", flagCode: "RW", currency: "RWF", currencySymbol: "RF", payoutFee: { type: "fixed", value: 400 }, noDecimals: true },
  { countryCode: "INTL", flagCode: null, currency: "USD", currencySymbol: "$", payoutFee: null, noDecimals: false },
];

const PLATFORM_FEE_TIERS = [
  { id: "free", percent: 7 },
  { id: "starter", percent: 5 },
  { id: "pro", percent: 3 },
] as const;

// Sensible default prices per currency
const DEFAULT_PRICES: Record<string, number> = {
  XOF: 10000,
  XAF: 10000,
  NGN: 10000,
  GHS: 100,
  KES: 5000,
  ZAR: 500,
  TZS: 50000,
  UGX: 100000,
  RWF: 50000,
  USD: 50,
};

function formatAmount(amount: number, noDecimals: boolean): string {
  if (noDecimals) {
    return Math.round(amount).toLocaleString("en-US");
  }
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TransactionFeesSectionProps {
  compact?: boolean;
}

export function TransactionFeesSection({ compact = false }: TransactionFeesSectionProps) {
  const t = useTranslations("subscriptions");
  const [selectedCountry, setSelectedCountry] = useState("NG");
  const [selectedTier, setSelectedTier] = useState<"free" | "starter" | "pro">("free");
  const [priceInput, setPriceInput] = useState(
    String(DEFAULT_PRICES["NGN"] || 10000),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  // Drag-to-scroll state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);
  const hasDragged = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = e.pageX;
    scrollStartLeft.current = el.scrollLeft;
    el.style.scrollBehavior = "auto";
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.pageX - dragStartX.current;
    if (Math.abs(dx) > 3) hasDragged.current = true;
    scrollRef.current!.scrollLeft = scrollStartLeft.current - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const el = scrollRef.current;
    if (el) {
      el.style.scrollBehavior = "smooth";
      el.style.cursor = "";
      el.style.userSelect = "";
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [onMouseUp, onMouseMove]);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  // Scroll selected pill into view
  const isUserSelection = useRef(false);
  useEffect(() => {
    if (!isUserSelection.current) return;
    isUserSelection.current = false;
    const container = scrollRef.current;
    const el = container?.querySelector(
      `[data-country="${selectedCountry}"]`,
    ) as HTMLElement | null;
    if (!container || !el) return;
    const elCenter = el.offsetLeft + el.offsetWidth / 2;
    container.scrollTo({
      left: elCenter - container.clientWidth / 2,
      behavior: "smooth",
    });
  }, [selectedCountry]);

  const selectedData = useMemo(
    () => COUNTRY_CALC_DATA.find((d) => d.countryCode === selectedCountry),
    [selectedCountry],
  );

  // Update default price when country changes
  useEffect(() => {
    if (selectedData) {
      setPriceInput(String(DEFAULT_PRICES[selectedData.currency] || 50));
    }
  }, [selectedData]);

  const price = useMemo(() => {
    const val = parseFloat(priceInput.replace(/,/g, ""));
    return isNaN(val) || val < 0 ? 0 : val;
  }, [priceInput]);

  const platformFeePercent =
    PLATFORM_FEE_TIERS.find((tier) => tier.id === selectedTier)?.percent || 7;

  const breakdown = useMemo(() => {
    if (!selectedData || price <= 0) return null;

    const platformFee = price * (platformFeePercent / 100);

    let payoutFee = 0;
    let payoutFeeLabel = "";
    if (selectedData.payoutFee) {
      if (selectedData.payoutFee.type === "percent") {
        payoutFee = price * (selectedData.payoutFee.value / 100);
        payoutFeeLabel = `~${selectedData.payoutFee.value}%`;
      } else {
        payoutFee = selectedData.payoutFee.value;
        payoutFeeLabel = `${formatAmount(payoutFee, selectedData.noDecimals)} ${selectedData.currency}`;
      }
    }

    const youEarn = Math.max(0, price - platformFee - payoutFee);

    return {
      platformFee,
      payoutFee,
      payoutFeeLabel,
      youEarn,
      hasPayoutFee: selectedData.payoutFee !== null,
    };
  }, [price, platformFeePercent, selectedData]);

  const fmt = useCallback(
    (amount: number) => {
      if (!selectedData) return "";
      const num = formatAmount(amount, selectedData.noDecimals);
      if (selectedData.currency === "USD" || selectedData.currency === "GHS") {
        return `${selectedData.currencySymbol}${num}`;
      }
      return `${num} ${selectedData.currencySymbol}`;
    },
    [selectedData],
  );

  const highlight = (chunks: React.ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  return (
    <div
      className={
        compact
          ? "mt-20 relative"
          : "mt-32 max-w-[55rem] mx-auto relative"
      }
    >
      <h2
        className={
          compact
            ? "text-xl font-semibold text-[#171717] mb-4 text-center"
            : "text-3xl md:text-5xl font-bold text-[#171717] mb-4 text-center"
        }
      >
        {t.rich("earningsCalcTitle", { highlight })}
      </h2>
      <p
        className={
          compact
            ? "text-sm text-gray-500 text-center max-w-2xl mx-auto mb-8"
            : "text-sm md:text-base text-gray-500 text-center max-w-2xl mx-auto mb-10"
        }
      >
        {t("earningsCalcSubtitle")}
      </p>

      {/* Country scroll strip */}
      <div
        className={`relative mx-auto ${compact ? "max-w-3xl mb-8" : "max-w-3xl mb-10"}`}
      >
        <div
          className={`absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none rounded-l-xl transition-opacity duration-200 ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          onMouseDown={onMouseDown}
          className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth p-2 bg-gray-50/80 rounded-xl cursor-grab [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {COUNTRY_CALC_DATA.map((entry) => {
            const isSelected = selectedCountry === entry.countryCode;
            return (
              <button
                key={entry.countryCode}
                data-country={entry.countryCode}
                onClick={() => {
                  if (hasDragged.current) return;
                  isUserSelection.current = true;
                  setSelectedCountry(entry.countryCode);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  isSelected
                    ? "bg-[#5E53E0] text-white shadow-md scale-[1.02]"
                    : "bg-white/80 text-[#171717] hover:bg-white hover:shadow-sm"
                }`}
              >
                {entry.flagCode ? (
                  <Flag code={entry.flagCode} size="s" hasBorder={false} />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                {entry.currency}
              </button>
            );
          })}
        </div>

        <div
          className={`absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none rounded-r-xl transition-opacity duration-200 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Calculator card */}
      {selectedData && (
        <div className="max-w-lg mx-auto rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          {/* Price input */}
          <div className="mb-5">
            <label className="text-sm font-semibold text-[#171717] mb-2 block">
              {t("calcYourPrice")}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium pointer-events-none">
                {selectedData.currencySymbol}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, "");
                  setPriceInput(val);
                }}
                className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-lg text-lg font-semibold text-[#171717] focus:outline-none focus:border-[#5E53E0] focus:ring-1 focus:ring-[#5E53E0] transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Tier selector */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-[#171717] mb-2 block">
              {t("calcYourPlan")}
            </label>
            <div className="flex gap-2">
              {PLATFORM_FEE_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    selectedTier === tier.id
                      ? "bg-[#171717] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t(`tiers.${tier.id}.name`)}
                  <span className="ml-1 opacity-70">({tier.percent}%)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          {breakdown && price > 0 ? (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t("calcYourPrice")}</span>
                <span className="font-medium text-[#171717]">
                  {fmt(price)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {t("platformFee")} ({platformFeePercent}%)
                </span>
                <span className="font-medium text-gray-400">
                  -{fmt(breakdown.platformFee)}
                </span>
              </div>
              {breakdown.hasPayoutFee && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {t("payoutFee")} ({breakdown.payoutFeeLabel})
                  </span>
                  <span className="font-medium text-gray-400">
                    -{fmt(breakdown.payoutFee)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-base font-bold text-[#171717]">
                  {t("calcYouEarn")}
                </span>
                <span className="text-xl font-bold text-[#87E64B]">
                  {fmt(breakdown.youEarn)}
                </span>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 pt-5 text-center text-sm text-gray-400">
              {t("calcEnterPrice")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
