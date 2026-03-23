"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

/** Must match backend PREDEFINED_SERVICES constant */
const PREDEFINED_SERVICES = [
  "graphic-design",
  "motion-design",
  "video-editing",
  "photography",
  "music-production",
  "audio-engineering",
  "web-development",
  "ui-ux-design",
  "illustration",
  "animation",
  "3d-modeling",
  "copywriting",
  "social-media-management",
  "consulting",
  "training",
] as const;

interface ServicesSelectorProps {
  selected: string[];
  onChange: (services: string[]) => void;
}

const ServicesSelector: React.FC<ServicesSelectorProps> = ({
  selected,
  onChange,
}) => {
  const t = useTranslations("profileSettings");
  const [otherText, setOtherText] = useState(() => {
    const otherEntry = selected.find(
      (s) => !PREDEFINED_SERVICES.includes(s as (typeof PREDEFINED_SERVICES)[number]),
    );
    return otherEntry || "";
  });
  const [otherActive, setOtherActive] = useState(() =>
    selected.some((s) => !PREDEFINED_SERVICES.includes(s as (typeof PREDEFINED_SERVICES)[number])),
  );

  const predefinedSelected = selected.filter((s) =>
    PREDEFINED_SERVICES.includes(s as (typeof PREDEFINED_SERVICES)[number]),
  );
  const hasOther = selected.some(
    (s) => !PREDEFINED_SERVICES.includes(s as (typeof PREDEFINED_SERVICES)[number]),
  );

  const toggleService = (service: string) => {
    const isSelected = predefinedSelected.includes(service);
    let next: string[];
    if (isSelected) {
      next = selected.filter((s) => s !== service);
    } else {
      if (selected.length >= 16) return;
      next = [...selected, service];
    }
    onChange(next);
  };

  const toggleOther = () => {
    if (hasOther) {
      // Remove the "other" entry
      onChange(predefinedSelected);
      setOtherText("");
      setOtherActive(false);
    } else {
      if (selected.length >= 16) return;
      setOtherActive(true);
      // Add entry if text already present, otherwise just show input
      if (otherText.trim()) {
        onChange([...selected, otherText.trim()]);
      }
    }
  };

  const handleOtherChange = (value: string) => {
    setOtherText(value);
    // Replace the current other entry with new text
    const withoutOther = selected.filter((s) =>
      PREDEFINED_SERVICES.includes(s as (typeof PREDEFINED_SERVICES)[number]),
    );
    if (value.trim()) {
      onChange([...withoutOther, value.trim()]);
    } else {
      onChange(withoutOther);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_SERVICES.map((service) => {
          const isSelected = predefinedSelected.includes(service);
          return (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                isSelected
                  ? "bg-[#87E64B]/10 border-[#87E64B] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
                  : "bg-white dark:bg-[oklch(0.22_0_0)] border-gray-200 dark:border-[oklch(0.30_0_0)] text-gray-600 dark:text-[oklch(0.75_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.50_0_0)]"
              }`}
            >
              {t(`service_${service.replace(/-/g, "_")}`)}
            </button>
          );
        })}

        {/* Other toggle */}
        <button
          type="button"
          onClick={toggleOther}
          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
            otherActive || hasOther
              ? "bg-[#87E64B]/10 border-[#87E64B] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
              : "bg-white dark:bg-[oklch(0.22_0_0)] border-gray-200 dark:border-[oklch(0.30_0_0)] text-gray-600 dark:text-[oklch(0.75_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.50_0_0)]"
          }`}
        >
          {t("service_other")}
        </button>
      </div>

      {/* Other text input */}
      {(otherActive || hasOther) && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => handleOtherChange(e.target.value)}
          placeholder={t("otherServicePlaceholder")}
          maxLength={100}
          className="mt-3 w-full max-w-sm border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-2.5 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
        />
      )}

      {selected.length >= 16 && (
        <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-2">
          {t("maxServices")}
        </p>
      )}
    </div>
  );
};

export default ServicesSelector;
