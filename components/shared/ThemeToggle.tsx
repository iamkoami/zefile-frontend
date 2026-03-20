"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { SunLight, HalfMoon } from "iconoir-react";
import { useThemeStore } from "@/stores/theme-store";

const ThemeToggle = () => {
  const t = useTranslations("header");
  const { resolvedTheme, setTheme, darkModeDisabled } = useThemeStore();
  const [showTooltip, setShowTooltip] = useState(false);

  // Admin disabled dark mode globally — hide the toggle entirely
  if (darkModeDisabled) return null;

  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? HalfMoon : SunLight;
  const label = isDark ? t("themeDark") : t("themeLight");

  return (
    <div className="relative">
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        title={label}
        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E53E0] focus-visible:ring-offset-1"
        aria-label={label}
      >
        <Icon className="w-[18px] h-[18px]" />
      </button>

      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 px-2.5 py-1.5 text-xs text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded whitespace-nowrap z-50 pointer-events-none">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45" />
          {label}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
