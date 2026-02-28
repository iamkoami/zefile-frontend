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
    <div className="space-y-4">
      {/* Explainer */}
      <p className="text-sm text-gray-500">{t("senderExplainer")}</p>

      {/* Email-style card */}
      <div className="border border-gray-200 rounded bg-white p-6">
        {/* Title: "{title}" sent to \n {recipientEmail} */}
        {/* email: h1, 24px, 700, #171717, line-height 1.3, margin-bottom 8px */}
        <h2
          className="text-[24px] font-bold text-[#171717] leading-[1.3] mb-2"
        >
          <span>{simulationData.title || simulationData.filename}</span>{" "}
          {t("sentTo")}
          <br />
          <span className="text-[#5E53E0]">
            {simulationData.recipientEmails[0] || ""}
          </span>
        </h2>

        {/* Transfer metadata */}
        {/* email: 14px, #6b7280, line-height 1.6, margin-bottom 16px */}
        <p className="text-[14px] text-[#6b7280] leading-[1.6] mb-4">
          1 {t("filesCountLabel")}, {formatFileSize(simulationData.fileSize)}{" "}
          {t("totalLabel")} - {t("expiresInLabel")} {t("oneHour")}
        </p>

        {/* Confirmation text */}
        {/* email: 15px, #374151, line-height 1.6, margin-bottom 30px */}
        <p className="text-[15px] text-[#374151] leading-[1.6] mb-[30px]">
          {t("confirmationText")}
        </p>

        {/* Recipients section */}
        {/* email: label 15px/700/#171717 mb-6px, emails 14px/#5e53e0, section mb-24px */}
        <div className="mb-6">
          <p className="text-[15px] font-bold text-[#171717] mb-[6px]">
            {t("recipientsLabel")}
          </p>
          {simulationData.recipientEmails.map((email) => (
            <p
              key={email}
              className="text-[14px] text-[#5E53E0] leading-[1.6]"
            >
              {email}
            </p>
          ))}
        </div>

        {/* Download link section */}
        {/* email: label 15px/700/#171717 mb-6px, link 14px/#5e53e0 underline, section mb-24px */}
        <div className="mb-6">
          <p className="text-[15px] font-bold text-[#171717] mb-[6px]">
            {t("downloadLinkLabel")}
          </p>
          <p className="text-[14px] leading-[1.6]">
            <span className="text-[#5E53E0] underline">
              {displayUrl}
            </span>
          </p>
        </div>

        {/* Files section */}
        {/* email: heading 15px/700/#171717 mb-12px, filename 14px/500/#171717 mb-2px, meta 12px/#6b7280 */}
        <div>
          <p className="text-[15px] font-bold text-[#171717] mb-3">
            1 {t("filesCountLabel")}
          </p>
          <div>
            <p className="text-[14px] font-medium text-[#171717] mb-[2px]">
              {simulationData.filename}
            </p>
            <p className="text-[12px] text-[#6b7280]">
              {formatFileSize(simulationData.fileSize)} -{" "}
              {getFileExtension(simulationData.filename)}
            </p>
          </div>
        </div>
      </div>

      {/* Sender email note */}
      <div className="bg-gray-50 rounded px-4 py-3">
        <p className="text-xs text-gray-500">
          {t("senderEmailNote", { email: simulationData.senderEmail })}
        </p>
      </div>
    </div>
  );
};

export default TestSenderView;
