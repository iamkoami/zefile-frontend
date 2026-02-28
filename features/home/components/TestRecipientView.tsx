"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, CreditCard } from "iconoir-react";
import { TestSimulationData } from "./TestResultPage";

interface TestRecipientViewProps {
  simulationData: TestSimulationData;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const TestRecipientView: React.FC<TestRecipientViewProps> = ({
  simulationData,
}) => {
  const t = useTranslations("testResult");
  const isPaid = simulationData.price > 0;

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <p className="text-sm text-gray-500">{t("recipientExplainer")}</p>

      {/* Section A: Compact email notification card */}
      <div className="border border-gray-200 rounded bg-white p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          {t("recipientEmailTitle")}
        </p>
        <h3 className="text-base font-bold leading-snug mb-1">
          <span className="text-[#5E53E0]">
            {simulationData.senderEmail}
          </span>{" "}
          {t("sentYou")}{" "}
          <span className="text-[#171717]">
            {simulationData.title || simulationData.filename}
          </span>
        </h3>
        <p className="text-sm text-gray-500">
          1 {t("filesCountLabel")},{" "}
          {formatFileSize(simulationData.fileSize)} {t("totalLabel")}
        </p>
      </div>

      {/* Section B: Simulated download panel (mirrors real download page) */}
      <div className="border-2 border-[#171717] rounded-xl bg-white p-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
          {t("simulatedDownloadPanel")}
        </p>

        {/* Download icon */}
        <div className="flex flex-col items-center mb-4">
          <Download className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-[#171717] text-center mb-1">
          {t("downloadFilesLabel")} !
        </h3>

        {/* Expiry */}
        <p className="text-sm text-gray-500 text-center mb-1">
          {t("expiresInLabel")}
        </p>
        <p className="text-sm font-bold text-[#171717] text-center mb-4">
          {t("oneHour")}
        </p>

        {/* Transfer title */}
        <h4 className="text-base font-bold text-[#171717] mb-1">
          {simulationData.title || simulationData.filename}
        </h4>

        {/* Preview before you pay (paid only) */}
        {isPaid && (
          <p className="text-sm font-medium text-[#5E53E0] mb-3">
            {t("previewBeforeYouPay")}
          </p>
        )}
        {!isPaid && <div className="mb-2" />}

        {/* File info bar */}
        <div className="flex items-center justify-between py-4 px-4 bg-gray-100 rounded mb-4">
          <p className="text-sm font-medium text-[#171717]">
            1 {t("filesCountLabel")}
          </p>
          <p className="text-sm font-medium text-gray-400">
            {formatFileSize(simulationData.fileSize)}
          </p>
        </div>

        {/* Disabled action buttons (mirroring real download page) */}
        <div className="space-y-3">
          <button
            disabled
            className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPaid ? (
              <>
                <CreditCard className="w-5 h-5" />
                {t("ctaPaid")}
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                {t("ctaFree")}
              </>
            )}
          </button>
          <button
            disabled
            className="w-full px-6 py-3.5 border-2 border-gray-300 bg-white text-[#171717] font-medium rounded opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {t("previewLabel")}
          </button>
        </div>
      </div>

      {/* Recipient email note */}
      <div className="bg-gray-50 rounded px-4 py-3">
        <p className="text-xs text-gray-500">
          {t("recipientEmailNote", {
            email: simulationData.recipientEmails[0] || "",
          })}
        </p>
      </div>
    </div>
  );
};

export default TestRecipientView;
