"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import Tabs from "@/components/shared/Tabs";
import { trackTestTransferConversionClicked } from "@/lib/posthog";
import TestSenderView from "./TestSenderView";
import TestRecipientView from "./TestRecipientView";

export interface TestSimulationData {
  sessionId: string;
  shortCode: string;
  senderEmail: string;
  recipientEmails: string[];
  title: string;
  price: number;
  currency: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  previewBase64: string | null;
  previewMimeType: string | null;
  previewObjectUrl?: string;
}

interface TestResultPageProps {
  simulationData: TestSimulationData;
  onConvert?: () => void;
  onReset?: () => void;
}

const TestResultPage: React.FC<TestResultPageProps> = ({
  simulationData,
  onConvert,
  onReset,
}) => {
  const t = useTranslations("testResult");
  const [activeTab, setActiveTab] = useState("sender");

  const tabs = [
    { id: "sender", label: t("senderTab") },
    { id: "client", label: t("clientTab") },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-[#171717]">{t("title")}</h2>
        <p className="text-xs text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Desktop: Sender view only (client view is in side panel) */}
      <div className="hidden lg:block">
        <TestSenderView simulationData={simulationData} />
      </div>

      {/* Mobile: Tabs (sender / client) */}
      <div className="lg:hidden">
        <div className="border-b border-gray-200 mb-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="justify-center gap-12"
          />
        </div>
        <div className="pb-4">
          {activeTab === "sender" && (
            <TestSenderView simulationData={simulationData} />
          )}
          {activeTab === "client" && (
            <TestRecipientView simulationData={simulationData} />
          )}
        </div>
      </div>

      {/* Conversion CTA */}
      <div className="bg-[#F3F2FD] rounded p-4 text-center mb-3 mt-4">
        <p className="text-sm font-medium text-[#171717] mb-1">
          {t("conversionTitle")}
        </p>
        <p className="text-xs text-gray-500 mb-3">
          {t("conversionSubtitle")}
        </p>
        <button
          onClick={() => {
            trackTestTransferConversionClicked(simulationData.sessionId);
            onConvert?.();
          }}
          className="bg-[#87E64B] text-[#171717] rounded px-6 py-2.5 font-bold text-sm hover:bg-[#78d43f] transition-colors"
        >
          {t("conversionButton")}
        </button>
      </div>

      {/* Try another */}
      <div className="flex items-center justify-center">
        {onReset && (
          <button
            onClick={onReset}
            className="text-sm text-[#5E53E0] hover:underline"
          >
            {t("sendAnother")}
          </button>
        )}
      </div>
    </div>
  );
};

export default TestResultPage;
