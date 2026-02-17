"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock, NavArrowDown, Xmark, NavArrowUp } from "iconoir-react";
import { pollApi, SnoozeDuration } from "@/services/poll-api";
import { apiClient } from "@/services/api-client";
import { usePollStore } from "@/stores/poll-store";
import { useChatStore } from "@/stores/chat-store";

/**
 * FloatingPollWidget - Non-intrusive poll widget for frontend
 * Appears in bottom-right corner without blocking user actions
 * Can be minimized, dismissed, or snoozed
 *
 * This widget is purely reactive — it renders from poll store state.
 * Poll fetching is handled by usePollEligibility hook in parent pages.
 */
const FloatingPollWidget: React.FC = () => {
  const t = useTranslations("poll");
  const {
    currentPoll,
    isWidgetVisible,
    clearCurrentPoll,
    markAsResponded,
    markAsDismissed,
    markAsSnoozed,
  } = usePollStore();

  // Hide poll when chat widget is open, reappear with 2s delay after chat closes
  const isChatOpen = useChatStore((s) => s.isOpen);
  const [isChatDeferring, setIsChatDeferring] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      setIsChatDeferring(true);
    } else if (isChatDeferring) {
      const timer = setTimeout(() => setIsChatDeferring(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen, isChatDeferring]);

  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

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

    const pollId = currentPoll.id;
    setIsSubmitting(true);
    try {
      // Ensure CSRF token is fresh (it's in-memory only, lost on page refresh)
      await apiClient.initCsrfToken();

      const response = await pollApi.submitResponse(
        pollId,
        selectedOptions,
        otherText.trim() || undefined
      );

      if (response.error) {
        // 409 = already responded, treat as success
        if (response.status === 409) {
          markAsResponded(pollId);
        } else {
          // Auth/CSRF/other failure — dismiss stale poll
          clearCurrentPoll();
        }
        return;
      }

      if (response.data?.success) {
        markAsResponded(pollId);
        setShowThankYou(true);
        setTimeout(() => {
          clearCurrentPoll();
        }, 2500);
      }
    } catch {
      // Network error — dismiss to avoid stuck widget
      clearCurrentPoll();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!currentPoll) return;
    // X button = snooze for 8h (gentle close, poll comes back)
    handleSnooze("8h");
  };

  const handleDismiss = async () => {
    if (!currentPoll) return;

    const pollId = currentPoll.id;
    // Optimistic: dismiss locally first
    markAsDismissed(pollId);
    clearCurrentPoll();
    // Best effort server notification
    try {
      await pollApi.dismissPoll(pollId);
    } catch {
      // Already dismissed locally
    }
  };

  const handleSnooze = async (duration: SnoozeDuration) => {
    if (!currentPoll) return;

    const pollId = currentPoll.id;
    // Optimistic: snooze locally first
    markAsSnoozed(pollId, duration);
    clearCurrentPoll();
    setShowSnoozeMenu(false);
    // Best effort server notification
    try {
      await pollApi.snoozePoll(pollId, duration);
    } catch {
      // Already snoozed locally
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

  // Don't show if widget hidden, no poll, or chat is open
  if (!isWidgetVisible || !currentPoll || isChatOpen || isChatDeferring) {
    return null;
  }

  // Thank you screen
  if (showThankYou) {
    return (
      <div className="fixed bottom-6 right-[92px] z-[120] animate-in slide-in-from-bottom-4 duration-300">
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
      <div className="fixed bottom-6 right-[92px] z-[120]">
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
    <div className="fixed bottom-6 right-[92px] z-[120] animate-in slide-in-from-bottom-4 duration-300">
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
              onClick={handleClose}
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

          {/* Snooze & dismiss options */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t("dontAskAgain")}
            </button>

            <div className="relative">
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
                <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
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
    </div>
  );
};

export default FloatingPollWidget;
