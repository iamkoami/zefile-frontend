"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { transferApi } from "@/services/transfer-api";
import { toast } from "@/components/shared/Toast";

interface PasswordHelpPanelProps {
  /** Transfer short code (without z- prefix) */
  shortCode: string;
  /** The email the recipient used to verify access; sent to the backend */
  recipientEmail: string;
  /** Sender's display name (from senderProfile.name); falls back to generic copy when absent */
  senderName?: string | null;
  /** Sender's email address for the "copy email" CTA */
  senderEmail?: string | null;
  /** How many wrong passwords the recipient tried before asking — used for analytics */
  failedAttemptsCount: number;
  /** Called when the user clicks "Never mind" to collapse the panel */
  onDismiss: () => void;
}

type PanelState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "rate-limited" }
  | { kind: "error" };

/**
 * Inline "Forgot the password?" help panel — Story 132.1.
 *
 * Design notes:
 * - Inline (not a modal) so the password input stays visible for retries.
 * - Persists the "sent" state for 5 minutes via sessionStorage to prevent
 *   double-sends if the recipient reopens the panel.
 * - Keeps "Copy sender's email" available after the rate limit or 5-min
 *   confirmation so users always have an escape hatch.
 */
export default function PasswordHelpPanel({
  shortCode,
  recipientEmail,
  senderName,
  senderEmail,
  failedAttemptsCount,
  onDismiss,
}: PasswordHelpPanelProps) {
  const t = useTranslations("transferLanding");
  const [state, setState] = useState<PanelState>({ kind: "idle" });

  const sentStorageKey = useMemo(
    () => `password-help-sent:${shortCode}`,
    [shortCode],
  );
  // M4 — also persist the "rate-limited" state so dismissing + reopening the
  // panel within the 30-minute window doesn't drop the user back to an
  // idle-looking "Send a request" button that will just 429 again.
  const rateLimitStorageKey = useMemo(
    () => `password-help-rate-limited:${shortCode}`,
    [shortCode],
  );

  // Hydrate persisted state from sessionStorage. "sent" has a 5-minute TTL;
  // "rate-limited" uses the backend's 30-minute window.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sentRaw = sessionStorage.getItem(sentStorageKey);
      if (sentRaw) {
        const sentAtMs = Number(sentRaw);
        if (Number.isFinite(sentAtMs) && Date.now() - sentAtMs < 5 * 60 * 1000) {
          setState({ kind: "sent" });
          return;
        }
        sessionStorage.removeItem(sentStorageKey);
      }

      const rateLimitRaw = sessionStorage.getItem(rateLimitStorageKey);
      if (rateLimitRaw) {
        const hitAtMs = Number(rateLimitRaw);
        if (Number.isFinite(hitAtMs) && Date.now() - hitAtMs < 30 * 60 * 1000) {
          setState({ kind: "rate-limited" });
          return;
        }
        sessionStorage.removeItem(rateLimitStorageKey);
      }
    } catch {
      // sessionStorage blocked — silently fall back to idle
    }
  }, [sentStorageKey, rateLimitStorageKey]);

  const trimmedName = senderName?.trim() || "";
  const trimmedRecipientEmail = recipientEmail?.trim() ?? "";
  const canSendRequest = trimmedRecipientEmail.length > 0;

  const handleSend = async () => {
    if (!canSendRequest) {
      // M3 — shouldn't get here since the button is disabled when email is
      // missing, but keep the guard as a safety net.
      toast.error(t("passwordHelpNoEmail"));
      return;
    }
    setState({ kind: "sending" });

    const response = await transferApi.requestPasswordHelp(
      shortCode,
      trimmedRecipientEmail,
      failedAttemptsCount,
    );

    if (!response.error && response.data?.success) {
      try {
        sessionStorage.setItem(sentStorageKey, String(Date.now()));
        sessionStorage.removeItem(rateLimitStorageKey);
      } catch {
        // Non-critical — confirmation won't persist across reload
      }
      setState({ kind: "sent" });
      return;
    }

    // Backend uses code: 'PASSWORD_HELP_RATE_LIMITED' on 429
    const errorCode = (response.error as { code?: string } | undefined)?.code;
    if (response.status === 429 || errorCode === "PASSWORD_HELP_RATE_LIMITED") {
      try {
        sessionStorage.setItem(rateLimitStorageKey, String(Date.now()));
      } catch {
        // Non-critical
      }
      setState({ kind: "rate-limited" });
      return;
    }

    setState({ kind: "error" });
  };

  const handleCopyEmail = async () => {
    if (!senderEmail) return;
    try {
      await navigator.clipboard.writeText(senderEmail);
      toast.success(t("passwordHelpEmailCopied"));
    } catch {
      toast.error(t("passwordHelpError"));
    }
  };

  const showCopyFallback =
    !!senderEmail && (state.kind === "sent" || state.kind === "rate-limited");

  return (
    <div
      role="region"
      aria-label={t("passwordHelpTitle")}
      className="mt-4 rounded border border-gray-200 dark:border-[oklch(0.30_0_0)] bg-[#FDF8F0] dark:bg-[oklch(0.22_0_0)] p-4 text-left"
      data-testid="password-help-panel"
    >
      <h2 className="text-base font-semibold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
        {t("passwordHelpTitle")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-[oklch(0.70_0_0)] mb-4 leading-relaxed">
        {trimmedName
          ? t("passwordHelpBody", { senderName: trimmedName })
          : t("passwordHelpBodyGeneric")}
      </p>

      {state.kind === "sent" && (
        <div
          role="status"
          className="mb-3 text-sm text-[#171717] dark:text-[oklch(0.85_0_0)] font-medium"
        >
          {trimmedName
            ? t("passwordHelpSent", { senderName: trimmedName })
            : t("passwordHelpSentGeneric")}
        </div>
      )}

      {state.kind === "rate-limited" && (
        <div
          role="status"
          className="mb-3 text-sm text-[#171717] dark:text-[oklch(0.85_0_0)]"
        >
          {t("passwordHelpRateLimited")}
        </div>
      )}

      {state.kind === "error" && (
        <div
          role="alert"
          className="mb-3 text-sm text-red-600 dark:text-red-400"
        >
          {t("passwordHelpError")}
        </div>
      )}

      {!canSendRequest && state.kind === "idle" && (
        <div
          role="status"
          className="mb-3 text-sm text-gray-600 dark:text-[oklch(0.70_0_0)]"
        >
          {t("passwordHelpNoEmail")}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {state.kind !== "sent" && state.kind !== "rate-limited" && (
          <button
            type="button"
            onClick={handleSend}
            disabled={state.kind === "sending" || !canSendRequest}
            className="flex-1 px-4 py-2.5 bg-[#87E64B] text-[#171717] text-sm font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.kind === "sending"
              ? t("passwordHelpSending")
              : t("passwordHelpSendRequest")}
          </button>
        )}

        {(showCopyFallback ||
          (state.kind !== "sent" && state.kind !== "rate-limited")) &&
          senderEmail && (
            <button
              type="button"
              onClick={handleCopyEmail}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-[oklch(0.35_0_0)] text-[#171717] dark:text-[oklch(0.85_0_0)] text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-[oklch(0.26_0_0)] transition-colors"
            >
              {t("passwordHelpCopyEmail")}
            </button>
          )}

        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2.5 text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.85_0_0)] transition-colors"
        >
          {t("passwordHelpDismiss")}
        </button>
      </div>
    </div>
  );
}
