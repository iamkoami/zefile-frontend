"use client";

import { GitPullRequest } from "iconoir-react";
import { useTranslations } from "next-intl";
import { useCurrencyStore } from "@/stores/currency-store";
import {
  convertCurrency,
  formatCurrencyAmount,
  type CurrencyCode,
} from "@/lib/currency";

export interface TransferSummaryCardProps {
  title: string;
  fileCount: number;
  totalSize: number;
  price: number;
  currency: string;
  message?: string | null;
  createdAt?: string;
  senderEmail?: string;
  versionCount?: number;
  className?: string;
  /** Processing fee in minor units (pass-through to buyer) */
  processingFeeMinorUnits?: number;
  /** Processing fee rate (e.g. 2.95 means 2.95%) */
  processingFeePercent?: number;
  /** Total charged to buyer in minor units (price + processing fee) */
  totalAmountMinorUnits?: number;
  /**
   * Story 135.1 — checkout mode. Amounts render in the transfer's OWN currency (the one that will
   * be debited) with the viewer's display currency shown beneath the total as a clearly-marked
   * approximation.
   *
   * Both are needed and neither alone is enough: the charge currency is the only honest headline
   * on a screen with a Pay button, but an international buyer who thinks in dollars cannot judge
   * "5,208 Fr CFA" without it. Defaults false, so browsing call sites are unchanged.
   */
  useChargeCurrency?: boolean;
  /**
   * Story 135.1 — the gateway settlement amount, when the buyer's gateway cannot charge the
   * transfer currency natively (Togo/Benin/Senegal route to Startbutton, which has no XOF).
   *
   * Must be passed wherever the checkout panel shows it: with it on one panel and not the other,
   * a Togolese buyer sees two totals and only one of them mentions that she is actually charged
   * in GHS — which is the same two-panels-disagree defect this card was just fixed for.
   */
  settlementAmountMinorUnits?: number;
  settlementCurrency?: string;
}

/**
 * TransferSummaryCard - Displays transfer summary with beige background
 * Used in payment flow and transfer landing page
 */
export function TransferSummaryCard({
  title,
  fileCount,
  totalSize,
  price,
  currency,
  message,
  createdAt,
  senderEmail,
  versionCount,
  className = "",
  processingFeeMinorUnits,
  processingFeePercent,
  totalAmountMinorUnits,
  useChargeCurrency = false,
  settlementAmountMinorUnits,
  settlementCurrency,
}: TransferSummaryCardProps) {
  const t = useTranslations("payment");
  const { pricing } = useCurrencyStore();
  const displayCurrency = pricing.currency as CurrencyCode;

  /**
   * Format amount with currency conversion
   * Converts from transfer's original currency to user's selected display currency
   */
  const formatAmount = (amount: number, originalCurrency: string): string => {
    // Amount is in minor units, convert to major units first
    const majorUnits = amount / 100;

    // Story 135.1 — at checkout, money is shown in the currency that DETERMINES THE CHARGE.
    //
    // The display-currency toggle is a browsing convenience backed by approximate client-side
    // rates with a hardcoded fallback table (`lib/currency.ts` getCurrentRates). That is fine for
    // scanning a page; it is not fine as the headline figure on a screen with a Pay button. The
    // buyer's card is debited the transfer's own currency, and this card was rendering "$8.26"
    // beside a checkout panel reading "5,208.34 Fr CFA" for the same purchase.
    if (useChargeCurrency) {
      return formatCurrencyAmount(majorUnits, originalCurrency as CurrencyCode);
    }

    // Convert to display currency if different
    if (originalCurrency !== displayCurrency) {
      const convertedAmount = convertCurrency(
        majorUnits,
        originalCurrency as CurrencyCode,
        displayCurrency,
      );
      return formatCurrencyAmount(convertedAmount, displayCurrency);
    }

    // Same currency, just format
    return formatCurrencyAmount(majorUnits, originalCurrency as CurrencyCode);
  };

  /**
   * Story 135.1 — the buyer's own-currency reference, beneath the authoritative charge amount.
   *
   * An international buyer thinking in dollars cannot judge "5,208 Fr CFA"; the charge currency
   * alone is honest but unreadable to her. Returns null when it would add nothing (same currency,
   * or not in checkout mode) so the line never appears as noise.
   *
   * Marked with "≈" deliberately: this comes from approximate client-side rates
   * (`lib/currency.ts`), NOT from the gateway. It is a reference, never the amount charged.
   */
  const approxInDisplayCurrency = (amount: number, originalCurrency: string): string | null => {
    if (!useChargeCurrency) return null;
    if (originalCurrency === displayCurrency) return null;
    const converted = convertCurrency(
      amount / 100,
      originalCurrency as CurrencyCode,
      displayCurrency,
    );
    return `≈ ${formatCurrencyAmount(converted, displayCurrency)}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className={`bg-[#FDF8F0] dark:bg-[oklch(0.24_0_0)] rounded-xl p-8 flex flex-col ${className}`}>
      {/* Header */}
      <h3 className="text-sm font-bold text-gray-600 dark:text-[oklch(0.65_0_0)] mb-3">
        {t("transferSummary")}
      </h3>

      {/* Transfer Title */}
      <h4 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
        {title || "Untitled Transfer"}
        {fileCount > 1 && (
          <span className="ml-2 text-xs font-normal text-gray-400 dark:text-[oklch(0.50_0_0)]">
            {t("plusFiles", { count: fileCount - 1 })}
          </span>
        )}
      </h4>

      {/* Version indicator */}
      {versionCount && versionCount > 1 && (
        <div className="flex items-center gap-1.5 mb-3">
          <GitPullRequest className="w-4 h-4 text-[#5E53E0]" />
          <span className="text-xs text-[#5E53E0] font-medium">
            {t("latestVersion")} ({versionCount}{" "}
            {versionCount === 1 ? t("version") : t("versions")})
          </span>
        </div>
      )}

      {/* File Info */}
      <p className="text-xs text-gray-500 dark:text-[oklch(0.60_0_0)] mb-4 ">
        {fileCount} {fileCount === 1 ? t("file") : t("files")} -{" "}
        {formatFileSize(totalSize)}
        {createdAt && ` - ${t("sentOn")} ${formatDate(createdAt)}`}
      </p>

      {/* Sender info */}
      {senderEmail && (
        <p className="text-xs text-gray-500 dark:text-[oklch(0.60_0_0)] mb-4">
          From:{" "}
          <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">{senderEmail}</span>
        </p>
      )}
      {/* Delivery Note */}
      {message && (
        <div className="border-l-2 border-[#5E53E0] pl-3 mb-6">
          <p className="text-sm text-[#171717] dark:text-[oklch(0.85_0_0)] leading-relaxed whitespace-pre-line">{message}</p>
        </div>
      )}

      {/* Spacer to push file stats and total to bottom */}
      <div className="flex-1" />

      {/* File Stats Box */}
      <div className="bg-white dark:bg-[oklch(0.22_0_0)] rounded-lg p-4 mb-4 flex items-center justify-between">
        <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
          {fileCount} {fileCount === 1 ? t("file") : t("files")}
        </span>
        <span className="font-bold text-gray-600 dark:text-[oklch(0.65_0_0)]">
          {formatFileSize(totalSize)}
        </span>
      </div>

      {/* Price breakdown with processing fee */}
      {price > 0 && processingFeeMinorUnits && processingFeeMinorUnits > 0 ? (
        <div className="pt-4 border-t border-[#E8E0D5] dark:border-[oklch(0.30_0_0)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">{t("filePrice")}</span>
            <span className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {formatAmount(price, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
              {processingFeePercent
                ? t("processingFee", {
                    percent: processingFeePercent.toFixed(
                      processingFeePercent % 1 === 0 ? 0 : 2,
                    ),
                  })
                : t("processingFeeGeneric")}
            </span>
            <span className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {formatAmount(processingFeeMinorUnits, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8E0D5] dark:border-[oklch(0.30_0_0)]">
            <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {t("totalCharged")}
            </span>
            <span className="flex flex-col items-end">
              <span className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
                {formatAmount(
                  totalAmountMinorUnits || price + processingFeeMinorUnits,
                  currency,
                )}
              </span>
              {approxInDisplayCurrency(
                totalAmountMinorUnits || price + processingFeeMinorUnits,
                currency,
              ) && (
                <span className="text-sm font-normal text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {approxInDisplayCurrency(
                    totalAmountMinorUnits || price + processingFeeMinorUnits,
                    currency,
                  )}
                </span>
              )}
            </span>
          </div>
          {settlementCurrency && settlementAmountMinorUnits != null && (
            <p className="text-xs text-gray-500 dark:text-[oklch(0.60_0_0)] pt-1">
              {t("chargedAs", {
                amount: `${(settlementAmountMinorUnits / 100).toLocaleString()} ${settlementCurrency}`,
              })}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pt-4 border-t border-[#E8E0D5] dark:border-[oklch(0.30_0_0)]">
          <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">{t("total")}</span>
          <span className="flex flex-col items-end">
            <span className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {price > 0 ? formatAmount(price, currency) : t("freeTransfer")}
            </span>
            {price > 0 && approxInDisplayCurrency(price, currency) && (
              <span className="text-sm font-normal text-gray-500 dark:text-[oklch(0.60_0_0)]">
                {approxInDisplayCurrency(price, currency)}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default TransferSummaryCard;
