"use client";

import React from "react";
import { useTranslations } from "next-intl";
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

const getFileExtension = (filename: string): string => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
};

const TestRecipientView: React.FC<TestRecipientViewProps> = ({
  simulationData,
}) => {
  const t = useTranslations("testResult");
  const displayUrl = `https://${process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "zefile.co"}/${process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || "z-"}${simulationData.shortCode}`;
  const isPaid = simulationData.price > 0;

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <p className="text-sm text-gray-500">{t("recipientExplainer")}</p>

      {/* Email-style card */}
      <div className="border border-gray-200 rounded bg-white p-6">
        {/* "Preview before you pay" banner (paid only) */}
        {/* email: 18px, 600, #5e53e0, margin-bottom 16px */}
        {isPaid && (
          <p className="text-[18px] font-semibold text-[#5E53E0] mb-4">
            {t("previewBeforeYouPay")}
          </p>
        )}

        {/* Title: {senderEmail} (purple) \n sent you {title} (dark) */}
        {/* email: h1, 24px, 700, line-height 1.3, margin-bottom 8px */}
        <h2
          className="text-[24px] font-bold leading-[1.3] mb-2"
        >
          <span className="text-[#5E53E0]">
            {simulationData.senderEmail}
          </span>
          <br />
          <span className="text-[#171717]">
            {t("sentYou")} {simulationData.title || simulationData.filename}
          </span>
        </h2>

        {/* Transfer metadata */}
        {/* email: 14px, #6b7280, line-height 1.6, margin-bottom 24px */}
        <p className="text-[14px] text-[#6b7280] leading-[1.6] mb-6">
          1 {t("filesCountLabel")}, {formatFileSize(simulationData.fileSize)}{" "}
          {t("totalLabel")} - {t("expiresInLabel")} {t("oneHour")}
        </p>

        {/* CTA Button (green, centered) */}
        {/* email: padding 14px 28px, 15px, 600, border-radius 4px, bg #87e64b, margin-bottom 30px */}
        <div className="text-center mb-[30px]">
          <span
            className="inline-block bg-[#87E64B] text-[#171717] rounded px-[28px] py-[14px] font-semibold text-[15px]"
          >
            {isPaid ? t("ctaPaid") : t("ctaFree")}
          </span>
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
