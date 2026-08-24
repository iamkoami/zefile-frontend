"use client";

/**
 * StreamWatermarkOverlay — the buyer's identity, on the film, for the whole film (story 135.7).
 *
 * ── WHAT MOUNTS THIS ──────────────────────────────────────────────────────────────────────────
 * `StreamPlayer` only, into its `data-slot="stream-watermark"` element, which sits INSIDE the
 * container fullscreen is requested on so the mark survives entering fullscreen (AC7).
 *
 * It must never be mounted anywhere else. In particular it must NOT be mounted on the free
 * trailer (AC8): a signed-out visitor has no identity, and the trailer already carries the
 * server-side ZeFile watermark. `grep -rn "StreamWatermarkOverlay"` is expected to return exactly
 * one render site plus one barrel export.
 *
 * ── WHAT IT DELIBERATELY IS NOT ───────────────────────────────────────────────────────────────
 * A DOM overlay, and nothing more. P9 and `ux-design-stream-playback.md:585-587` PROHIBIT
 * server-side burn-in and per-frame pixel sampling: no drawing surface, no frame inspection, no
 * per-buyer re-encoding, no new packaging variant, no backend route. If someone asks for "a
 * stronger watermark", the answer is a different epic — not a sampling loop on the main thread.
 *
 * (The prohibited APIs are deliberately NOT named in this file. AC5 proves the prohibition by
 * grepping for them, and a comment mentioning them would make that grep match forever — a check
 * that cannot come back clean is not a check.)
 *
 * D8 also makes this defeatable by a determined recorder, and that is accepted. The point is
 * attribution and deterrence, not prevention.
 *
 * ── WHY THERE ARE NO `dark:` VARIANTS (D8) ────────────────────────────────────────────────────
 * This sits over VIDEO, not over the page theme. Its contrast arithmetic is against the frame
 * underneath, which the theme knows nothing about. A `dark:` variant cannot improve the figure in
 * AC4 and can only break it — the scrim is what guarantees contrast over an arbitrary frame, so
 * changing either colour by theme changes the one number the AC pins down. Do not add one.
 */

import { useMemo } from "react";

/** AC3/D5: at least four distinct positions, every 30 seconds of PLAYBACK. */
const POSITION_INTERVAL_SECONDS = 30;

/**
 * The four corners, in a fixed order — deterministic, not random (D5).
 *
 * A reviewer can predict the next corner and check it, and randomness buys nothing against a
 * cropper who has to sacrifice all four corners either way.
 *
 * ⚠ The insets are not decorative. The bottom two clear the browser's native transport controls
 * (D7 of 135.6 made those the buyer's only controls), and all four sit far enough in to survive
 * letterboxing — a mark in the black bar above or below the picture is not on the film at all, so
 * it would be cropped for free (Finding 7).
 */
const CORNERS = [
  "top-6 left-6",
  "top-6 right-6",
  "bottom-20 right-6",
  "bottom-20 left-6",
] as const;

export interface StreamWatermarkOverlayProps {
  /**
   * The buyer's email, ALREADY RESOLVED FROM THE SERVER by the parent (D2, D3, AC2).
   *
   * This component does no fetching, on purpose: a dumb overlay is inspectable by eye, while one
   * that fetches acquires a loading state, an error state, and a reason to be mounted before it is
   * entitled to be. Required rather than optional so "no identity" cannot silently render an empty
   * mark over a playing film — the state SD-FR8 exists to prevent.
   *
   * It must never come from the browser's own stored copy of the user. AC2's tamper test
   * overwrites that stored email, reloads, and requires this mark to be UNCHANGED — so the parent
   * calls the server directly. (The stored-user accessor is deliberately not named here: AC2
   * proves this by grepping for it, and a comment would make that grep match forever.)
   */
  email: string;
  /** Playback position in seconds, from the parent's `timeupdate`. Drives the corner cycle. */
  playbackSeconds: number;
}

/**
 * Masks the local part while keeping the mark identifying (PO decision, 2026-08-24).
 *
 * The mark is DISPLAYED, so it can be photographed or shoulder-surfed. Enterprise forensic
 * watermarking minimises what it displays while keeping enough to attribute a leak: first and last
 * character of the local part, the length hidden behind a fixed-width mask, and the full domain.
 * Matched against the sale record that is unambiguous; harvested from a screenshot it is not a
 * usable address.
 *
 * A fixed-width mask rather than one bullet per character is deliberate — the length of someone's
 * email address is itself a hint, and a variable-width mark would also change size as it cycles
 * corners, which draws the eye the UX doc asks this not to draw.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  // Not an address we can reason about — mask the whole thing rather than leak an unparsed string.
  if (at <= 0) return "•••••";

  const local = email.slice(0, at);
  const domain = email.slice(at); // includes the '@'

  if (local.length <= 2) return `${local.slice(0, 1)}••••${domain}`;
  return `${local.slice(0, 1)}••••${local.slice(-1)}${domain}`;
}

export default function StreamWatermarkOverlay({
  email,
  playbackSeconds,
}: StreamWatermarkOverlayProps) {
  const masked = useMemo(() => maskEmail(email), [email]);

  /**
   * The corner index is derived from playback position, not accumulated in a timer.
   *
   * That means a seek lands on the corner that position deserves, a pause simply stops advancing
   * because `playbackSeconds` stops changing (D5), and restarting from the beginning resets to the
   * first corner for free. A wall-clock interval would burn through positions behind a paused film,
   * which is the one behaviour D5 explicitly forbids.
   */
  const index =
    Math.floor(Math.max(0, playbackSeconds) / POSITION_INTERVAL_SECONDS) % CORNERS.length;

  // AC1 — present in the FIRST frame. There is nothing to arrange for that: the mark renders on
  // the first commit because it has no mount effect, no fade-in and no loading state. That is a
  // consequence of D3 (a dumb component that only renders a prop), not something added on top.

  return (
    <div
      // `pointer-events-none` on the wrapper AND inherited by the card: the overlay must never
      // intercept play, pause, seek, volume or fullscreen, including when it sits directly over a
      // control (AC6, Finding 4). `select-none` so a viewer cannot drag-select the address out.
      className="pointer-events-none absolute inset-0 select-none"
      // AC6 + cross-cutting a11y: the overlay introduces nothing to tab to and must not disturb
      // the player's own tab order. `aria-hidden` also keeps a screen reader from reading a
      // masked address aloud every time the corner changes, which would be noise, not information.
      aria-hidden="true"
      data-testid="stream-watermark-overlay"
    >
      <div
        // NO TRANSITION, AND THAT IS DELIBERATE (D5). This is a position change, not a movement.
        // A mark sliding across a film is precisely the "drawing the eye it is meant to avoid"
        // failure the UX doc rejects adaptive sampling for. Do not add `transition-*` here; the
        // `prefers-reduced-motion` precedent elsewhere in this codebase is not needed for the same
        // reason — there is no motion to reduce.
        className={`absolute ${CORNERS[index]} rounded px-2 py-1`}
        style={{
          // 55%, not 50% — AC4 pins this number. White on this scrim measures ~4.76:1 over a fully
          // WHITE frame (the worst case) and ~21:1 over a fully black one. At 50% the white-frame
          // figure falls to ~3.98:1 and fails the 4.5:1 requirement. This is the value the story
          // says is most likely to be waved through, so it is written as a literal with its
          // arithmetic attached rather than as a Tailwind opacity class someone can round off.
          backgroundColor: "rgba(0, 0, 0, 0.55)",
        }}
      >
        <span className="text-xs font-medium leading-none text-white">{masked}</span>
      </div>
    </div>
  );
}
