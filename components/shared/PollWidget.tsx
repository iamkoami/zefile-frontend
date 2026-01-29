"use client";

import { useEffect } from "react";
import { pollApi, PollTriggerType } from "@/services/poll-api";
import { usePollStore } from "@/stores/poll-store";
import { useDrawerStore } from "@/stores/drawer-store";
import { authApi } from "@/services/auth-api";

interface PollWidgetProps {
  trigger?: PollTriggerType;
}

/**
 * PollWidget - Checks for eligible polls and opens the drawer to display them
 * This component is invisible - it just triggers the poll check on mount
 * and opens the SideDrawer with the poll view when an eligible poll is found
 */
const PollWidget: React.FC<PollWidgetProps> = ({
  trigger = "manual",
}) => {
  const {
    setCurrentPoll,
    hasResponded,
    isDismissed,
    isSnoozed,
  } = usePollStore();

  const { openPollView, isOpen } = useDrawerStore();

  // Fetch eligible poll on mount
  useEffect(() => {
    const fetchPoll = async () => {
      // Only fetch if user is authenticated
      const user = authApi.getStoredUser();
      if (!user) {
        return;
      }

      // Don't fetch if drawer is already open
      if (isOpen) {
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
            // Store the poll and open the drawer
            setCurrentPoll(poll);
            openPollView(poll.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch eligible poll:", error);
      }
    };

    // Small delay to let page render first
    const timer = setTimeout(fetchPoll, 1500);
    return () => clearTimeout(timer);
  }, [trigger, setCurrentPoll, hasResponded, isDismissed, isSnoozed, openPollView, isOpen]);

  // This component renders nothing - it just triggers the poll check
  return null;
};

export default PollWidget;
