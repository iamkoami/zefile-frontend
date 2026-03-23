"use client";

import { useTranslations } from "next-intl";
import type { PublicProfileDto } from "@/services/creators-api";

interface ProfileBioSectionProps {
  profile: PublicProfileDto;
  contentLocale: "en" | "fr";
}

export default function ProfileBioSection({
  profile,
  contentLocale,
}: ProfileBioSectionProps) {
  const t = useTranslations("profile");

  const bio =
    contentLocale === "fr"
      ? profile.bioFr || profile.bioEn
      : profile.bioEn || profile.bioFr;

  return (
    <section>
      <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-3">
        {t("bio.heading")}
      </h2>
      {bio ? (
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {bio}
        </p>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 italic">
          {t("bio.noBio")}
        </p>
      )}
    </section>
  );
}
