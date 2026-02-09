import { useCallback } from "react";
import { pollApi, UserPoll, PollTriggerType } from "@/services/poll-api";
import { usePollStore } from "@/stores/poll-store";
import { authApi } from "@/services/auth-api";

interface UsePollEligibilityReturn {
  /** Manually trigger a poll check for a specific trigger type, with optional delay in ms */
  checkForPoll: (trigger: PollTriggerType, delay?: number) => Promise<UserPoll | null>;
  /** Clear the current poll */
  clearPoll: () => void;
}

/**
 * Hook for checking poll eligibility based on trigger events
 * Use this to trigger polls after specific user actions like:
 * - after_transfer: After completing a file transfer
 * - after_download: After downloading files
 * - after_payment: After completing a payment
 * - on_login: After user logs in
 *
 * @example
 * ```tsx
 * const { checkForPoll, poll } = usePollEligibility();
 *
 * // After transfer completes (3s delay to show success screen first)
 * const handleTransferComplete = async () => {
 *   await checkForPoll('after_transfer', 3000);
 * };
 * ```
 */
export function usePollEligibility(): UsePollEligibilityReturn {
  const {
    setCurrentPoll,
    clearCurrentPoll,
    hasResponded,
    isDismissed,
    isSnoozed,
  } = usePollStore();

  const checkForPoll = useCallback(
    async (trigger: PollTriggerType, delay?: number): Promise<UserPoll | null> => {
      // Race condition guard: skip if a poll is already visible
      if (usePollStore.getState().currentPoll) return null;

      // Only check if user is authenticated
      const user = authApi.getStoredUser();
      if (!user) {
        return null;
      }

      // Optional delay before fetching (e.g., let user see success screen first)
      if (delay) {
        await new Promise(resolve => setTimeout(resolve, delay));
        // Re-check after delay — another trigger may have set a poll
        if (usePollStore.getState().currentPoll) return null;
      }

      try {
        const response = await pollApi.getEligiblePoll(trigger);

        if (response.error) {
          return null;
        }

        if (response.data) {
          const eligiblePoll = response.data;

          // Check if already responded, dismissed, or snoozed
          if (
            hasResponded(eligiblePoll.id) ||
            isDismissed(eligiblePoll.id) ||
            isSnoozed(eligiblePoll.id)
          ) {
            return null;
          }

          setCurrentPoll(eligiblePoll);
          return eligiblePoll;
        }

        return null;
      } catch {
        return null;
      }
    },
    [setCurrentPoll, hasResponded, isDismissed, isSnoozed]
  );

  const clearPoll = useCallback(() => {
    clearCurrentPoll();
  }, [clearCurrentPoll]);

  return {
    checkForPoll,
    clearPoll,
  };
}

export default usePollEligibility;
