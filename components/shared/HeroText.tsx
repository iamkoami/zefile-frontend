"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface HeroTextProps {
  isVisible: boolean;
  timeOfDay?: "day" | "evening" | "night";
  showProofStats?: boolean;
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
}

/**
 * HeroText - Marketing headline displayed on the home page
 * Positioned on the right side, visible only on desktop
 */
const HeroText: React.FC<HeroTextProps> = ({
  isVisible,
  timeOfDay = "evening",
  showProofStats = false,
  showUpgradeCta = false,
  onUpgradeClick,
}) => {
  const t = useTranslations("hero");

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
      subtitle: "text-gray-300",
    },
  };

  const colors = textColors[timeOfDay];

  return (
    <div
      className="hidden lg:flex flex-col justify-center pointer-events-none select-none"
      style={{
        position: "absolute",
        right: "7rem",
        top: "4rem",
        transition: "opacity 500ms ease-in-out, color 1.5s ease-in-out",
        zIndex: 5,
        maxWidth: "600px",
        textAlign: "right",
      }}
    >
      {/* Title */}
      <h1
        className={`text-4xl xl:text-4xl font-bold leading-tight mb-4 ${colors.title}`}
        style={{
          transition: "color 1.5s ease-in-out",
        }}
      >
        {t("title")}
      </h1>

      {/* Subtitle */}
      <p
        className={`text-lg xl:text-lg font-medium leading-relaxed ${colors.subtitle}`}
        style={{
          transition: "color 1.5s ease-in-out",
        }}
      >
        {t("subtitle")}
      </p>

      {/* Social proof micro-bar */}
      {showProofStats && (
        <div className="flex items-center gap-3 mt-5 animate-[fadeIn_1s_ease-in-out_2s_both]">
          <span className="text-xs font-medium text-gray-500">
            {t("proofStat1")}
          </span>
          <span className="text-xs font-medium text-gray-600">|</span>
          <span className="text-xs font-medium text-gray-500">
            {t("proofStat2")}
          </span>
          <span className="text-xs font-medium text-gray-600">|</span>
          <span className="text-xs font-medium text-gray-500">
            {t("proofStat3")}
          </span>
        </div>
      )}

      {/* Upgrade CTA - right after stats */}
      {showUpgradeCta && onUpgradeClick && (
        <div className="flex flex-col items-end mt-6 animate-[fadeIn_1s_ease-in-out_3s_both]">
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
