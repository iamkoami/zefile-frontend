/**
 * Stream API Service
 *
 * Creator-facing stream operations. Story 134.7 opens this file with the packaging retry;
 * the buyer-facing playback calls (session, credential, heartbeat, events) join it in
 * Epic 135, which is why it is named `stream-api` rather than `stream-packaging-api`.
 */

import { apiClient, ApiResponse } from './api-client';

export interface RetryPackagingResponse {
  transferId: string;
  /**
   * Always 'pending' on success, never 'processing' (story D6). The worker writes
   * 'processing' when a job actually starts; under `concurrency: 1` a job can sit queued
   * behind another film for a long time, so claiming it from an HTTP handler would be a lie
   * for exactly that long. Both render as one "preparing" state.
   */
  streamStatus: 'pending';
}

export const streamApi = {
  /**
   * Re-queue packaging for a stream transfer whose media failed to prepare.
   *
   * The backend removes the retained failed job before re-adding it — without that, BullMQ
   * silently refuses the duplicate id and nothing runs. Callers do not need to know this,
   * but they DO need to respect the refusals:
   *
   *   - 403 the caller is not the sender
   *   - 404 no such transfer
   *   - 400 not a stream-only transfer
   *   - 409 not in a failed state (already ready, or already being prepared)
   *   - 429 more than 5 retries in an hour
   *
   * Surface every one of them. A retry that quietly does nothing is the exact failure this
   * story exists to remove.
   */
  async retryPackaging(transferId: string): Promise<ApiResponse<RetryPackagingResponse>> {
    return apiClient.post<RetryPackagingResponse>(`/stream/transfers/${transferId}/repackage`, {});
  },
};
