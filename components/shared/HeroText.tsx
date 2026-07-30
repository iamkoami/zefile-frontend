"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CreatorsTrustStrip from "@/components/shared/CreatorsTrustStrip";

export type HeroAlign = "center" | "left";

interface HeroTextProps {
  isVisible: boolean;
  timeOfDay?: "day" | "evening" | "night";
  isHydrated?: boolean;
  isAuthenticated?: boolean;
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
  /**
   * Reserve a right-hand gutter on 2xl screens so the headline stops before the
   * home page's HeroProcessLoop card. Off by default — the downloads and review
   * pages have no card there and want the full width.
   */
  reserveRightGutter?: boolean;
  /**
   * Override the headline and subtitle. Without it the component speaks to the
   * creator, from the `hero` namespace. The download page passes buyer-facing
   * copy instead — the person reading it there isn't selling anything.
   */
  copy?: { line1: string; line2?: string; subtitle: string };
  /**
   * Replaces the default "Get Started - it's free" signup label. Used by the
   * transfer landing page's error state, where the card already owns a
   * "Share your art" CTA and a second identical one would just be noise.
   */
  ctaLabel?: string;
  /**
   * Hero composition.
   *
   * Currently defaults to `left` while the left-rail variant is being evaluated
   * on the running app — see
   * `_bmad-output/planning-artifacts/ux-hero-alignment-preference-test.md`.
   * Revert this default to `center` if the creator preference test does not
   * clear the bar defined there.
   *
   * `left` is the "left rail" variant under evaluation: the trust strip,
   * headline, subtitle and CTA all start on one shared x-axis, and the subtitle
   * measure is capped so the ragged right edge stays tight instead of running
   * into the HeroProcessLoop card.
   *
   * Overridable per-visit with `?hero=left` / `?hero=center` so both versions
   * can be captured at each breakpoint for the creator preference test, and so
   * the control stays reachable while `left` is the default. The override is
   * read after mount, which is safe here because nothing renders before
   * `isHydrated`.
   *
   * The column insets are deliberately NOT part of this variant — they are
   * coupled to the HeroProcessLoop sheet scale (see the note on its wrapper),
   * so moving them is a separate change with its own reasoning.
   */
  align?: HeroAlign;
}

/**
 * HeroText - Marketing headline displayed on the home page
 * Centered in the right portion of the content panel, visible only on desktop
 */
const HeroText: React.FC<HeroTextProps> = ({
  isVisible,
  timeOfDay = "evening",
  isHydrated = true,
  isAuthenticated = false,
  showUpgradeCta = false,
  onUpgradeClick,
  reserveRightGutter = false,
  copy,
  ctaLabel,
  align = "left",
}) => {
  const t = useTranslations("hero");
  const tHeader = useTranslations("header");

  // `?hero=left|center` override for the preference test. Read from
  // window.location rather than useSearchParams so this component never forces
  // a CSR bailout on the statically-rendered pages that mount it.
  const [overrideAlign, setOverrideAlign] = useState<HeroAlign | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("hero");
    if (value === "left" || value === "center") setOverrideAlign(value);
  }, []);

  // Don't render until hydrated to prevent color flash (SSR starts as "day",
  // then switches to actual time — the 1.5s color transition makes this visible)
  if (!isVisible || !isHydrated) return null;

  const isLeft = (overrideAlign ?? align) === "left";

  // Adjust text colors based on time of day
  const textColors = {
    day: {
      title: "text-[#171717] dark:text-white",
      subtitle: "text-[#4B5563] dark:text-gray-300",
    },
    evening: {
      title: "text-[#171717] dark:text-white",
      subtitle: "text-[#4B5563] dark:text-gray-300",
    },
    night: {
      title: "text-white",
      subtitle: "text-white",
    },
  };

  const colors = textColors[timeOfDay];

  return (
    <div
      className={`hidden lg:flex flex-col justify-center pointer-events-none select-none left-[180px] right-8 ${
        // Left rail pushes the whole text block to the END of the band so it
        // groups with the HeroProcessLoop card instead of the upload widget.
        // The rail itself is preserved by the shrink-wrapped inner wrapper
        // below — aligning the children directly would ragged their left edges.
        isLeft ? "items-end" : "items-center"
      } ${
        // Built-in lg/xl/2xl only. Mixing these with arbitrary min-[…] variants
        // is a trap: at 1280 both lg: and min-[1200px]: match and the cascade
        // order between them is not guaranteed, so the wrong inset can win.
        reserveRightGutter
          ? "lg:left-[24rem] lg:right-[18rem] xl:right-[22rem] 2xl:left-[26rem] 2xl:right-[25rem]"
          : ""
      }`}
      style={{
        position: "absolute",
        top: "42%",
        transform: "translateY(-50%)",
        transition: "opacity 500ms ease-in-out, color 1.5s ease-in-out",
        zIndex: 5,
        textAlign: isLeft ? "left" : "center",
      }}
    >
      {/*
        Rail wrapper. In left mode it shrink-wraps to whichever child is widest
        and the parent's `items-end` slides it against the band's right edge —
        so the block sits ~33px from the process-loop card and well clear of the
        upload widget, while every child still starts on one shared x.

        Which child is widest is language-dependent and not worth pinning: at
        text-3xl the French headline (548px) wins, while the English one (473px)
        loses to the subtitle (504px). Either way the wrapper hugs the band's
        right edge; only the rail's x moves.

        In centre mode it is `w-full`, which is a no-op: the children centre
        inside the full band exactly as before.
      */}
      <div
        className={`flex flex-col ${isLeft ? "items-start" : "w-full items-center"}`}
      >
        {/* Creators trust strip — overlapping avatars + social proof text */}
        <div className="mb-5 animate-[fadeIn_1s_ease-in-out_0.5s_both]">
          <CreatorsTrustStrip timeOfDay={timeOfDay} align={isLeft ? "left" : "center"} />
        </div>

      {/* Title — visual duplicate; the semantic <h1> is server-rendered in app/page.tsx */}
      <div
        aria-hidden="true"
        className={`text-3xl font-black leading-tight mb-3 ${colors.title}`}
        style={{
          animation: "slideUp 0.6s ease-out 0.5s both",
          transition: "color 1.5s ease-in-out",
        }}
      >
        <div>{copy ? copy.line1 : t("titleLine1")}</div>
        {copy
          ? copy.line2 && <div>{copy.line2}</div>
          : t("titleLine2") && <div>{t("titleLine2")}</div>}
      </div>

      {/* Subtitle */}
      <div
        // Left rail caps the measure so the subtitle's ragged right edge stops
        // short of the HeroProcessLoop card instead of colliding with it.
        // `max-w-xl` (36rem) and not something tighter: the French subtitle
        // needs 467px on one line and the English one ~511px, so a 28rem cap
        // orphaned the last word ("virement.") on its own line. 36rem clears
        // both languages and still leaves ~144px of gutter at 1512.
        className={`text-base xl:text-base font-bold leading-relaxed ${
          isLeft ? "max-w-xl" : "max-w-2xl"
        } ${colors.subtitle}`}
        style={{
          animation: "fadeIn 0.8s ease-out 0.8s both",
          transition: "color 1.5s ease-in-out",
        }}
      >
        <p>{copy ? copy.subtitle : t("subtitle")}</p>
        {!copy && t("subtitle2") && <p>{t("subtitle2")}</p>}
      </div>

      {/* Get Started CTA - for unauthenticated users (matches header CTA) */}
      {!isAuthenticated && (
        <div
          className={`flex flex-col mt-8 animate-[fadeIn_1s_ease-in-out_2s_both] ${
            isLeft ? "items-start" : "items-center"
          }`}
        >
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-auth-panel"));
            }}
            className="pointer-events-auto ze-button-primary"
          >
            {ctaLabel ? (
              <span className="font-bold">{ctaLabel}</span>
            ) : (
              <>
                <span className="font-bold">{tHeader("signupBold")}</span>
                &nbsp;-&nbsp;{tHeader("signupSuffix")}
              </>
            )}
          </button>
        </div>
      )}

      {/* Upgrade CTA - for authenticated free-tier users */}
      {isAuthenticated && showUpgradeCta && onUpgradeClick && (
        <div
          className={`flex flex-col mt-6 animate-[fadeIn_1s_ease-in-out_3s_both] ${
            isLeft ? "items-start" : "items-center"
          }`}
        >
          <p
            className={`text-sm font-medium mb-3 ${colors.subtitle}`}
            style={{ transition: "color 1.5s ease-in-out" }}
          >
            {t("ctaText")}
          </p>
          <button
            onClick={onUpgradeClick}
            className="pointer-events-auto bg-[#87E64B] text-[#171717] rounded px-6 py-2.5 font-bold text-sm hover:bg-[#78d43f] transition-colors"
          >
            {t("ctaButton")}
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default HeroText;
