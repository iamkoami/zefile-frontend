"use client";

import React from "react";
import { useTranslations } from "next-intl";

interface FirstFreeBannerProps {
  variant?: "full" | "compact";
  className?: string;
}

const FirstFreeBanner: React.FC<FirstFreeBannerProps> = ({
  variant = "full",
  className = "",
}) => {
  const t = useTranslations("firstFree");

  if (variant === "compact") {
    return (
      <div
        className={`bg-[#87E64B]/10 dark:bg-[#87E64B]/15 border border-[#87E64B]/30 rounded px-3 py-2 ${className}`}
      >
        <p className="text-xs font-medium text-[#171717] dark:text-[#87E64B]">
          {t("compactMessage")}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-[#87E64B]/10 dark:bg-[#87E64B]/15 border border-[#87E64B]/30 rounded px-4 py-3 ${className}`}
    >
      <p className="text-sm font-medium text-[#171717] dark:text-[#87E64B]">{t("bannerTitle")}</p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t("bannerSubtitle")}</p>
    </div>
  );
};

export default FirstFreeBanner;
