"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, CreditCard } from "iconoir-react";
import { TestSimulationData } from "./TestResultPage";

interface TestDownloadSimulationProps {
  simulationData: TestSimulationData;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const TestDownloadSimulation: React.FC<TestDownloadSimulationProps> = ({
  simulationData,
}) => {
  const t = useTranslations("testResult");
  const isPaid = simulationData.price > 0;

  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
        {t("simulatedDownloadPanel")}
      </p>

      {/* Download icon */}
      <div className="flex flex-col items-center mb-3">
        <Download className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-[#171717] text-center mb-1">
        {t("downloadFilesLabel")} !
      </h3>

      {/* Expiry */}
      <p className="text-sm text-gray-500 text-center mb-0.5">
        {t("expiresInLabel")}
      </p>
      <p className="text-sm font-bold text-[#171717] text-center mb-4">
        {t("oneHour")}
      </p>

      {/* Transfer title */}
      <h4 className="text-sm font-bold text-[#171717] mb-1 break-all">
        {simulationData.title || simulationData.filename}
      </h4>

      {/* Preview before you pay (paid only) */}
      {isPaid && (
        <p className="text-xs font-medium text-[#5E53E0] mb-3">
          {t("previewBeforeYouPay")}
        </p>
      )}
      {!isPaid && <div className="mb-2" />}

      {/* File info bar */}
      <div className="flex items-center justify-between py-3 px-3 bg-gray-100 rounded mb-3">
        <p className="text-xs font-medium text-[#171717]">
          1 {t("filesCountLabel")}
        </p>
        <p className="text-xs font-medium text-gray-400">
          {formatFileSize(simulationData.fileSize)}
        </p>
      </div>

      {/* Disabled action buttons */}
      <div className="space-y-2">
        <button
          disabled
          className="w-full px-4 py-3 bg-[#87E64B] text-[#171717] font-bold text-sm rounded opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPaid ? (
            <>
              <CreditCard className="w-4 h-4" />
              {t("ctaPaid")}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {t("ctaFree")}
            </>
          )}
        </button>
        <button
          disabled
          className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-[#171717] font-medium text-sm rounded opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          {t("previewLabel")}
        </button>
      </div>
    </div>
  );
};

export default TestDownloadSimulation;
