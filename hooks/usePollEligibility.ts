import { useCallback, useState } from "react";
import { pollApi, UserPoll, PollTriggerType } from "@/services/poll-api";
import { usePollStore } from "@/stores/poll-store";
import { authApi } from "@/services/auth-api";

interface UsePollEligibilityOptions {
  /** Whether to auto-check on mount (default: false) */
  autoCheck?: boolean;
  /** Delay before showing poll in ms (default: 0) */
  delay?: number;
}

interface UsePollEligibilityReturn {
  /** The current eligible poll, if any */
  poll: UserPoll | null;
  /** Whether a poll check is in progress */
  isLoading: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Manually trigger a poll check for a specific trigger type */
  checkForPoll: (trigger: PollTriggerType) => Promise<UserPoll | null>;
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
 * // After transfer completes
 * const handleTransferComplete = async () => {
 *   await checkForPoll('after_transfer');
 * };
 * ```
 */
export function usePollEligibility(
  _options: UsePollEligibilityOptions = {}
): UsePollEligibilityReturn {
  const [poll, setPoll] = useState<UserPoll | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    setCurrentPoll,
    clearCurrentPoll,
    hasResponded,
    isDismissed,
    isSnoozed,
  } = usePollStore();

  const checkForPoll = useCallback(
    async (trigger: PollTriggerType): Promise<UserPoll | null> => {
      // Only check if user is authenticated
      const user = authApi.getStoredUser();
      if (!user) {
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await pollApi.getEligiblePoll(trigger);

        if (response.error) {
          setError(response.error.message || 'Failed to fetch poll');
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

          setPoll(eligiblePoll);
          setCurrentPoll(eligiblePoll);
          return eligiblePoll;
        }

        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to check poll eligibility";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setCurrentPoll, hasResponded, isDismissed, isSnoozed]
  );

  const clearPoll = useCallback(() => {
    setPoll(null);
    clearCurrentPoll();
  }, [clearCurrentPoll]);

  return {
    poll,
    isLoading,
    error,
    checkForPoll,
    clearPoll,
  };
}

export default usePollEligibility;
