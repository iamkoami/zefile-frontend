"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link as LinkIcon } from "iconoir-react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { TransferDto } from "@/services/transfer-api";
import { useDrawerStore } from "@/stores/drawer-store";
import CelebrationModal from "@/features/home/components/CelebrationModal";
import QuickShareButtons from "./QuickShareButtons";
import OnboardingTooltip, {
  type TooltipStep,
} from "@/components/shared/OnboardingTooltip";

interface TransferCompletePanelProps {
  transferLink: string;
  shortLink: string;
  transfer: TransferDto;
  onSendAnother: () => void;
  isFirstTransfer?: boolean;
  isFirstFreePaidTransfer?: boolean;
}

const TransferCompletePanel: React.FC<TransferCompletePanelProps> = ({
  transferLink,
  shortLink,
  transfer,
  onSendAnother,
  isFirstTransfer = false,
  isFirstFreePaidTransfer = false,
}) => {
  const t = useTranslations("upload");
  const tOnboarding = useTranslations("onboarding");
  const tFirstFree = useTranslations("firstFree");
  const { openDrawerToView } = useDrawerStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCelebration, setShowCelebration] = useState(isFirstTransfer);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [congratsAnimation, setCongratsAnimation] = useState<object | null>(
    null,
  );
  const lottieRef = useRef<LottieRefCurrentProps>(null);

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

  // Load congrats Lottie animation
  useEffect(() => {
    fetch("/lotties/congrats.json")
      .then((res) => res.json())
      .then((data) => setCongratsAnimation(data))
      .catch(() => {});
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

  // Handle celebration dismiss — trigger onboarding if first transfer
  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
    if (isFirstTransfer) {
      try {
        const alreadyComplete =
          localStorage.getItem("zefile_onboarding_complete") === "true";
        if (!alreadyComplete) {
          setTimeout(() => setShowOnboarding(true), 400);
        }
      } catch {
        // localStorage unavailable
      }
    }
  }, [isFirstTransfer]);

  // Onboarding tooltip steps
  const onboardingSteps: TooltipStep[] = [
    {
      elementId: "ze-header-logo",
      placement: "bottom",
      title: tOnboarding("step1Title"),
      body: tOnboarding("step1Body"),
    },
    {
      elementId: "ze-connect-menu",
      placement: "bottom",
      title: tOnboarding("step2Title"),
      body: tOnboarding("step2Body"),
    },
    {
      elementId: "ze-panels-container",
      placement: "top",
      title: tOnboarding("step3Title"),
      body: tOnboarding("step3Body"),
    },
  ];

  return (
    <>
      {/* First Transfer Celebration Modal */}
      {showCelebration && (
        <CelebrationModal
          transferTitle={transfer.title || ""}
          shortLink={shortLink}
          onDismiss={handleCelebrationDismiss}
          onShare={handleShareFromCelebration}
        />
      )}

      {/* First Transfer Onboarding Tooltip Sequence */}
      {showOnboarding && (
        <OnboardingTooltip
          steps={onboardingSteps}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <div
        className={`flex flex-col items-center justify-center transition-all duration-300 ${
          isTransitioning ? "opacity-0 transform translate-y-4" : "opacity-100"
        }`}
      >
        {/* Success Lottie Animation */}
        <div className="relative mb-2">
          <div
            className="flex items-center justify-center transition-all duration-500"
            style={{
              width: "176px",
              height: "176px",
              opacity: showSuccess ? 1 : 0,
              transform: showSuccess ? "scale(1)" : "scale(0.8)",
            }}
          >
            {congratsAnimation && (
              <Lottie
                lottieRef={lottieRef}
                animationData={congratsAnimation}
                loop={true}
                autoplay={true}
                style={{ width: 176, height: 176 }}
              />
            )}
          </div>
        </div>

        {/* Transfer Sent Message */}
        <h2 className="text-xl font-bold text-black mb-2 text-center">
          {t("transferSent")}
        </h2>

        {/* First-Free Paid Transfer Celebration */}
        {isFirstFreePaidTransfer && (
          <div className="bg-[#87E64B]/10 border border-[#87E64B]/30 rounded px-4 py-3 mb-4 w-full text-center">
            <p className="text-sm font-medium text-[#171717]">
              {tFirstFree("celebrationTitle")}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {tFirstFree("celebrationSubtitle")}
            </p>
          </div>
        )}

        {/* Description */}
        <p className="text-sm font-medium text-gray-600 text-center mb-1">
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
            style={{
              paddingTop: "10px",
              paddingBottom: "10px",
              paddingLeft: "12px",
              paddingRight: "8px",
            }}
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

        {/* Quick Share Buttons */}
        <QuickShareButtons
          shortCode={transfer.shortCode}
          title={transfer.title || undefined}
          message={transfer.message || undefined}
          className="mb-4"
        />

        {/* Send Another Button */}
        <button
          onClick={handleSendAnother}
          disabled={isTransitioning}
          className="w-full py-4 px-4 rounded font-bold text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#87E64B" }}
        >
          {t("sendAnother")}
        </button>

        {/* Send Same Files to Others */}
        <button
          onClick={() => {
            // Reset form first to clear previous files, then dispatch reuse event
            onSendAnother();
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("add-transfer-files-to-upload", {
                  detail: {
                    transferId: transfer.id,
                    files: transfer.files || [],
                    title: transfer.title,
                  },
                }),
              );
            }, 50);
          }}
          disabled={isTransitioning}
          className="text-sm font-bold text-black underline cursor-pointer mt-3 disabled:opacity-50"
        >
          {t("sendSameFiles")}
        </button>
      </div>
    </>
  );
};

export default TransferCompletePanel;
