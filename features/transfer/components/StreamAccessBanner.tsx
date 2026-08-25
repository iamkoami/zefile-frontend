"use client";

// `iconoir-react` — the icon set this project uses everywhere. NOT `lucide-react`, which is
// not a dependency here.
import { Play } from "iconoir-react";
import { useLocale, useTranslations } from "next-intl";

import { toIntlLocale } from "@/lib/locale";

/**
 * Story 135.11 — what a buyer who ALREADY OWNS this film sees where the purchase action used to be.
 *
 * ── Why this component exists at all ─────────────────────────────────────────────────────
 *
 * The buyer journey flows surfaced a state no requirement had named: the return visit. Without a
 * dedicated surface it gets improvised into a 5,000-line page, and "I paid but it is asking me to
 * pay again" becomes the likely beta defect — which the UX specification calls the most damaging
 * one this feature could ship (`ux-design-stream-playback.md:929-937`).
 *
 * ── `role="status"`, NEVER `alert` ───────────────────────────────────────────────────────
 *
 * `ux-design-stream-playback.md:943-945` is explicit: this is standing information, not an
 * interruption. `alert` is assertive — it preempts whatever a screen-reader user is currently
 * hearing, to tell them something is fine. The emotional target on return is "recognised,
 * continuous" (`:214`, `:242`), and an interruption is the opposite of continuous.
 *
 * ── The copy rule, which is the whole point ──────────────────────────────────────────────
 *
 * No purchase verb, in either language: no buy / purchase / pay / acheter / payer / achat, no
 * "again" / "à nouveau", and NO CURRENCY AMOUNT anywhere (AC7). None of the `publicSale` strings
 * may be reused here — `buyAgain`, `alreadyBought`, `verifyAndDownload` and `noCharge` all belong
 * to the download recovery flow and three of the four say the wrong thing to someone who has
 * already paid. The page has refused that reuse once before, deliberately.
 *
 * ── Where the dates are, and are not (D7) ────────────────────────────────────────────────
 *
 * The `active` state states duration IN WORDS and carries no date, because a healthy stream film
 * has no end date to state: stream transfers are exempt from date expiry at the finder
 * (`stream-eligibility.service.ts` `expiryEligibilityWhere()`), and the shipped terms line already
 * promises the opposite of a date — "your access stays for as long as the film is published".
 * Printing `transfer.expireAt` here would contradict a promise this feature already made in
 * production. That column is set on the row and is meaningless for a film.
 *
 * Only `expiring` and `ended` carry a date, and it comes from `entitlement_revoked_at` — a column
 * nothing writes until story 136.4.
 */
export type StreamAccessBannerState = "active" | "expiring" | "ended";

export interface StreamAccessBannerProps {
  state: StreamAccessBannerState;
  /**
   * When access ends, or ended. Required for `expiring` and `ended`, ignored for `active`.
   *
   * Never `transfer.expireAt` — see the note above.
   */
  endsAt?: string | Date | null;
  /**
   * Start watching. Omitted entirely for `ended`, where there is nothing to play.
   *
   * The player is mounted by the page, not by this component: `StreamPlayer` opens a playback
   * session and holds a device lease, and a banner is not the thing that should own either.
   */
  onWatch?: () => void;
}

export default function StreamAccessBanner({
  state,
  endsAt,
  onWatch,
}: StreamAccessBannerProps) {
  const t = useTranslations("streamSale");
  const locale = useLocale();

  const formattedDate = endsAt
    ? new Date(endsAt).toLocaleDateString(toIntlLocale(locale), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const title =
    state === "active"
      ? t("accessActiveTitle")
      : state === "expiring"
        ? t("accessExpiringTitle")
        : t("accessEndedTitle");

  const body =
    state === "active"
      ? t("accessActiveBody")
      : state === "expiring"
        ? t("accessExpiringBody", { date: formattedDate })
        : t("accessEndedBody", { date: formattedDate });

  return (
    <div
      // `role="status"` carries an implicit `aria-live="polite"`, which is the announcement
      // behaviour this needs. It is NOT `alert`; see the note at the top of this file.
      role="status"
      aria-label={t("accessBannerLabel")}
      // `#FDFAF4` is the established beige surface (the terms block above uses the same pair), and
      // `rounded` is the project's 4px radius — never `rounded-lg` or `rounded-full`.
      className="w-full bg-[#FDFAF4] dark:bg-[oklch(0.22_0_0)] rounded p-5 mb-4"
    >
      <p className="text-sm font-semibold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
        {title}
      </p>
      {/*
        MEASURED IN A BROWSER, not estimated (AC8). Resolving each colour through a canvas — string
        -parsing an `oklch()` silently yields nonsense — the body line scores 7.25:1 on `#FDFAF4`
        in light and 5.33:1 on `oklch(0.22 0 0)` in dark; the title scores 17.21:1 and 13.17:1.
        All clear the 4.5:1 floor.

        `text-gray-400`, which this page uses for de-emphasised captions elsewhere, does NOT clear
        it on this surface. Do not "match" the surrounding captions here.
      */}
      <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)] leading-relaxed">
        {body}
      </p>

      {onWatch && (
        // A real <button>, so Tab reaches it and both Enter and Space activate it with no
        // key handling of our own. `min-h-[44px]` is the touch-target floor; the horizontal
        // padding clears 44px well before any label this short.
        <button
          type="button"
          onClick={onWatch}
          className="mt-4 min-h-[44px] px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E53E0] focus-visible:ring-offset-2 transition-colors flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" aria-hidden="true" />
          {t("accessWatch")}
        </button>
      )}
    </div>
  );
}
