"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock, NavArrowDown, Xmark, NavArrowUp } from "iconoir-react";
import { pollApi, UserPoll, PollTriggerType, SnoozeDuration } from "@/services/poll-api";
import { usePollStore } from "@/stores/poll-store";
import { authApi } from "@/services/auth-api";

interface FloatingPollWidgetProps {
  trigger?: PollTriggerType;
}

/**
 * FloatingPollWidget - Non-intrusive poll widget for frontend
 * Appears in bottom-right corner without blocking user actions
 * Can be minimized, dismissed, or snoozed
 */
const FloatingPollWidget: React.FC<FloatingPollWidgetProps> = ({
  trigger = "manual",
}) => {
  const t = useTranslations("poll");
  const {
    currentPoll,
    setCurrentPoll,
    clearCurrentPoll,
    markAsResponded,
    markAsDismissed,
    markAsSnoozed,
    hasResponded,
    isDismissed,
    isSnoozed,
  } = usePollStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch eligible poll on mount
  useEffect(() => {
    const fetchPoll = async () => {
      // Only fetch if user is authenticated
      const user = authApi.getStoredUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await pollApi.getEligiblePoll(trigger);
        if (response.data) {
          const poll = response.data;
          // Check if already responded, dismissed, or snoozed
          if (
            !hasResponded(poll.id) &&
            !isDismissed(poll.id) &&
            !isSnoozed(poll.id)
          ) {
            setCurrentPoll(poll);
          }
        }
      } catch (error) {
        console.error("Failed to fetch eligible poll:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to let page render first
    const timer = setTimeout(fetchPoll, 2000);
    return () => clearTimeout(timer);
  }, [trigger, setCurrentPoll, hasResponded, isDismissed, isSnoozed]);

  const handleOptionToggle = useCallback(
    (optionId: string) => {
      if (!currentPoll) return;

      if (currentPoll.type === "single_choice") {
        setSelectedOptions([optionId]);
      } else {
        setSelectedOptions((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      }
    },
    [currentPoll]
  );

  const handleSubmit = async () => {
    if (!currentPoll || selectedOptions.length === 0) return;

    setIsSubmitting(true);
    try {
      const response = await pollApi.submitResponse(
        currentPoll.id,
        selectedOptions,
        otherText.trim() || undefined
      );

      if (response.data?.success) {
        markAsResponded(currentPoll.id);
        setShowThankYou(true);
        setTimeout(() => {
          clearCurrentPoll();
        }, 2500);
      }
    } catch (error) {
      console.error("Failed to submit poll response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!currentPoll) return;

    try {
      await pollApi.dismissPoll(currentPoll.id);
      markAsDismissed(currentPoll.id);
      clearCurrentPoll();
    } catch (error) {
      console.error("Failed to dismiss poll:", error);
    }
  };

  const handleSnooze = async (duration: SnoozeDuration) => {
    if (!currentPoll) return;

    try {
      await pollApi.snoozePoll(currentPoll.id, duration);
      markAsSnoozed(currentPoll.id, duration);
      clearCurrentPoll();
      setShowSnoozeMenu(false);
    } catch (error) {
      console.error("Failed to snooze poll:", error);
    }
  };

  const getSnoozeLabel = (duration: SnoozeDuration): string => {
    switch (duration) {
      case "8h":
        return t("snooze8h");
      case "1d":
        return t("snooze1d");
      case "1w":
        return t("snooze1w");
      default:
        return duration;
    }
  };

  // Don't show if loading or no poll
  if (isLoading || !currentPoll) {
    return null;
  }

  // Thank you screen
  if (showThankYou) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-80 text-center">
          <div className="w-12 h-12 bg-[#87E64B] rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold text-[#171717] mb-1">
            {t("thankYou")}
          </h3>
          <p className="text-sm text-gray-600">{t("feedbackReceived")}</p>
        </div>
      </div>
    );
  }

  // Minimized state - just show a small floating button
  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-[100]">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-[#5E53E0] text-white rounded-full p-4 shadow-lg hover:bg-[#4f46c7] transition-all hover:scale-105"
          title="Show poll"
        >
          <NavArrowUp className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex-1 pr-2">
            <h3 className="font-semibold text-[#171717] text-sm leading-tight">
              {currentPoll.question}
            </h3>
            {currentPoll.showAnonymousBadge && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Check className="w-3 h-3" />
                <span>{t("anonymousBadge")}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Minimize"
            >
              <NavArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={t("dismiss")}
            >
              <Xmark className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description if any */}
        {currentPoll.description && (
          <p className="text-sm text-gray-600 px-4 py-2 bg-gray-50 border-b border-gray-100">
            {currentPoll.description}
          </p>
        )}

        {/* Options - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {currentPoll.options.map((option) => {
            const isSelected = selectedOptions.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => handleOptionToggle(option.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left text-sm ${
                  isSelected
                    ? "border-[#5E53E0] bg-[#5E53E0]/5"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {/* Checkbox/Radio */}
                <div
                  className={`w-4 h-4 flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                    currentPoll.type === "single_choice"
                      ? "rounded-full"
                      : "rounded"
                  } ${
                    isSelected
                      ? "border-[#5E53E0] bg-[#5E53E0]"
                      : "border-gray-300"
                  }`}
                >
                  {isSelected && (
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  )}
                </div>

                {/* Option content */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {option.emoji && (
                    <span className="text-base">{option.emoji}</span>
                  )}
                  <span className="text-[#171717] truncate">{option.text}</span>
                </div>

                {/* Vote count if shown */}
                {currentPoll.showVoteCounts && option.voteCount !== undefined && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {option.voteCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* "Other" option */}
          {currentPoll.allowOther && (
            <div className="mt-3">
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder={t("otherPlaceholder")}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent resize-none text-sm"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={selectedOptions.length === 0 || isSubmitting}
            className="w-full py-2.5 px-4 bg-[#87E64B] text-[#171717] font-semibold text-sm rounded-lg hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>

          {/* Snooze option */}
          <div className="flex items-center justify-center mt-3 relative">
            <button
              onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t("remindLater")}</span>
              <NavArrowDown className="w-3 h-3" />
            </button>

            {/* Snooze dropdown */}
            {showSnoozeMenu && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                {(["8h", "1d", "1w"] as SnoozeDuration[]).map((duration) => (
                  <button
                    key={duration}
                    onClick={() => handleSnooze(duration)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {getSnoozeLabel(duration)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloatingPollWidget;
