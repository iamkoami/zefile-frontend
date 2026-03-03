"use client";

import React from "react";
import { useTranslations } from "next-intl";
import CreatorsTrustStrip from "@/components/shared/CreatorsTrustStrip";

interface HeroTextProps {
  isVisible: boolean;
  timeOfDay?: "day" | "evening" | "night";
  isAuthenticated?: boolean;
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * HeroText - Marketing headline displayed on the home page
 * Centered in the right portion of the content panel, visible only on desktop
 */
const HeroText: React.FC<HeroTextProps> = ({
  isVisible,
  timeOfDay = "evening",
  isAuthenticated = false,
  showUpgradeCta = false,
  onUpgradeClick,
}) => {
  const t = useTranslations("hero");
  const tHeader = useTranslations("header");

  if (!isVisible) return null;

  // Adjust text colors based on time of day
  const textColors = {
    day: {
      title: "text-[#171717]",
      subtitle: "text-[#4B5563]",
    },
    evening: {
      title: "text-[#171717]",
      subtitle: "text-[#4B5563]",
    },
    night: {
      title: "text-white",
      subtitle: "text-white",
    },
  };

  const colors = textColors[timeOfDay];

  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center pointer-events-none select-none"
      style={{
        position: "absolute",
        left: "180px",
        right: "2rem",
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
        className={`text-5xl font-black leading-tight mb-3 ${colors.title}`}
        style={{
          transition: "color 1.5s ease-in-out",
        }}
      >
        {t("title")}
      </div>

      {/* Subtitle */}
      <p
        className={`text-lg xl:text-lg font-bold leading-relaxed ${colors.subtitle}`}
        style={{
          transition: "color 1.5s ease-in-out",
        }}
      >
        {t("subtitle")}
      </p>

      {/* Get Started CTA - for unauthenticated users (matches header CTA) */}
      {!isAuthenticated && (
        <div className="flex flex-col items-center mt-8 animate-[fadeIn_1s_ease-in-out_2s_both]">
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-auth-panel"));
            }}
            className="pointer-events-auto ze-button-primary"
          >
            <span className="font-bold">{tHeader("signupBold")}</span>&nbsp;-&nbsp;{tHeader("signupSuffix")}
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
            className="pointer-events-auto bg-[#87E64B] text-[#171717] rounded px-6 py-2.5 font-semibold text-sm hover:bg-[#78d43f] transition-colors"
          >
            {t("ctaButton")}
          </button>
        </div>
      )}
    </div>
  );
};

export default HeroText;
