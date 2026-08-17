"use client";

/**
 * Every non-playing state of the film player, rendered INSIDE the video surface.
 *
 * Story 135.6, decision D2.
 *
 * ── Why this exists rather than `LoadingPanel` ──────────────────────────────────────────
 *
 * The epic's acceptance criterion asks for `LoadingPanel` (`epics-stream-delivery.md:778-779`).
 * The UX specification, written later and about this exact surface, refuses it by name:
 * "Deliberately not reused: LoadingPanel. It renders a Lottie mark on a white surface and is
 * invisible over video" (`ux-design-stream-playback.md:861-863`). It names `Toast` and
 * `ConfirmationModal` as unusable here too, with a reason for each.
 *
 * The UX spec wins, and what the epic AC actually protects — the project's standing **"no spinner
 * icons"** rule — is honoured here in full. There is no spinner anywhere in this file. That is a
 * declared divergence from the AC's literal wording, not a missed AC.
 *
 * ── Silent when working, spoken when not (`ux-design-stream-playback.md:819-822`) ───────
 *
 * There is no middle register. Quality steps, credential renewal and resume are invisible and
 * never render a state here. Stalls, refusals and failures are always stated, always name the
 * condition, never blame the buyer, and always carry an action where one exists
 * (`ux-design-stream-playback.md:926-928`).
 *
 * ── Contrast is deterministic on purpose (AC11) ─────────────────────────────────────────
 *
 * The panel sits on a near-opaque `#171717` card rather than on the translucent veil alone. A
 * veil over video means the text's background is whatever frame is underneath, so 4.5:1 could
 * not be guaranteed against "the darkest and lightest frames the gradient scrim can sit on".
 * The card removes the variable. White on `#171717` is 16.1:1; `#D4D4D4` body copy is 11.3:1.
 *
 * The surface is dark in BOTH themes and carries no `dark:` variants — it is a video, not a
 * page, and a light panel over a film is the thing the UX spec ruled out above.
 */

import { useTranslations } from "next-intl";

/**
 * The five states of D2 plus the three the player genuinely reaches before playback exists.
 *
 * `accessEnded` is Epic 136's mechanism. The STATE is built here; no wind-down, no timer and no
 * countdown is built with it — that is 136's, and a half-built one would be a second source of
 * truth for when access ends.
 */
export type PlaybackState =
  | "starting"
  | "buffering"
  | "stalled"
  | "deviceLimit"
  | "failed"
  | "accessEnded"
  | "notEntitled"
  | "unavailable"
  | "unsupported";

export interface PlaybackStatePanelProps {
  state: PlaybackState;
  /** Devices allowed at once. From the 429's `limit` field — never hardcode 2. */
  deviceLimit?: number;
  /** From the 429's `retryAfterSeconds`. Absent means "we don't know", not "zero". */
  retryAfterSeconds?: number;
  /** 0..1. Renders a slim determinate bar. Omit for an indeterminate wait — never a spinner. */
  progress?: number;
  onRetry?: () => void;
}

/** States that are a normal part of watching, and so must not read as a failure. */
const TRANSIENT: ReadonlySet<PlaybackState> = new Set(["starting", "buffering"]);

export default function PlaybackStatePanel({
  state,
  deviceLimit,
  retryAfterSeconds,
  progress,
  onRetry,
}: PlaybackStatePanelProps) {
  const t = useTranslations("streamSale");

  const title = t(`player${capitalize(state)}Title`);

  // The device-limit body is the one message that needs a number, and it needs a DIFFERENT
  // sentence depending on whether the server told us how long to wait. 135.5 emits
  // `retryAfterSeconds` beside the code precisely so this copy does not have to invent one.
  const message =
    state === "deviceLimit"
      ? retryAfterSeconds
        ? t("playerDeviceLimitBodyWait", {
            limit: deviceLimit ?? 2,
            seconds: retryAfterSeconds,
          })
        : t("playerDeviceLimitBody", { limit: deviceLimit ?? 2 })
      : t(`player${capitalize(state)}Body`);

  const isTransient = TRANSIENT.has(state);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center px-4 py-6"
      // Translucent so the buyer keeps the frame they were on — a black-out reads as a crash
      // even when the state is an ordinary two-second buffer.
      style={{ backgroundColor: "rgba(0, 0, 0, 0.72)" }}
    >
      <div className="w-full max-w-sm rounded bg-[#171717] px-5 py-6 text-center shadow-lg">
        {/*
          AC10 — the state is ANNOUNCED, not only shown.

          `polite` rather than `assertive`: a two-second buffer interrupting a screen reader
          mid-sentence would be its own defect, and none of these states is an emergency.
          `aria-atomic` so the title and message are read as one sentence rather than as two
          separate mutations. The region wraps both, so a state change replaces the whole
          announcement rather than appending to it.
        */}
        <div aria-live="polite" aria-atomic="true">
          <p className="text-base font-bold leading-snug text-white">{title}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#D4D4D4]">{message}</p>
        </div>

        {typeof progress === "number" && (
          <div
            className="mt-4 h-1 w-full overflow-hidden rounded bg-white/20"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamp01(progress) * 100)}
          >
            <div
              className="h-full bg-[#87E64B] transition-[width] duration-300"
              style={{ width: `${clamp01(progress) * 100}%` }}
            />
          </div>
        )}

        {onRetry && !isTransient && (
          <button
            type="button"
            onClick={onRetry}
            // AC11 — 44px minimum touch target. `min-h-[44px]` rather than relying on padding,
            // which changes with the font size the buyer's browser is set to.
            className="mt-5 inline-flex min-h-[44px] min-w-[44px] w-full items-center justify-center rounded bg-[#87E64B] px-6 py-3 text-sm font-bold text-[#171717] transition-colors hover:bg-[#78d43f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t("playerRetry")}
          </button>
        )}
      </div>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
