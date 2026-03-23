"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash } from "iconoir-react";
import type { SocialLink, SocialPlatform } from "@/services/creators-api";

/** Platform values — labels resolved via i18n at render time */
const SOCIAL_PLATFORM_VALUES: SocialPlatform[] = [
  "website", "instagram", "twitter", "youtube", "tiktok", "linkedin",
  "behance", "dribbble", "soundcloud", "spotify", "facebook", "pinterest",
];

interface SocialLinksEditorProps {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}

const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({
  links,
  onChange,
}) => {
  const t = useTranslations("profileSettings");
  const [platform, setPlatform] = useState<SocialPlatform | "">("");
  const [url, setUrl] = useState("");

  const usedPlatforms = new Set(links.map((l) => l.platform));
  const availablePlatforms = SOCIAL_PLATFORM_VALUES.filter(
    (p) => !usedPlatforms.has(p),
  );

  const handleAdd = () => {
    if (!platform || !url.trim()) return;
    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith("https://")) return;

    onChange([...links, { platform: platform as SocialPlatform, url: trimmedUrl }]);
    setPlatform("");
    setUrl("");
  };

  const handleRemove = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2 mb-4">
          {links.map((link, index) => (
              <div
                key={`${link.platform}-${index}`}
                className="flex items-center justify-between bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-500 dark:text-[oklch(0.75_0_0)] uppercase shrink-0">
                    {t(`platform_${link.platform}`)}
                  </span>
                  <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
                    {link.url}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                  aria-label={t("removeSocialLink")}
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Add new link */}
      {availablePlatforms.length > 0 && (
        <div className="flex gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform | "")}
            className="w-40 shrink-0 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-3 py-2.5 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
          >
            <option value="">{t("selectPlatform")}</option>
            {availablePlatforms.map((p) => (
              <option key={p} value={p}>
                {t(`platform_${p}`)}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            className="flex-1 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-2.5 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!platform || !url.trim() || !url.trim().startsWith("https://")}
            className="px-3 py-2.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            aria-label={t("addSocialLink")}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}

      {links.length >= 12 && (
        <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-2">
          {t("maxSocialLinks")}
        </p>
      )}
    </div>
  );
};

export default SocialLinksEditor;
