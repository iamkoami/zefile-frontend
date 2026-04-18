"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Xmark } from "iconoir-react";
import { transferApi } from "@/services/transfer-api";
import {
  AnalyticsEventType,
  trackEvent,
} from "@/lib/posthog";

export type DownloadFailureScenario = "network" | "server" | "zip" | "generic";

export interface DownloadRecoveryErrorContext {
  httpStatus?: number;
  jsErrorMessage?: string;
  fileCount?: number;
  transferSizeBytes?: number;
}

interface DownloadRecoveryCardProps {
  /** Transfer short code (without z- prefix) */
  shortCode: string;
  /** The email the recipient used to verify access (required to report failure). */
  recipientEmail?: string | null;
  /** Sender's display name; falls back to generic copy when absent. */
  senderName?: string | null;
  /** Current failure scenario (recomputed on each failure). */
  scenario: DownloadFailureScenario;
  /** Diagnostic context — file IDs/counts only, never paths or s3 keys. */
  errorContext?: DownloadRecoveryErrorContext;
  /** How many consecutive retries have failed. 0 = first failure. */
  attemptNumber: number;
  /** True while a retry is in flight (disables buttons). */
  isRetrying: boolean;
  /** Fires "Try again" — parent re-runs the download with cached auth. */
  onRetry: () => void;
  /** Fires "Download one file at a time" — parent switches to fallback mode. */
  onEnterFallback: () => void;
  /** Fires when the user dismisses the card. */
  onDismiss: () => void;
}

type ReportState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "rate-limited" }
  | { kind: "error" };

/**
 * DownloadRecoveryCard — Story 132.3
 *
 * Persistent in-context recovery surface (NOT a modal) shown next to the
 * download button after a failed ZIP download. Three escalating paths:
 * retry, per-file fallback, contact sender.
 *
 * Behavior:
 * - Body copy is scenario-specific (network/server/zip/generic).
 * - When scenario === "zip", the fallback button is promoted to primary.
 * - After 3 consecutive failures, "Tell sender" becomes primary (AC #7).
 * - Tell-sender rate-limit + confirmation state persisted in sessionStorage.
 */
export default function DownloadRecoveryCard({
  shortCode,
  recipientEmail,
  senderName,
  scenario,
  errorContext,
  attemptNumber,
  isRetrying,
  onRetry,
  onEnterFallback,
  onDismiss,
}: DownloadRecoveryCardProps) {
  const t = useTranslations("transferLanding");
  const [reportState, setReportState] = useState<ReportState>({ kind: "idle" });

  const sentStorageKey = useMemo(
    () => `dl-failed-reported:${shortCode}`,
    [shortCode],
  );
  const rateLimitStorageKey = useMemo(
    () => `dl-failed-rate-limited:${shortCode}`,
    [shortCode],
  );

  // Hydrate persisted report state so dismissing + reopening the card
  // after a successful report doesn't let the user re-send within the
  // 60-minute backend window.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sentRaw = sessionStorage.getItem(sentStorageKey);
      if (sentRaw) {
        const sentAtMs = Number(sentRaw);
        if (Number.isFinite(sentAtMs) && Date.now() - sentAtMs < 5 * 60 * 1000) {
          setReportState({ kind: "sent" });
          return;
        }
        sessionStorage.removeItem(sentStorageKey);
      }

      const rateLimitRaw = sessionStorage.getItem(rateLimitStorageKey);
      if (rateLimitRaw) {
        const hitAtMs = Number(rateLimitRaw);
        if (Number.isFinite(hitAtMs) && Date.now() - hitAtMs < 60 * 60 * 1000) {
          setReportState({ kind: "rate-limited" });
          return;
        }
        sessionStorage.removeItem(rateLimitStorageKey);
      }
    } catch {
      // sessionStorage blocked — fall back to idle state
    }
  }, [sentStorageKey, rateLimitStorageKey]);

  const trimmedName = senderName?.trim() || "";
  const trimmedEmail = recipientEmail?.trim() || "";
  const canReport = trimmedEmail.length > 0;
  // AC #7 — "retries 3 consecutive times and all 3 fail". attemptNumber
  // counts every failure including the initial one, so 1 initial failure
  // plus 3 retry failures = 4 total. Escalate on the 4th failure.
  const isStuck = attemptNumber >= 4;
  // ZIP-stream failures are the one case where "one at a time" is the
  // obvious next step, so promote it to primary (AC #2).
  const promoteFallback = scenario === "zip";

  const body = (() => {
    if (isStuck) {
      return trimmedName
        ? t("recoveryCardBodyStuck", { senderName: trimmedName })
        : t("recoveryCardBodyStuckGeneric");
    }
    switch (scenario) {
      case "network":
        return t("recoveryCardBodyNetwork");
      case "server":
        return trimmedName
          ? t("recoveryCardBodyServer", { senderName: trimmedName })
          : t("recoveryCardBodyServerGeneric");
      case "zip":
        return t("recoveryCardBodyZip");
      default:
        return t("recoveryCardBodyGeneric");
    }
  })();

  const tellSenderLabel = trimmedName
    ? t("recoveryCardTellSender", { senderName: trimmedName })
    : t("recoveryCardTellSenderGeneric");
  const tellSenderSentMessage = trimmedName
    ? t("recoveryCardTellSenderSent", { senderName: trimmedName })
    : t("recoveryCardTellSenderSentGeneric");

  const handleTellSender = async () => {
    if (!canReport) return;
    setReportState({ kind: "sending" });

    const response = await transferApi.reportDownloadFailure(shortCode, {
      recipientEmail: trimmedEmail,
      errorCode: scenario,
      errorContext: errorContext
        ? {
            httpStatus: errorContext.httpStatus,
            jsErrorMessage: errorContext.jsErrorMessage,
            fileCount: errorContext.fileCount,
            transferSizeBytes: errorContext.transferSizeBytes,
          }
        : undefined,
    });

    if (!response.error && response.data?.success) {
      try {
        sessionStorage.setItem(sentStorageKey, String(Date.now()));
        sessionStorage.removeItem(rateLimitStorageKey);
      } catch {
        // Non-critical — confirmation won't persist across reload
      }
      setReportState({ kind: "sent" });
      return;
    }

    const errorCode = (response.error as { code?: string } | undefined)?.code;
    if (
      response.status === 429 ||
      errorCode === "DOWNLOAD_FAILED_REPORT_RATE_LIMITED"
    ) {
      try {
        sessionStorage.setItem(rateLimitStorageKey, String(Date.now()));
      } catch {
        // Non-critical
      }
      setReportState({ kind: "rate-limited" });
      return;
    }

    setReportState({ kind: "error" });
  };

  const handleRetryClick = () => {
    trackEvent(AnalyticsEventType.DOWNLOAD_RETRY_CLICKED, {
      short_code: shortCode,
      attempt_number: attemptNumber + 1,
      scenario,
    });
    onRetry();
  };

  const handleFallbackClick = () => {
    trackEvent(AnalyticsEventType.DOWNLOAD_FALLBACK_MODE_ENTERED, {
      short_code: shortCode,
      scenario,
    });
    onEnterFallback();
  };

  const reportReady = reportState.kind === "idle" || reportState.kind === "error";
  const tellSenderButtonLabel = (() => {
    if (reportState.kind === "sending") return t("recoveryCardTellSenderSending");
    return tellSenderLabel;
  })();

  const primaryBtnClass =
    "px-4 py-2.5 bg-[#87E64B] text-[#171717] text-sm font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryBtnClass =
    "px-4 py-2.5 border border-gray-300 dark:border-[oklch(0.35_0_0)] text-[#171717] dark:text-[oklch(0.85_0_0)] text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-[oklch(0.26_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const tertiaryBtnClass =
    "px-4 py-2.5 text-sm text-[#5E53E0] dark:text-[oklch(0.72_0.18_280)] hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div
      role="region"
      aria-label={t("recoveryCardTitle")}
      className="relative mt-4 rounded border border-gray-200 dark:border-[oklch(0.30_0_0)] bg-[#FDF8F0] dark:bg-[oklch(0.22_0_0)] p-4 text-left"
      data-testid="download-recovery-card"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("recoveryCardDismiss")}
        className="absolute top-2 right-2 p-1 text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.85_0_0)] transition-colors"
      >
        <Xmark className="w-4 h-4" aria-hidden="true" />
      </button>

      <h2 className="pr-8 text-base font-semibold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
        {t("recoveryCardTitle")}
      </h2>
      <p className="text-sm text-gray-700 dark:text-[oklch(0.75_0_0)] mb-4 leading-relaxed">
        {body}
      </p>

      {reportState.kind === "sent" && (
        <div
          role="status"
          className="mb-3 text-sm text-[#171717] dark:text-[oklch(0.85_0_0)] font-medium"
        >
          {tellSenderSentMessage}
        </div>
      )}
      {reportState.kind === "rate-limited" && (
        <div
          role="status"
          className="mb-3 text-sm text-[#171717] dark:text-[oklch(0.85_0_0)]"
        >
          {t("recoveryCardTellSenderRateLimited")}
        </div>
      )}
      {reportState.kind === "error" && (
        <div role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
          {t("recoveryCardTellSenderError")}
        </div>
      )}
      {reportReady && !canReport && (
        <div
          role="status"
          className="mb-3 text-xs text-gray-600 dark:text-[oklch(0.65_0_0)]"
        >
          {t("recoveryCardTellSenderNoEmail")}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        {/* Button ordering flips when scenario is ZIP or we're stuck */}
        {isStuck ? (
          <>
            <button
              type="button"
              onClick={handleTellSender}
              disabled={
                reportState.kind === "sending" ||
                reportState.kind === "sent" ||
                reportState.kind === "rate-limited" ||
                !canReport
              }
              className={primaryBtnClass}
              data-testid="recovery-card-tell-sender"
            >
              {tellSenderButtonLabel}
            </button>
            <button
              type="button"
              onClick={handleRetryClick}
              disabled={isRetrying}
              className={secondaryBtnClass}
              data-testid="recovery-card-retry"
            >
              {isRetrying ? t("recoveryCardRetrying") : t("recoveryCardRetry")}
            </button>
            <button
              type="button"
              onClick={handleFallbackClick}
              className={tertiaryBtnClass}
              data-testid="recovery-card-fallback"
            >
              {t("recoveryCardFallback")}
            </button>
          </>
        ) : promoteFallback ? (
          <>
            <button
              type="button"
              onClick={handleFallbackClick}
              className={primaryBtnClass}
              data-testid="recovery-card-fallback"
            >
              {t("recoveryCardFallback")}
            </button>
            <button
              type="button"
              onClick={handleRetryClick}
              disabled={isRetrying}
              className={secondaryBtnClass}
              data-testid="recovery-card-retry"
            >
              {isRetrying ? t("recoveryCardRetrying") : t("recoveryCardRetry")}
            </button>
            {reportState.kind !== "sent" && reportState.kind !== "rate-limited" && (
              <button
                type="button"
                onClick={handleTellSender}
                disabled={reportState.kind === "sending" || !canReport}
                className={tertiaryBtnClass}
                data-testid="recovery-card-tell-sender"
              >
                {tellSenderButtonLabel}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleRetryClick}
              disabled={isRetrying}
              className={primaryBtnClass}
              data-testid="recovery-card-retry"
            >
              {isRetrying ? t("recoveryCardRetrying") : t("recoveryCardRetry")}
            </button>
            <button
              type="button"
              onClick={handleFallbackClick}
              className={secondaryBtnClass}
              data-testid="recovery-card-fallback"
            >
              {t("recoveryCardFallback")}
            </button>
            {reportState.kind !== "sent" && reportState.kind !== "rate-limited" && (
              <button
                type="button"
                onClick={handleTellSender}
                disabled={reportState.kind === "sending" || !canReport}
                className={tertiaryBtnClass}
                data-testid="recovery-card-tell-sender"
              >
                {tellSenderButtonLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Classify a download failure into a scenario for UI + telemetry routing.
 * Keep this side-effect free so callers can unit-test their error handling
 * without touching the DOM.
 */
export function classifyDownloadFailure(
  err: unknown,
  response?: { status?: number } | null,
): DownloadFailureScenario {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "network";
  }
  if (err instanceof TypeError) return "network"; // fetch threw (usually network)
  if (response?.status && response.status >= 500) return "server";
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err ?? "").toLowerCase();
  if (msg.includes("zip") || msg.includes("stream")) return "zip";
  return "generic";
}
