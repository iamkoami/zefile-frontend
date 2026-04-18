"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { storageApi } from "@/services/storage-api";

export type PreviewStatus = "pending" | "ready" | "failed" | "skipped";

interface UsePreviewStatusArgs {
  /** Transfer short code. */
  shortCode: string;
  /** File id to poll for. */
  fileId: string;
  /** Initial status from the first preview/url response (or the list payload). */
  initialStatus?: PreviewStatus;
  /** Pass-through password / session for the status request. Needed for password-protected transfers. */
  password?: string;
  sessionToken?: string;
  /** Gate polling (e.g. disable until the recipient verifies email). */
  enabled?: boolean;
  /** Override poll interval, ms. Default 8_000. */
  intervalMs?: number;
  /** Max polling attempts (≈ intervalMs × maxAttempts). Default 22 (~ 3 min). */
  maxAttempts?: number;
}

interface UsePreviewStatusResult {
  status: PreviewStatus;
  /** Number of poll attempts made (excluding the initial bootstrap). */
  attempts: number;
  /** True when polling gave up without reaching ready. */
  exhausted: boolean;
  /** Force the hook to restart polling (e.g. after the user hits "retry"). */
  retry: () => void;
}

const DEFAULT_INTERVAL_MS = 8_000;
const DEFAULT_MAX_ATTEMPTS = 22;

/**
 * Visibility-aware polling for async preview generation. Polls
 * POST /storage/preview/status (lightweight, no side effects) on an interval
 * until status leaves "pending", then stops. Pauses when the tab is hidden
 * to save battery + egress.
 */
export function usePreviewStatus({
  shortCode,
  fileId,
  initialStatus = "pending",
  password,
  sessionToken,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: UsePreviewStatusArgs): UsePreviewStatusResult {
  const [status, setStatus] = useState<PreviewStatus>(initialStatus);
  const [attempts, setAttempts] = useState(0);
  // Incremented by retry() — used as an effect dep to restart polling.
  const [retryTick, setRetryTick] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const attemptsRef = useRef(0);

  const exhausted = status === "pending" && attempts >= maxAttempts;

  const retry = useCallback(() => {
    setStatus("pending");
    setAttempts(0);
    attemptsRef.current = 0;
    setRetryTick((t) => t + 1);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    attemptsRef.current = 0;
    setAttempts(0);

    if (!enabled) return;
    if (!shortCode || !fileId) return;
    if (initialStatus !== "pending") {
      setStatus(initialStatus);
      return;
    }

    const scheduleNext = (delay: number) => {
      if (cancelledRef.current) return;
      timerRef.current = setTimeout(() => {
        void poll();
      }, delay);
    };

    const poll = async (): Promise<void> => {
      if (cancelledRef.current) return;

      // Honor Page Visibility API — don't waste cycles on backgrounded tabs.
      // Re-check on the same interval so we pick up on the next visible tick
      // even without a visibilitychange event.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        scheduleNext(intervalMs);
        return;
      }

      if (attemptsRef.current >= maxAttempts) return;

      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);

      try {
        const response = await storageApi.getFilePreviewStatus(shortCode, fileId, {
          password,
          sessionToken,
        });
        if (cancelledRef.current) return;
        const next = response.data?.previewStatus as PreviewStatus | undefined;
        if (next) {
          setStatus(next);
          if (next !== "pending") return; // stop polling — terminal state
        }
      } catch {
        // Swallow transient errors — keep polling until attempts exhausted
      }

      if (!cancelledRef.current && attemptsRef.current < maxAttempts) {
        scheduleNext(intervalMs);
      }
    };

    // Start the first tick after the interval so we don't double-fetch right
    // after the parent already made the initial request.
    scheduleNext(intervalMs);

    const onVisibilityChange = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible" && !cancelledRef.current) {
        // Resume promptly on focus instead of waiting out the remaining tick.
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        void poll();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
    // password/sessionToken left out of deps on purpose: both are stable per
    // recipient session — re-including them would reset the poll each render
    // if a parent re-creates the strings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortCode, fileId, enabled, intervalMs, maxAttempts, initialStatus, retryTick]);

  return { status, attempts, exhausted, retry };
}
