'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Clock, NavArrowDown } from 'iconoir-react';
import { pollApi, UserPoll, SnoozeDuration } from '@/services/poll-api';
import { apiClient } from '@/services/api-client';
import { usePollStore } from '@/stores/poll-store';
import { useDrawerStore } from '@/stores/drawer-store';
import LoadingPanel from '@/components/LoadingPanel';

/**
 * PollPanel - Poll display inside SideDrawer
 * Shows the current poll with options, submit, snooze, and dismiss
 */
const PollPanel: React.FC = () => {
  const t = useTranslations('poll');
  const { payload, closeDrawer } = useDrawerStore();
  const {
    currentPoll,
    clearCurrentPoll,
    markAsResponded,
    markAsDismissed,
    markAsSnoozed,
  } = usePollStore();

  const [poll, setPoll] = useState<UserPoll | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load poll from store or fetch by ID
  useEffect(() => {
    const loadPoll = async () => {
      // If we have a current poll in store, use it
      if (currentPoll) {
        setPoll(currentPoll);
        setIsLoading(false);
        return;
      }

      // If we have a pollId in payload, fetch it (not implemented in user API)
      // For now, we rely on the poll store's currentPoll
      setIsLoading(false);
    };

    loadPoll();
  }, [currentPoll, payload?.pollId]);

  const handleOptionToggle = useCallback(
    (optionId: string) => {
      if (!poll) return;

      if (poll.type === 'single_choice') {
        setSelectedOptions([optionId]);
      } else {
        setSelectedOptions((prev) =>
          prev.includes(optionId)
            ? prev.filter((id) => id !== optionId)
            : [...prev, optionId]
        );
      }
    },
    [poll]
  );

  const handleSubmit = async () => {
    if (!poll || selectedOptions.length === 0) return;

    const pollId = poll.id;
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
          clearCurrentPoll();
          closeDrawer();
        }
        return;
      }

      if (response.data?.success) {
        markAsResponded(pollId);
        setShowThankYou(true);
        setTimeout(() => {
          clearCurrentPoll();
          closeDrawer();
        }, 2000);
      }
    } catch {
      // Network error — close drawer to avoid stuck panel
      clearCurrentPoll();
      closeDrawer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    if (!poll) return;

    const pollId = poll.id;
    // Optimistic: dismiss locally first
    markAsDismissed(pollId);
    clearCurrentPoll();
    closeDrawer();
    // Best effort server notification
    try {
      await pollApi.dismissPoll(pollId);
    } catch {
      // Already dismissed locally
    }
  };

  const handleSnooze = async (duration: SnoozeDuration) => {
    if (!poll) return;

    const pollId = poll.id;
    // Optimistic: snooze locally first
    markAsSnoozed(pollId, duration);
    clearCurrentPoll();
    setShowSnoozeMenu(false);
    closeDrawer();
    // Best effort server notification
    try {
      await pollApi.snoozePoll(pollId, duration);
    } catch {
      // Already snoozed locally
    }
  };

  const getSnoozeLabel = (duration: SnoozeDuration): string => {
    switch (duration) {
      case '8h':
        return t('snooze8h');
      case '1d':
        return t('snooze1d');
      case '1w':
        return t('snooze1w');
      default:
        return duration;
    }
  };

  if (isLoading) {
    return <LoadingPanel />;
  }

  if (!poll) {
    return (
      <div className="text-center py-12 text-gray-500">
        No poll available
      </div>
    );
  }

  // Thank you screen
  if (showThankYou) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 bg-[#87E64B] rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>
        <h2 className="text-2xl font-bold text-[#171717] mb-3">
          {t('thankYou')}
        </h2>
        <p className="text-gray-600 text-center max-w-md">
          {t('feedbackReceived')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#171717] mb-3">
          {poll.question}
        </h2>
        {poll.description && (
          <p className="text-gray-600 text-lg">{poll.description}</p>
        )}
        {poll.showAnonymousBadge && (
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
              <Check className="w-3 h-3 text-gray-500" />
            </div>
            <span>{t('anonymousBadge')}</span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3 mb-8">
        {poll.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => handleOptionToggle(option.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Checkbox/Radio */}
              <div
                className={`w-6 h-6 flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                  poll.type === 'single_choice' ? 'rounded-full' : 'rounded-md'
                } ${
                  isSelected
                    ? 'border-[#5E53E0] bg-[#5E53E0]'
                    : 'border-gray-300'
                }`}
              >
                {isSelected && (
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                )}
              </div>

              {/* Option content */}
              <div className="flex items-center gap-3 flex-1">
                {option.emoji && (
                  <span className="text-2xl">{option.emoji}</span>
                )}
                <span className="text-[#171717] text-lg">{option.text}</span>
              </div>

              {/* Vote count if shown */}
              {poll.showVoteCounts && option.voteCount !== undefined && (
                <span className="text-sm text-gray-400 font-medium">
                  {option.voteCount}
                </span>
              )}
            </button>
          );
        })}

        {/* "Other" option */}
        {poll.allowOther && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('otherLabel')}
            </label>
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder={t('otherPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent resize-none"
            />
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={selectedOptions.length === 0 || isSubmitting}
        className="w-full py-4 px-6 bg-[#87E64B] text-[#171717] font-bold text-lg rounded-lg hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        {isSubmitting ? t('submitting') : t('submit')}
      </button>

      {/* Snooze/Dismiss options */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="relative">
          <button
            onClick={() => setShowSnoozeMenu(!showSnoozeMenu)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors py-2"
          >
            <Clock className="w-4 h-4" />
            <span>{t('remindLater')}</span>
            <NavArrowDown className="w-4 h-4" />
          </button>

          {/* Snooze dropdown */}
          {showSnoozeMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[160px] z-10">
              {(['8h', '1d', '1w'] as SnoozeDuration[]).map((duration) => (
                <button
                  key={duration}
                  onClick={() => handleSnooze(duration)}
                  className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {getSnoozeLabel(duration)}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-gray-300">|</span>

        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-700 transition-colors py-2"
        >
          {t('dontAskAgain')}
        </button>
      </div>
    </div>
  );
};

export default PollPanel;
