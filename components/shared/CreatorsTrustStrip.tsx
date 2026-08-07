"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { platformApi, FeaturedCreator } from "@/services/platform-api";

interface CreatorsTrustStripProps {
  timeOfDay?: "day" | "evening" | "night";
  /**
   * Which edge the avatars and caption sit on. Follows the hero's alignment —
   * a centered strip above left-aligned copy is the half-migrated look that
   * reads as a layout bug rather than a choice.
   */
  align?: "center" | "left";
}

/**
 * Get the first available social link URL from a creator.
 */
function getCreatorLink(creator: FeaturedCreator): string | null {
  if (!creator.socialLinks) return null;
  return (
    creator.socialLinks.portfolio ||
    creator.socialLinks.instagram ||
    creator.socialLinks.behance ||
    creator.socialLinks.twitter ||
    null
  );
}

const CreatorsTrustStrip: React.FC<CreatorsTrustStripProps> = ({
  timeOfDay = "day",
  align = "center",
}) => {
  const t = useTranslations("featuredCreators");
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);

  useEffect(() => {
    platformApi
      .getFeaturedCreators()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCreators(res.data);
        }
      })
      .catch(() => {});
  }, []);

  if (creators.length === 0) return null;

  const displayCreators = creators.filter((c) => c.photoUrl);
  if (displayCreators.length === 0) return null;

  const isNight = timeOfDay === "night";

  return (
    <div
      className={`flex flex-col gap-4 ${
        align === "left" ? "items-start" : "items-center"
      }`}
    >
      {/* Overlapping avatars row */}
      <div className="flex -space-x-3 pointer-events-auto">
        {displayCreators.map((creator, i) => {
          const link = getCreatorLink(creator);
          const avatarStyle = {
            animation: `scaleIn 0.4s ease-out ${0.5 + i * 0.15}s both`,
          };
          const avatar = (
            <img
              src={creator.photoUrl!}
              alt={creator.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm bg-white transition-transform duration-200 hover:-translate-y-1.5 cursor-pointer"
              loading="lazy"
            />
          );

          if (link) {
            return (
              <a
                key={creator.id}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                title={creator.name}
                className="relative z-0 hover:z-10"
                style={avatarStyle}
              >
                {avatar}
              </a>
            );
          }

          return (
            <div key={creator.id} className="relative z-0 hover:z-10" style={avatarStyle}>
              {avatar}
            </div>
          );
        })}
      </div>

      {/* Text below */}
      <p
        className={`text-sm font-medium ${
          isNight ? "text-gray-300" : "text-[#4B5563] dark:text-gray-300"
        }`}
        style={{
          animation: "fadeIn 0.6s ease-out 1.0s both",
          transition: "color 1.5s ease-in-out",
        }}
      >
        {t("trustStripText")}
      </p>
    </div>
  );
};

export default CreatorsTrustStrip;
