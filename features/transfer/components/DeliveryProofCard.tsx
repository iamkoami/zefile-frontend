"use client";

import React, { useCallback, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatCurrencyFromMinor } from "@/lib/currency";
import { invoicesApi } from "@/services/invoices-api";
import { toast } from "@/components/shared/Toast";

interface DeliveryProofCardProps {
  certificateNumber: string;
  recipientEmail?: string;
  paymentDate?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  fileCount?: number;
  invoiceId: string;
  verifyUrl: string;
}

const DeliveryProofCard: React.FC<DeliveryProofCardProps> = ({
  certificateNumber,
  recipientEmail,
  paymentDate,
  paymentAmount,
  paymentCurrency,
  fileCount,
  invoiceId,
  verifyUrl,
}) => {
  const t = useTranslations("deliveryProofCard");
  const locale = useLocale();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const res = await invoicesApi.downloadInvoice(invoiceId);
      if (res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error(t("downloadError"));
      }
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setIsDownloading(false);
    }
  }, [invoiceId, t]);

  const formattedDate = paymentDate
    ? new Date(paymentDate).toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const formattedAmount =
    paymentAmount != null && paymentCurrency
      ? // `paymentAmount` is `metadata.payment.amountMinor` — MINOR units (story 144.7).
        formatCurrencyFromMinor(paymentAmount, paymentCurrency, locale)
      : null;

  return (
    <div className="bg-[#FDFAF4] dark:bg-[oklch(0.22_0.01_80)] border border-[#E5E5E5] dark:border-border rounded p-4 mt-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
          {t("title")}
        </span>
        <span className="text-xs text-[#666] dark:text-[oklch(0.55_0_0)] font-mono">
          {certificateNumber}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#555] dark:text-[oklch(0.65_0_0)]">
        {recipientEmail && (
          <div>
            <span className="text-[#999] dark:text-[oklch(0.50_0_0)]">
              {t("recipient")}
            </span>
            <span className="ml-1.5">{recipientEmail}</span>
          </div>
        )}
        {formattedDate && (
          <div>
            <span className="text-[#999] dark:text-[oklch(0.50_0_0)]">
              {t("paymentDate")}
            </span>
            <span className="ml-1.5">{formattedDate}</span>
          </div>
        )}
        {formattedAmount && (
          <div>
            <span className="text-[#999] dark:text-[oklch(0.50_0_0)]">
              {t("amount")}
            </span>
            <span className="ml-1.5">{formattedAmount}</span>
          </div>
        )}
        {fileCount != null && (
          <div>
            <span className="text-[#999] dark:text-[oklch(0.50_0_0)]">
              {t("filesDelivered")}
            </span>
            <span className="ml-1.5">{fileCount}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-3 pt-3 border-t border-[#E5E5E5] dark:border-border">
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#5E53E0] dark:text-[oklch(0.72_0.15_280)] hover:underline"
        >
          {t("verify")}
        </a>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-sm text-[#5E53E0] dark:text-[oklch(0.72_0.15_280)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? t("downloading") : t("downloadPdf")}
        </button>
      </div>
    </div>
  );
};

export default DeliveryProofCard;
