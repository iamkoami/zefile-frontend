"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Flag from "react-flagpack";
import { Globe } from "iconoir-react";

interface FeeMethod {
  method: string;
  rate: string;
}

interface CountryFeeData {
  countryCode: string;
  flagCode: string | null;
  currency: string;
  processingFees: FeeMethod[];
  payoutFees: FeeMethod[];
}

const TRANSACTION_FEE_DATA: CountryFeeData[] = [
  {
    countryCode: "CI",
    flagCode: "CI",
    currency: "XOF",
    processingFees: [
      { method: "mobileMoney", rate: "2.95%" },
      { method: "card", rate: "4%" },
    ],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "NG",
    flagCode: "NG",
    currency: "NGN",
    processingFees: [
      { method: "mobileMoney", rate: "2%" },
      { method: "card", rate: "2.5%" },
    ],
    payoutFees: [{ method: "bank", rate: "50 NGN" }],
  },
  {
    countryCode: "GH",
    flagCode: "GH",
    currency: "GHS",
    processingFees: [
      { method: "mobileMoney", rate: "2.9%" },
      { method: "card", rate: "2.9%" },
    ],
    payoutFees: [
      { method: "mobileMoney", rate: "2 GHS" },
      { method: "bank", rate: "15 GHS" },
    ],
  },
  {
    countryCode: "KE",
    flagCode: "KE",
    currency: "KES",
    processingFees: [
      { method: "mobileMoney", rate: "2.5%" },
      { method: "card", rate: "3.9%" },
    ],
    payoutFees: [
      { method: "mobileMoney", rate: "50 KES" },
      { method: "bank", rate: "200 KES" },
    ],
  },
  {
    countryCode: "SN",
    flagCode: "SN",
    currency: "XOF",
    processingFees: [
      { method: "mobileMoney", rate: "3%" },
      { method: "card", rate: "4%" },
    ],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "BJ",
    flagCode: "BJ",
    currency: "XOF",
    processingFees: [{ method: "mobileMoney", rate: "3.5%" }],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "TG",
    flagCode: "TG",
    currency: "XOF",
    processingFees: [{ method: "mobileMoney", rate: "3.5%" }],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "BF",
    flagCode: "BF",
    currency: "XOF",
    processingFees: [{ method: "mobileMoney", rate: "3.5%" }],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "ML",
    flagCode: "ML",
    currency: "XOF",
    processingFees: [{ method: "mobileMoney", rate: "3.5%" }],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "GN",
    flagCode: "GN",
    currency: "XOF",
    processingFees: [{ method: "mobileMoney", rate: "3.5%" }],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "CM",
    flagCode: "CM",
    currency: "XAF",
    processingFees: [{ method: "mobileMoney", rate: "3.5%" }],
    payoutFees: [{ method: "mobileMoney", rate: "2.5%" }],
  },
  {
    countryCode: "ZA",
    flagCode: "ZA",
    currency: "ZAR",
    processingFees: [{ method: "card", rate: "3.9%" }],
    payoutFees: [{ method: "bank", rate: "5 ZAR" }],
  },
  {
    countryCode: "TZ",
    flagCode: "TZ",
    currency: "TZS",
    processingFees: [{ method: "mobileMoney", rate: "3%" }],
    payoutFees: [{ method: "mobileMoney", rate: "3%" }],
  },
  {
    countryCode: "UG",
    flagCode: "UG",
    currency: "UGX",
    processingFees: [{ method: "mobileMoney", rate: "3%" }],
    payoutFees: [{ method: "mobileMoney", rate: "1,150 UGX" }],
  },
  {
    countryCode: "RW",
    flagCode: "RW",
    currency: "RWF",
    processingFees: [{ method: "card", rate: "3.9%" }],
    payoutFees: [{ method: "bank", rate: "400 RWF" }],
  },
  {
    countryCode: "INTL",
    flagCode: null,
    currency: "USD",
    processingFees: [{ method: "card", rate: "4.6%" }],
    payoutFees: [],
  },
];

interface TransactionFeesSectionProps {
  compact?: boolean;
}

export function TransactionFeesSection({ compact = false }: TransactionFeesSectionProps) {
  const t = useTranslations("subscriptions");
  const [selectedCountry, setSelectedCountry] = useState("CI");
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

  // Update scroll indicators on mount and resize
  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  // Auto-scroll selected pill into view
  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      `[data-country="${selectedCountry}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedCountry]);

  const selectedData = TRANSACTION_FEE_DATA.find(
    (d) => d.countryCode === selectedCountry,
  );

  const highlight = (chunks: React.ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  return (
    <div className={compact ? "mt-20 relative" : "mt-32 max-w-[55rem] mx-auto relative"}>
      <h2 className={compact
        ? "text-xl font-semibold text-[#171717] mb-4 text-center"
        : "text-3xl md:text-5xl font-bold text-[#171717] mb-4 text-center"
      }>
        {t.rich("transactionFeesTitle", { highlight })}
      </h2>
      <p className={compact
        ? "text-sm text-gray-500 text-center max-w-2xl mx-auto mb-8"
        : "text-sm md:text-base text-gray-500 text-center max-w-2xl mx-auto mb-10"
      }>
        {t("transactionFeesSubtitle")}
      </p>

      {/* Currency scroll strip */}
      <div className={`relative mx-auto ${compact ? "max-w-3xl mb-8" : "max-w-3xl mb-10"}`}>
        {/* Left gradient fade */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none rounded-l-xl transition-opacity duration-200 ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Scrollable track */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          onMouseDown={onMouseDown}
          className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth p-2 bg-gray-50/80 rounded-xl cursor-grab [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {TRANSACTION_FEE_DATA.map((entry) => {
            const isSelected = selectedCountry === entry.countryCode;
            return (
              <button
                key={entry.countryCode}
                data-country={entry.countryCode}
                onClick={() => {
                  if (hasDragged.current) return;
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

        {/* Right gradient fade */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none rounded-r-xl transition-opacity duration-200 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Fee card */}
      {selectedData && (
        <div className="max-w-lg mx-auto rounded-2xl border border-gray-200 bg-white p-6 md:p-8">
          <h3 className="text-lg font-bold text-[#171717] text-center mb-6">
            {t(`country${selectedData.countryCode}`)} ({selectedData.currency})
          </h3>

          <div className="space-y-5">
            {/* Processing fee */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#171717]">
                  {t("processingFee")}
                </span>
                <span className="text-xs text-gray-400">
                  {t("buyerPays")}
                </span>
              </div>
              <div className="space-y-1.5">
                {selectedData.processingFees.map((m) => (
                  <div
                    key={m.method}
                    className="flex items-center justify-between text-sm text-gray-600"
                  >
                    <span>{t(m.method)}</span>
                    <span className="font-medium text-[#171717]">
                      {m.rate}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout fee - only show when available */}
            {selectedData.payoutFees.length > 0 && (
              <>
                <div className="border-t border-gray-100" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[#171717]">
                      {t("payoutFee")}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t("sellerPays")}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedData.payoutFees.map((m) => (
                      <div
                        key={m.method}
                        className="flex items-center justify-between text-sm text-gray-600"
                      >
                        <span>{t(m.method)}</span>
                        <span className="font-medium text-[#171717]">
                          {m.rate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
