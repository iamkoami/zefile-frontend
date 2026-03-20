"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { WarningTriangle } from "iconoir-react";

interface UploadProgressPanelProps {
  progress: number; // 0-100
  uploadedSize: number; // in bytes
  totalSize: number; // in bytes
  estimatedTimeRemaining: number; // in seconds
  fileCount: number; // number of files being uploaded
  onCancel: () => void;
  isComplete?: boolean; // New prop for success state
}

const UploadProgressPanel: React.FC<UploadProgressPanelProps> = ({
  progress,
  uploadedSize,
  totalSize,
  estimatedTimeRemaining,
  fileCount,
  onCancel,
  isComplete = false,
}) => {
  const t = useTranslations("upload");
  // Initialize displayProgress to actual progress to prevent reset when returning from cancel
  const [displayProgress, setDisplayProgress] = useState(Math.round(progress));
  const [showCheck, setShowCheck] = useState(false);

  // Animated counter effect
  useEffect(() => {
    if (isComplete) {
      // When complete, animate to 100 then show checkmark
      const timer = setTimeout(() => setShowCheck(true), 500);
      return () => clearTimeout(timer);
    }

    // Rolling animation for the number
    const step = progress > displayProgress ? 1 : -1;
    const duration = 50; // milliseconds per step

    if (Math.abs(progress - displayProgress) > 0.5) {
      const timer = setTimeout(() => {
        setDisplayProgress((prev) => {
          const next = prev + step;
          if (step > 0) {
            return Math.min(next, progress);
          } else {
            return Math.max(next, progress);
          }
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress, isComplete]);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 octets";
    const k = 1024;
    const sizes = ["octets", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} ${t("seconds")}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} ${t("minutes")}`;
  };

  return (
    <div className="ze-upload-progress flex flex-col items-center justify-center pt-[60px]">
      {/* Progress Number - Large display without background */}
      <div className="relative mb-6 flex items-center justify-center">
        {showCheck ? (
          // Success checkmark
          <div className="animate-fadeIn">
            <svg
              width="140"
              height="140"
              viewBox="0 0 140 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="animate-scaleIn"
            >
              <path
                d="M35 70L60 95L105 45"
                stroke="#87E64B"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-checkmark"
              />
            </svg>
          </div>
        ) : (
          // Progress number with gradient - no background box
          <>
            <span
              className="font-bold transition-all duration-100"
              style={{
                fontSize: "130px",
                lineHeight: "0.9",
                background:
                  "linear-gradient(180deg, rgba(135, 230, 75, 0.5) 0%, #87E64B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: "700",
              }}
            >
              {Math.round(displayProgress)}
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
          </>
        )}
      </div>

      {/* Transfer Processing Message */}
      <h2 className="text-lg font-bold text-black dark:text-[oklch(0.91_0_0)] mb-3 text-center">
        {isComplete ? t("processingFiles") : t("transferProcessing")}
      </h2>

      {/* File Count - Medium 500 weight */}
      <p
        className="text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] text-center mb-1"
        style={{ fontWeight: 500 }}
      >
        {t("sendingFilesCount", { count: fileCount })}
      </p>

      {/* Upload Progress */}
      <p className="text-xs text-gray-600 dark:text-[oklch(0.65_0_0)] text-center mb-1">
        {t("uploadedBytes", {
          uploaded: formatBytes(uploadedSize),
          total: formatBytes(totalSize),
        })}
      </p>

      {/* Estimated Time Remaining - Always show space */}
      <p className="text-xs text-gray-600 dark:text-[oklch(0.65_0_0)] text-center mb-8">
        {progress < 100 && estimatedTimeRemaining > 0
          ? t("remainingTime", {
              time: formatTimeRemaining(estimatedTimeRemaining),
            })
          : "\u00A0"}
      </p>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="ze-form-input w-full text-center font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors"
      >
        {t("cancel")}
      </button>

      {/* Security Note */}
      <div className="w-full mb-3 mt-6 text-xs text-center text-gray-600 dark:text-[oklch(0.65_0_0)]">
        <p>{t("securityNote")}</p>
      </div>

      {/* Warning Banner - Don't close page */}
      {!isComplete && (
        <div className="w-full mt-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg flex items-center gap-3">
          <WarningTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">{t("doNotClosePage")}</p>
        </div>
      )}
    </div>
  );
};

export default UploadProgressPanel;
