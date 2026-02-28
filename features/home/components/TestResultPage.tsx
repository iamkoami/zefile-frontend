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
}

interface TestResultPageProps {
  simulationData: TestSimulationData;
  onClose?: () => void;
  onSendAnother?: () => void;
}

const TestResultPage: React.FC<TestResultPageProps> = ({
  simulationData,
  onClose,
  onSendAnother,
}) => {
  const t = useTranslations("testResult");
  const [activeTab, setActiveTab] = useState("sender");

  const tabs = [
    { id: "sender", label: t("senderTab") },
    { id: "client", label: t("clientTab") },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#171717]">{t("title")}</h2>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          className="justify-center gap-12"
        />
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {activeTab === "sender" && (
          <TestSenderView simulationData={simulationData} />
        )}

        {activeTab === "client" && (
          <TestRecipientView simulationData={simulationData} />
        )}
      </div>

      {/* Conversion Prompt */}
      <div className="bg-[#F3F2FD] rounded p-6 text-center mb-6">
        <p className="text-sm font-medium text-[#171717] mb-2">
          {t("conversionTitle")}
        </p>
        <p className="text-xs text-gray-500 mb-4">
          {t("conversionSubtitle")}
        </p>
        <button
          onClick={() => {
            trackTestTransferConversionClicked(simulationData.sessionId);
            onClose?.();
          }}
          className="bg-[#87E64B] text-[#171717] rounded px-6 py-2.5 font-semibold text-sm hover:bg-[#78d43f] transition-colors"
        >
          {t("conversionButton")}
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-center gap-4 pb-4">
        {onSendAnother && (
          <button
            onClick={onSendAnother}
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
