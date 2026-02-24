"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "iconoir-react";
import surveysApi, {
  ChurnReason,
  ChurnReasonOption,
} from "@/services/surveys-api";
import {
  trackChurnSurveyShown,
  trackChurnSurveySubmitted,
  trackChurnSurveySkipped,
} from "@/lib/posthog";

interface ChurnSurveyModalProps {
  previousTier: string;
  onComplete: () => void;
  onCancel: () => void;
}

const ChurnSurveyModal: React.FC<ChurnSurveyModalProps> = ({
  previousTier,
  onComplete,
  onCancel,
}) => {
  const t = useTranslations("churnSurvey");
  const [options, setOptions] = useState<ChurnReasonOption[]>([]);
  const [selectedReason, setSelectedReason] = useState<ChurnReason | null>(
    null
  );
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track when modal is shown
  useEffect(() => {
    trackChurnSurveyShown(previousTier);
  }, [previousTier]);

  // Fetch churn survey options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await surveysApi.getChurnSurveyOptions();
        if (response.data?.reasons) {
          setOptions(response.data.reasons);
        }
      } catch (error) {
        console.error("Failed to fetch churn survey options:", error);
        // Fallback options
        setOptions([
          {
            value: ChurnReason.TOO_EXPENSIVE,
            label: t("reasonTooExpensive"),
            requiresDetails: false,
          },
          {
            value: ChurnReason.NOT_USING,
            label: t("reasonNotUsing"),
            requiresDetails: false,
          },
          {
            value: ChurnReason.FOUND_ALTERNATIVE,
            label: t("reasonFoundAlternative"),
            requiresDetails: true,
          },
          {
            value: ChurnReason.MISSING_FEATURES,
            label: t("reasonMissingFeatures"),
            requiresDetails: true,
          },
          {
            value: ChurnReason.TECHNICAL_ISSUES,
            label: t("reasonTechnicalIssues"),
            requiresDetails: true,
          },
          {
            value: ChurnReason.OTHER,
            label: t("reasonOther"),
            requiresDetails: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptions();
  }, [t]);

  const selectedOption = options.find((o) => o.value === selectedReason);
  const requiresDetails = selectedOption?.requiresDetails ?? false;

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await surveysApi.submitChurnSurvey({
        reason: selectedReason,
        details: details.trim() || undefined,
        previousTier,
      });
      // Track submission to PostHog
      trackChurnSurveySubmitted(selectedReason, previousTier, !!details.trim());
      onComplete();
    } catch (error) {
      console.error("Failed to submit churn survey:", error);
      // Still proceed with cancellation even if survey fails
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      const response = await surveysApi.skipChurnSurvey(previousTier);
      // Only track if API call succeeded
      if (response.data?.success) {
        trackChurnSurveySkipped(previousTier);
      }
    } catch (error) {
      console.error("Failed to skip churn survey:", error);
    }
    onComplete();
  };

  // Get translated label for reason
  const getReasonLabel = (option: ChurnReasonOption): string => {
    const labelMap: Record<ChurnReason, string> = {
      [ChurnReason.TOO_EXPENSIVE]: t("reasonTooExpensive"),
      [ChurnReason.NOT_USING]: t("reasonNotUsing"),
      [ChurnReason.FOUND_ALTERNATIVE]: t("reasonFoundAlternative"),
      [ChurnReason.MISSING_FEATURES]: t("reasonMissingFeatures"),
      [ChurnReason.TECHNICAL_ISSUES]: t("reasonTechnicalIssues"),
      [ChurnReason.OTHER]: t("reasonOther"),
    };
    return labelMap[option.value] || option.label;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t("close")}
        >
          <X width={20} height={20} />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <h2 className="text-xl font-bold text-[#171717] mb-2 pr-8">
            {t("title")}
          </h2>
          <p className="text-gray-600 mb-6">{t("subtitle")}</p>

          {/* Reason options */}
          <div className="space-y-3 mb-6">
            {options.map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-4 border rounded cursor-pointer transition-all ${
                  selectedReason === option.value
                    ? "border-[#5E53E0] bg-[#5E53E0]/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="churnReason"
                  value={option.value}
                  checked={selectedReason === option.value}
                  onChange={() => setSelectedReason(option.value)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedReason === option.value
                      ? "border-[#5E53E0]"
                      : "border-gray-300"
                  }`}
                >
                  {selectedReason === option.value && (
                    <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                  )}
                </div>
                <span className="text-sm text-[#171717]">
                  {getReasonLabel(option)}
                </span>
              </label>
            ))}
          </div>

          {/* Details field (shown for certain options) */}
          {requiresDetails && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("detailsLabel")}
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t("detailsPlaceholder")}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="w-full py-3 px-4 bg-red-500 text-white font-semibold rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {isSubmitting ? t("processing") : t("confirmCancel")}
          </button>

          {/* Skip option */}
          <div className="text-center">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t("skipSurvey")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurnSurveyModal;
