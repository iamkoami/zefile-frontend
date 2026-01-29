/**
 * Poll Store - Zustand store for poll state management
 * Manages current poll, dismissed/snoozed polls, and response tracking
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserPoll } from '@/services/poll-api';

interface PollState {
  // Current poll to display (null if none)
  currentPoll: UserPoll | null;

  // Polls the user has permanently dismissed (by ID)
  dismissedPolls: string[];

  // Polls the user has snoozed (pollId -> snoozeUntil timestamp)
  snoozedPolls: Record<string, number>;

  // Polls the user has responded to (by ID)
  respondedPolls: string[];

  // Whether the poll widget is visible
  isWidgetVisible: boolean;

  // Actions
  setCurrentPoll: (poll: UserPoll | null) => void;
  clearCurrentPoll: () => void;
  showWidget: () => void;
  hideWidget: () => void;
  markAsDismissed: (pollId: string) => void;
  markAsSnoozed: (pollId: string, duration: '8h' | '1d' | '1w') => void;
  markAsResponded: (pollId: string) => void;
  hasResponded: (pollId: string) => boolean;
  isDismissed: (pollId: string) => boolean;
  isSnoozed: (pollId: string) => boolean;
  canShowPoll: (pollId: string) => boolean;
  clearExpiredSnoozes: () => void;
  reset: () => void;
}

// Snooze durations in milliseconds
export const SNOOZE_DURATIONS = {
  '8h': 8 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
} as const;

export const usePollStore = create<PollState>()(
  persist(
    (set, get) => ({
      currentPoll: null,
      dismissedPolls: [],
      snoozedPolls: {},
      respondedPolls: [],
      isWidgetVisible: false,

      setCurrentPoll: (poll) =>
        set({
          currentPoll: poll,
          isWidgetVisible: poll !== null,
        }),

      clearCurrentPoll: () =>
        set({
          currentPoll: null,
          isWidgetVisible: false,
        }),

      showWidget: () => set({ isWidgetVisible: true }),

      hideWidget: () =>
        set({
          isWidgetVisible: false,
          currentPoll: null,
        }),

      markAsDismissed: (pollId) =>
        set((state) => ({
          dismissedPolls: [...new Set([...state.dismissedPolls, pollId])],
          currentPoll: null,
          isWidgetVisible: false,
        })),

      markAsSnoozed: (pollId, duration) => {
        const durationMs = SNOOZE_DURATIONS[duration];
        const snoozeUntil = Date.now() + durationMs;
        set((state) => ({
          snoozedPolls: { ...state.snoozedPolls, [pollId]: snoozeUntil },
          currentPoll: null,
          isWidgetVisible: false,
        }));
      },

      markAsResponded: (pollId) =>
        set((state) => ({
          respondedPolls: [...new Set([...state.respondedPolls, pollId])],
          currentPoll: null,
          isWidgetVisible: false,
        })),

      hasResponded: (pollId) => {
        return get().respondedPolls.includes(pollId);
      },

      isDismissed: (pollId) => {
        return get().dismissedPolls.includes(pollId);
      },

      isSnoozed: (pollId) => {
        const snoozeUntil = get().snoozedPolls[pollId];
        return snoozeUntil !== undefined && Date.now() < snoozeUntil;
      },

      canShowPoll: (pollId) => {
        const state = get();

        // Check if permanently dismissed
        if (state.dismissedPolls.includes(pollId)) {
          return false;
        }

        // Check if already responded
        if (state.respondedPolls.includes(pollId)) {
          return false;
        }

        // Check if snoozed and not expired
        const snoozeUntil = state.snoozedPolls[pollId];
        if (snoozeUntil && Date.now() < snoozeUntil) {
          return false;
        }

        return true;
      },

      clearExpiredSnoozes: () => {
        const now = Date.now();
        set((state) => {
          const newSnoozed: Record<string, number> = {};
          for (const [pollId, until] of Object.entries(state.snoozedPolls)) {
            if (until > now) {
              newSnoozed[pollId] = until;
            }
          }
          return { snoozedPolls: newSnoozed };
        });
      },

      reset: () =>
        set({
          currentPoll: null,
          isWidgetVisible: false,
        }),
    }),
    {
      name: 'zefile-poll-storage',
      partialize: (state) => ({
        dismissedPolls: state.dismissedPolls,
        snoozedPolls: state.snoozedPolls,
        respondedPolls: state.respondedPolls,
      }),
    }
  )
);
