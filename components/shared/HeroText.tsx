"use client";

import React from "react";
import { useTranslations } from "next-intl";
import CreatorsTrustStrip from "@/components/shared/CreatorsTrustStrip";

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
}) => {
  const t = useTranslations("hero");
  const tHeader = useTranslations("header");

  // Don't render until hydrated to prevent color flash (SSR starts as "day",
  // then switches to actual time — the 1.5s color transition makes this visible)
  if (!isVisible || !isHydrated) return null;

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
      className={`hidden lg:flex flex-col items-center justify-center pointer-events-none select-none left-[180px] right-8 ${
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
        textAlign: "center",
      }}
    >
      {/* Creators trust strip — overlapping avatars + social proof text */}
      <div className="mb-5 animate-[fadeIn_1s_ease-in-out_0.5s_both]">
        <CreatorsTrustStrip timeOfDay={timeOfDay} />
      </div>

      {/* Title — visual duplicate; the semantic <h1> is server-rendered in app/page.tsx */}
      <div
        aria-hidden="true"
        className={`text-4xl font-black leading-tight mb-3 ${colors.title}`}
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
        className={`text-lg xl:text-lg font-bold leading-relaxed max-w-2xl ${colors.subtitle}`}
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
        <div className="flex flex-col items-center mt-8 animate-[fadeIn_1s_ease-in-out_2s_both]">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-auth-panel"));
            }}
            className="pointer-events-auto ze-button-primary"
          >
            <span className="font-bold">{tHeader("signupBold")}</span>
            &nbsp;-&nbsp;{tHeader("signupSuffix")}
          </button>
        </div>
      )}

      {/* Upgrade CTA - for authenticated free-tier users */}
      {isAuthenticated && showUpgradeCta && onUpgradeClick && (
        <div className="flex flex-col items-center mt-6 animate-[fadeIn_1s_ease-in-out_3s_both]">
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
  );
};

export default HeroText;
