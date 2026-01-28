"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "iconoir-react";
import surveysApi from "@/services/surveys-api";
import {
  trackNpsSurveyShown,
  trackNpsSurveySubmitted,
  trackNpsSurveyDeferred,
  trackNpsSurveyDismissed,
} from "@/lib/posthog";

interface NPSSurveyModalProps {
  onClose: () => void;
  onSubmitted: () => void;
}

const NPSSurveyModal: React.FC<NPSSurveyModalProps> = ({
  onClose,
  onSubmitted,
}) => {
  const t = useTranslations("npsSurvey");
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);

  // Track when modal is shown
  useEffect(() => {
    trackNpsSurveyShown();
  }, []);

  const handleSubmit = async () => {
    if (selectedScore === null) return;

    setIsSubmitting(true);
    try {
      const response = await surveysApi.submitNpsSurvey({
        score: selectedScore,
        comment: comment.trim() || undefined,
      });

      if (response.data?.success) {
        // Track submission to PostHog
        trackNpsSurveySubmitted(selectedScore, !!comment.trim());
        setShowThankYou(true);
        setTimeout(() => {
          onSubmitted();
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to submit NPS survey:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDefer = async () => {
    try {
      await surveysApi.deferNpsSurvey();
      trackNpsSurveyDeferred();
      onClose();
    } catch (error) {
      console.error("Failed to defer NPS survey:", error);
    }
  };

  const handleDismiss = async () => {
    try {
      await surveysApi.dismissNpsSurvey();
      trackNpsSurveyDismissed();
      onClose();
    } catch (error) {
      console.error("Failed to dismiss NPS survey:", error);
    }
  };

  // Get score category for styling
  const getScoreColor = (score: number): string => {
    if (score >= 9) return "bg-green-500 hover:bg-green-600 text-white";
    if (score >= 7) return "bg-yellow-500 hover:bg-yellow-600 text-white";
    return "bg-red-400 hover:bg-red-500 text-white";
  };

  const getSelectedScoreColor = (score: number): string => {
    if (score >= 9) return "bg-green-600 ring-2 ring-green-700";
    if (score >= 7) return "bg-yellow-600 ring-2 ring-yellow-700";
    return "bg-red-500 ring-2 ring-red-600";
  };

  if (showThankYou) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-[#87E64B] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#171717] mb-2">
            {t("thankYou")}
          </h2>
          <p className="text-gray-600">{t("feedbackReceived")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t("dismiss")}
        >
          <X width={20} height={20} />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <h2 className="text-xl font-bold text-[#171717] mb-2 pr-8">
            {t("title")}
          </h2>
          <p className="text-gray-600 mb-6">{t("question")}</p>

          {/* Score selection (0-10) */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>{t("notLikely")}</span>
              <span>{t("veryLikely")}</span>
            </div>
            <div className="flex gap-1 sm:gap-2 justify-between">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setSelectedScore(score)}
                  className={`w-7 h-10 sm:w-9 sm:h-12 rounded font-semibold text-sm sm:text-base transition-all ${
                    selectedScore === score
                      ? getSelectedScoreColor(score)
                      : selectedScore === null
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        : getScoreColor(score)
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>

          {/* Comment field (optional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("commentLabel")}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent resize-none"
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={selectedScore === null || isSubmitting}
            className="w-full py-3 px-4 bg-[#87E64B] text-[#171717] font-semibold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>

          {/* Defer option */}
          <div className="text-center">
            <button
              onClick={handleDefer}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t("maybeLater")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NPSSurveyModal;
