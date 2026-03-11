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
    <div className={`bg-[#FDF8F0] rounded-xl p-8 flex flex-col ${className}`}>
      {/* Header */}
      <h3 className="text-sm font-bold text-gray-600 mb-3">
        {t("transferSummary")}
      </h3>

      {/* Transfer Title */}
      <h4 className="text-xl font-bold text-[#171717] mb-2">
        {title || "Untitled Transfer"}
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
      <p className="text-xs text-gray-500 mb-4 ">
        {fileCount} {fileCount === 1 ? t("file") : t("files")} -{" "}
        {formatFileSize(totalSize)}
        {createdAt && ` - ${t("sentOn")} ${formatDate(createdAt)}`}
      </p>

      {/* Sender info */}
      {senderEmail && (
        <p className="text-xs text-gray-500 mb-4">
          From:{" "}
          <span className="font-medium text-[#171717]">{senderEmail}</span>
        </p>
      )}
      {/* Message/Description */}
      {message && (
        <p className="text-xs text-gray-600 mb-6 leading-relaxed">{message}</p>
      )}

      {/* Spacer to push file stats and total to bottom */}
      <div className="flex-1" />

      {/* File Stats Box */}
      <div className="bg-white rounded-lg p-4 mb-4 flex items-center justify-between">
        <span className="font-medium text-[#171717]">
          {fileCount} {fileCount === 1 ? t("file") : t("files")}
        </span>
        <span className="font-bold text-gray-600">
          {formatFileSize(totalSize)}
        </span>
      </div>

      {/* Price breakdown with processing fee */}
      {price > 0 && processingFeeMinorUnits && processingFeeMinorUnits > 0 ? (
        <div className="pt-4 border-t border-[#E8E0D5] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{t("filePrice")}</span>
            <span className="text-sm font-medium text-[#171717]">
              {formatAmount(price, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {processingFeePercent
                ? t("processingFee", {
                    percent: processingFeePercent.toFixed(
                      processingFeePercent % 1 === 0 ? 0 : 2,
                    ),
                  })
                : t("processingFeeGeneric")}
            </span>
            <span className="text-sm font-medium text-[#171717]">
              {formatAmount(processingFeeMinorUnits, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#E8E0D5]">
            <span className="font-bold text-[#171717]">
              {t("totalCharged")}
            </span>
            <span className="text-xl font-bold text-[#171717]">
              {formatAmount(
                totalAmountMinorUnits || price + processingFeeMinorUnits,
                currency,
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-4 border-t border-[#E8E0D5]">
          <span className="font-bold text-[#171717]">{t("total")}</span>
          <span className="text-xl font-bold text-[#171717]">
            {price > 0 ? formatAmount(price, currency) : t("freeTransfer")}
          </span>
        </div>
      )}
    </div>
  );
}

export default TransferSummaryCard;
