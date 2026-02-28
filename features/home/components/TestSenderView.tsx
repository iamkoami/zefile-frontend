"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { TestSimulationData } from "./TestResultPage";

interface TestSenderViewProps {
  simulationData: TestSimulationData;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
};

const TestSenderView: React.FC<TestSenderViewProps> = ({ simulationData }) => {
  const t = useTranslations("testResult");
  const displayUrl = `https://${process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "zefile.co"}/${process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || "z-"}${simulationData.shortCode}`;

  return (
    <div className="space-y-3">
      {/* Explainer */}
      <p className="text-xs text-gray-500">{t("senderExplainer")}</p>

      {/* Email-style card */}
      <div className="border border-gray-200 rounded bg-white p-4">
        <h2 className="text-base font-bold text-[#171717] leading-snug mb-1">
          <span>{simulationData.title || simulationData.filename}</span>{" "}
          {t("sentTo")}{" "}
          <span className="text-[#5E53E0]">
            {simulationData.recipientEmails[0] || ""}
          </span>
        </h2>

        <p className="text-xs text-[#6b7280] mb-3">
          1 {t("filesCountLabel")}, {formatFileSize(simulationData.fileSize)}{" "}
          {t("totalLabel")} - {t("expiresInLabel")} {t("oneHour")}
        </p>

        <p className="text-xs text-[#374151] leading-relaxed mb-3">
          {t("confirmationText")}
        </p>

        {/* Recipients */}
        <div className="mb-3">
          <p className="text-xs font-bold text-[#171717] mb-0.5">
            {t("recipientsLabel")}
          </p>
          {simulationData.recipientEmails.map((email) => (
            <p key={email} className="text-xs text-[#5E53E0]">
              {email}
            </p>
          ))}
        </div>

        {/* Download link */}
        <div className="mb-3">
          <p className="text-xs font-bold text-[#171717] mb-0.5">
            {t("downloadLinkLabel")}
          </p>
          <p className="text-xs text-[#5E53E0] underline break-all">
            {displayUrl}
          </p>
        </div>

        {/* Files */}
        <div>
          <p className="text-xs font-bold text-[#171717] mb-1">
            1 {t("filesCountLabel")}
          </p>
          <p className="text-xs font-medium text-[#171717]">
            {simulationData.filename}
          </p>
          <p className="text-[11px] text-[#6b7280]">
            {formatFileSize(simulationData.fileSize)} -{" "}
            {getFileExtension(simulationData.filename)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestSenderView;
