/**
 * Poll API Service
 * Handles all poll-related API requests
 */

import { apiClient, ApiResponse } from './api-client';

// Poll types
export type PollType = 'single_choice' | 'multiple_choice';

export type PollTriggerType =
  | 'manual'
  | 'after_transfer'
  | 'after_download'
  | 'after_payment'
  | 'on_login'
  | 'scheduled'
  | 'after_n_days_signup'
  | 'after_n_transfers'
  | 'after_subscription_upgrade';

// Poll option
export interface PollOption {
  id: string;
  text: string;
  emoji?: string;
  displayOrder: number;
  voteCount?: number;
}

// User-facing poll (limited fields)
export interface UserPoll {
  id: string;
  question: string;
  description?: string;
  type: PollType;
  allowOther: boolean;
  showAnonymousBadge: boolean;
  showVoteCounts: boolean;
  options: PollOption[];
}

// Snooze duration options
export type SnoozeDuration = '8h' | '1d' | '1w';

// Submit response DTO
export interface SubmitPollResponseDto {
  pollId: string;
  selectedOptionIds: string[];
  otherText?: string;
  sessionId?: string;
}

// Dismiss poll DTO
export interface DismissPollDto {
  pollId: string;
  action: 'dismiss' | 'snooze';
  snoozeDuration?: SnoozeDuration;
  sessionId?: string;
}

class PollApiService {
  /**
   * Get eligible poll for current user
   * @param trigger - The trigger type to check for (defaults to 'manual')
   * @param sessionId - Optional session ID for anonymous users
   */
  async getEligiblePoll(
    trigger: PollTriggerType = 'manual',
    sessionId?: string
  ): Promise<ApiResponse<UserPoll | null>> {
    const params = new URLSearchParams();
    params.append('trigger', trigger);
    if (sessionId) {
      params.append('sessionId', sessionId);
    }

    return apiClient.get<UserPoll | null>(`/polls/eligible?${params.toString()}`);
  }

  /**
   * Submit a poll response
   */
  async submitResponse(
    pollId: string,
    selectedOptionIds: string[],
    otherText?: string,
    sessionId?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const dto: SubmitPollResponseDto = {
      pollId,
      selectedOptionIds,
      otherText,
      sessionId,
    };

    return apiClient.post(`/polls/${pollId}/respond`, dto);
  }

  /**
   * Dismiss a poll (permanently hide)
   */
  async dismissPoll(
    pollId: string,
    sessionId?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const dto: DismissPollDto = {
      pollId,
      action: 'dismiss',
      sessionId,
    };

    return apiClient.post(`/polls/${pollId}/dismiss`, dto);
  }

  /**
   * Snooze a poll (hide temporarily)
   */
  async snoozePoll(
    pollId: string,
    duration: SnoozeDuration,
    sessionId?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const dto: DismissPollDto = {
      pollId,
      action: 'snooze',
      snoozeDuration: duration,
      sessionId,
    };

    return apiClient.post(`/polls/${pollId}/dismiss`, dto);
  }
}

export const pollApi = new PollApiService();
