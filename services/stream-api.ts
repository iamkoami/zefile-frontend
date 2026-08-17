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

/**
 * Machine-readable refusal codes the playback routes emit (Story 135.4/135.5).
 *
 * The backend deliberately sends English in `message` for logs and Swagger and expects the
 * CLIENT to render localised copy keyed on `code` — `stream.controller.ts` says so in as many
 * words ("No buyer-facing English is written by this story"). Never render `error.message` from
 * these routes to a buyer.
 *
 * ⚠ `STREAM_DEVICE_LIMIT` is the only 429 that means "stop your other device". A 429 with NO
 * code is the transport rate limit and means "slow down and retry automatically" — opposite
 * client behaviour, indistinguishable from the status alone. This is 135.5's Finding 3.
 */
export const STREAM_ERROR_CODES = {
  deviceLimit: 'STREAM_DEVICE_LIMIT',
  sessionExpired: 'STREAM_SESSION_EXPIRED',
  sessionUnavailable: 'STREAM_SESSION_UNAVAILABLE',
  notReady: 'STREAM_NOT_READY',
  notEntitled: 'STREAM_NOT_ENTITLED',
  entitlementRevoked: 'STREAM_ENTITLEMENT_REVOKED',
} as const;

export interface StreamSessionResponse {
  /** Opaque lease id. Only ever sent back on the heartbeat. */
  sessionId: string;
  /** ISO timestamp. The lease dies here unless a heartbeat renews it. */
  expiresAt: string;
  /**
   * Derived from the server's lease TTL, never a constant.
   *
   * 135.5 made this a response field precisely so a config change cannot invalidate an interval
   * the client baked in. Drive the timer from this value; do not hardcode 30.
   */
  heartbeatIntervalSeconds: number;
  /**
   * The master playlist, when the resolved provider serves one directly.
   *
   * `null` is a DECISION, not a gap: under Cloudflare the credential from
   * `GET /stream/key/:fileId` already IS a tokenised manifest URL, so the player falls through
   * to `fetchManifestCredential` for it. Under the self-hosted provider this is
   * `{BACKEND_URL}/stream/hls/{fileId}/master.m3u8`.
   */
  manifestUrl: string | null;
}

export interface StreamHeartbeatResponse {
  /** The renewed lease expiry, ISO. */
  expiresAt: string;
}

export interface StreamManifestCredential {
  manifestUrl: string;
  expiresAt: string;
}

export const streamApi = {
  /**
   * Take one of the two device slots for this film (Story 135.5).
   *
   * Refusals the caller MUST tell apart, because they demand different buyer copy:
   *   - 429 + `code: STREAM_DEVICE_LIMIT` → the cap, with `limit` and `retryAfterSeconds`
   *   - 429 without a code                → transport throttle, retry automatically
   *   - 403 STREAM_NOT_ENTITLED / STREAM_ENTITLEMENT_REVOKED
   *   - 409 STREAM_NOT_READY → still packaging
   *   - 503 STREAM_SESSION_UNAVAILABLE → leases unreachable
   *   - 400 → the transfer holds more than one film (not reachable from the sale page today)
   *   - 401 → the access-token cookie expired; `apiClient` refreshes and retries transparently
   *
   * ⚠ There is deliberately no `saleSessionId` parameter and adding one would be a security
   * regression — the server resolves which purchase is counted, and a caller that could choose
   * would hold four devices on a cap of two (`start-session.dto.ts`).
   */
  async startSession(transferId: string): Promise<ApiResponse<StreamSessionResponse>> {
    return apiClient.post<StreamSessionResponse>('/stream/sessions', { transferId });
  },

  /**
   * Keep the lease alive. Call every `heartbeatIntervalSeconds` while playing.
   *
   * ⚠ **A 409 is ORDINARY, not an error to show a buyer.** This is 135.5's explicit hand-off
   * obligation to this story. The route can never CREATE a lease — `ZADD … XX` refuses a missing
   * member — so a backgrounded phone whose timers were throttled, or a caller whose acknowledged
   * lease was trimmed by a later caller (135.5 measured ~25% phantom 201s at 3-way contention),
   * gets 409 and must silently re-acquire through `startSession`. Surfacing it would put a
   * failure message on a film that is playing perfectly.
   *
   * `transferId` is required and is not redundant: the lease key is derived from the caller's own
   * resolved purchase, which is what makes "cannot renew someone else's lease" structural rather
   * than a check that can be forgotten (`heartbeat.dto.ts`).
   */
  async heartbeat(
    sessionId: string,
    transferId: string,
  ): Promise<ApiResponse<StreamHeartbeatResponse>> {
    return apiClient.post<StreamHeartbeatResponse>(
      `/stream/sessions/${sessionId}/heartbeat`,
      { transferId },
    );
  },

  /**
   * Re-fetch the playback credential — the sole authorization point for playback (SD-NFR1).
   *
   * This route answers in TWO shapes and the caller cannot choose which:
   *   - **Cloudflare** → JSON `{ manifestUrl, expiresAt }`, and the URL is the tokenised manifest
   *   - **self-hosted** → 16 raw bytes of AES-128 key material, `application/octet-stream`
   *
   * `apiClient` parses every 200 as JSON and yields `data: null` when that fails, so the raw-key
   * shape lands here as `{ data: null, status: 200 }`. That is the correct, expected outcome on
   * the self-hosted path: Shaka fetches those bytes itself from the `#EXT-X-KEY` URI baked into
   * the playlist, and this call exists there only to force `apiClient`'s 401 → refresh → retry so
   * the cookie is fresh again before `retryStreaming()`. Hence the `manifestUrl` in the return is
   * optional rather than a failure when absent.
   *
   * ⚠ Do not treat the credential as parseable. It is opaque and provider-shaped (D6): never
   * branch on provider name, never parse `stream_asset_id`, never build a URL from it.
   */
  async fetchManifestCredential(
    fileId: string,
  ): Promise<ApiResponse<StreamManifestCredential | null>> {
    return apiClient.get<StreamManifestCredential | null>(`/stream/key/${fileId}`);
  },

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
