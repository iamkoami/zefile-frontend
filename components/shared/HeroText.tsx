"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface HeroTextProps {
  isVisible: boolean;
  timeOfDay?: "day" | "evening" | "night";
}

/**
 * HeroText - Marketing headline displayed on the home page
 * Positioned on the left side, visible only in initial state
 */
const HeroText: React.FC<HeroTextProps> = ({
  isVisible,
  timeOfDay = "evening",
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
        zIndex: 2,
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
        className={`text-lg xl:text-lg leading-relaxed ${colors.subtitle}`}
        style={{
          transition: "color 1.5s ease-in-out",
        }}
      >
        {t("subtitle")}
      </p>
    </div>
  );
};

export default HeroText;
