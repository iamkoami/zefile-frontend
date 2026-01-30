"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link as LinkIcon } from "iconoir-react";
import { TransferDto } from "@/services/transfer-api";
import { useDrawerStore } from "@/stores/drawer-store";
import CelebrationModal from "@/features/home/components/CelebrationModal";

interface TransferCompletePanelProps {
  transferLink: string;
  shortLink: string;
  transfer: TransferDto;
  onSendAnother: () => void;
  isFirstTransfer?: boolean;
}

const TransferCompletePanel: React.FC<TransferCompletePanelProps> = ({
  transferLink,
  shortLink,
  transfer,
  onSendAnother,
  isFirstTransfer = false,
}) => {
  const t = useTranslations("upload");
  const { openDrawerToView } = useDrawerStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(isFirstTransfer);

  // Handle preview transfer - opens drawer directly to TransferPreviewPanel
  // Uses openDrawerToView so close button is shown (no back navigation needed)
  const handlePreviewTransfer = () => {
    openDrawerToView("transfers", "transfer-preview", transfer, "sender");
  };

  // Show success animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowSuccess(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleSendAnother = () => {
    setIsTransitioning(true);
    // Small delay for animation
    setTimeout(() => {
      onSendAnother();
    }, 300);
  };

  // Handle share from celebration modal
  const handleShareFromCelebration = () => {
    handleCopyLink();
  };

  return (
    <>
      {/* First Transfer Celebration Modal */}
      {showCelebration && (
        <CelebrationModal
          transferTitle={transfer.title || ""}
          shortLink={shortLink}
          onDismiss={() => setShowCelebration(false)}
          onShare={handleShareFromCelebration}
        />
      )}

      <div
        className={`flex flex-col items-center justify-center pt-[40px] transition-all duration-300 ${
          isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100"
        }`}
      >
        {/* Success Circle with Gradient Background and Checkmark - Like reference */}
      <div className="relative mb-8">
        <div
          className="rounded-full flex items-center justify-center transition-all duration-500"
          style={{
            width: '176px',
            height: '176px',
            background:
              "linear-gradient(180deg, rgba(135, 230, 75, 0.4) 0%, #87E64B 100%)",
            opacity: showSuccess ? 1 : 0,
            transform: showSuccess ? "scale(1)" : "scale(0.8)",
          }}
        >
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-300 ${
              showSuccess ? "opacity-100" : "opacity-0"
            }`}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Transfer Sent Message */}
      <h2 className="text-xl font-bold text-black mb-2 text-center">
        {t("transferSent")}
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center mb-1">
        {t("copyLinkOrShareTransfer")}
      </p>
      <button
        onClick={handlePreviewTransfer}
        className="text-sm font-bold text-black underline cursor-pointer mb-6"
      >
        {t("previewTransfer")}
      </button>

      {/* Link Display with Copy Button */}
      <div className="w-full mb-4">
        <div
          className="flex items-center gap-2 bg-white border border-[#171717] rounded"
          style={{ paddingTop: '10px', paddingBottom: '10px', paddingLeft: '12px', paddingRight: '8px' }}
        >
          <input
            type="text"
            value={shortLink}
            readOnly
            className="flex-1 text-sm font-medium text-[#4F46E5] bg-transparent outline-none cursor-pointer truncate"
            onClick={handleCopyLink}
          />
          <button
            onClick={handleCopyLink}
            className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            aria-label="Copy link"
          >
            {copied ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#87E64B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <LinkIcon
                width={20}
                height={20}
                strokeWidth={2}
                color="#4F46E5"
              />
            )}
          </button>
        </div>
      </div>

        {/* Send Another Button */}
        <button
          onClick={handleSendAnother}
          disabled={isTransitioning}
          className="w-full py-4 px-4 rounded font-semibold text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#87E64B" }}
        >
          {t("sendAnother")}
        </button>
      </div>
    </>
  );
};

export default TransferCompletePanel;
