"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface CancelConfirmationPanelProps {
  progress: number; // Current progress percentage to display
  onConfirmCancel: () => void;
  onContinue: () => void;
}

const CancelConfirmationPanel: React.FC<CancelConfirmationPanelProps> = ({
  progress,
  onConfirmCancel,
  onContinue,
}) => {
  const t = useTranslations("upload");
  const [displayProgress, setDisplayProgress] = useState(Math.round(progress));
  const [isCancelling, setIsCancelling] = useState(false);

  // Sync displayProgress with actual progress
  useEffect(() => {
    setDisplayProgress(Math.round(progress));
  }, [progress]);

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await onConfirmCancel();
    } catch (error) {
      console.error("Cancel error:", error);
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center pt-[60px]">
      {/* Progress Number - Same style as UploadProgressPanel */}
      <div className="relative mb-6 flex items-center justify-center">
        <span
          className="font-bold transition-all duration-100"
          style={{
            fontSize: "140px",
            lineHeight: "0.9",
            background:
              "linear-gradient(180deg, rgba(135, 230, 75, 0.5) 0%, #87E64B 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: "700",
          }}
        >
          {displayProgress}
        </span>
        <span
          className="font-bold"
          style={{
            fontSize: "18px",
            lineHeight: "0.9",
            transform: "translateY(30px)",
            color: "#87E64B",
            marginLeft: "8px",
            fontWeight: "700",
          }}
        >
          %
        </span>
      </div>

      {/* Cancel Confirmation Message */}
      <h2 className="text-lg font-bold text-black dark:text-[oklch(0.91_0_0)] mb-12 text-center">
        {t("cancelThisTransfer")}
      </h2>

      {/* Action Buttons - Side by side like reference */}
      <div className="flex items-center gap-3 w-full">
        {/* No Button - White with black border */}
        <button
          onClick={onContinue}
          disabled={isCancelling}
          className="flex-1 py-4 px-4 bg-white dark:bg-card border border-[#171717] dark:border-border rounded font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors disabled:opacity-50"
        >
          {t("no")}
        </button>

        {/* Yes Button - Green */}
        <button
          onClick={handleConfirmCancel}
          disabled={isCancelling}
          className="flex-1 py-4 px-4 rounded font-bold text-[#171717] hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "#87E64B" }}
        >
          {isCancelling ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </span>
          ) : (
            t("yes")
          )}
        </button>
      </div>
    </div>
  );
};

export default CancelConfirmationPanel;
