"use client";

import { PageEdit, GitPullRequest } from "iconoir-react";
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
    <div className={`bg-[#FDF8F0] rounded-lg p-6 flex flex-col ${className}`}>
      {/* Header */}
      <h3 className="text-sm font-medium text-gray-600 mb-3">
        {t("transferSummary")}
      </h3>

      {/* Transfer Title */}
      <h4 className="text-xl font-bold text-[#171717] mb-2">
        {title || "Untitled Transfer"}
      </h4>

      {/* Version indicator */}
      {versionCount && versionCount > 1 && (
        <div className="flex items-center gap-1.5 mb-12">
          <GitPullRequest className="w-4 h-4 text-[#5E53E0]" />
          <span className="text-sm text-[#5E53E0] font-medium">
            {t("latestVersion")} ({versionCount}{" "}
            {versionCount === 1 ? t("version") : t("versions")})
          </span>
        </div>
      )}

      {/* File Info */}
      <p className="text-sm text-gray-500 mb-4 ">
        {fileCount} {fileCount === 1 ? t("file") : t("files")} -{" "}
        {formatFileSize(totalSize)}
        {createdAt && ` - ${t("sentOn")} ${formatDate(createdAt)}`}
      </p>

      {/* Sender info */}
      {senderEmail && (
        <p className="text-sm text-gray-500 mb-4">
          From:{" "}
          <span className="font-medium text-[#171717]">{senderEmail}</span>
        </p>
      )}
      <span className="flex-1 mt-10" />
      {/* Message/Description */}
      {message && (
        <p className="text-sm text-gray-600 mb-6 line-clamp-4">{message}</p>
      )}

      {/* File Stats Box */}
      <div className="bg-white rounded-lg p-4 mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PageEdit className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-[#171717]">
            {fileCount} {fileCount === 1 ? t("file") : t("files")}
          </span>
        </div>
        <span className="font-medium text-gray-600">
          {formatFileSize(totalSize)}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Total */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8E0D5]">
        <span className="font-semibold text-[#171717]">{t("total")}</span>
        <span className="text-xl font-bold text-[#171717]">
          {price > 0 ? formatAmount(price, currency) : t("freeTransfer")}
        </span>
      </div>
    </div>
  );
}

export default TransferSummaryCard;
