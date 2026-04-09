"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import type { PublicProfileDto } from "@/services/creators-public-api";
import { CheckCircle, Globe } from "@/utils/icons";

interface ProfileIdentityBlockProps {
  profile: PublicProfileDto;
  contentLocale: "en" | "fr";
}

export default function ProfileIdentityBlock({
  profile,
  contentLocale,
}: ProfileIdentityBlockProps) {
  const t = useTranslations("profile");
  const name = profile.name || `@${profile.handle}`;
  const specialty =
    contentLocale === "fr"
      ? profile.specialtyFr || profile.specialtyEn
      : profile.specialtyEn || profile.specialtyFr;

  return (
    <div className="flex flex-col items-center text-center gap-4">
      {/* Avatar */}
      <div className="relative w-28 h-28 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {profile.profilePictureUrl ? (
          <Image
            src={profile.profilePictureUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="112px"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400 dark:text-gray-500">
            {(profile.name || profile.handle).charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name + handle + primary service */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#171717] dark:text-white">
          {name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          @{profile.handle}
        </p>
        {profile.primaryService && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t(`services.service_${profile.primaryService.replace(/-/g, "_")}`)}
          </p>
        )}
      </div>

      {/* Specialty */}
      {specialty && (
        <p className="text-base text-gray-700 dark:text-gray-300 max-w-md">
          {specialty}
        </p>
      )}

      {/* Badges row */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        {/* KYC verified badge */}
        {profile.kycVerified && (
          <span className="inline-flex items-center gap-1 text-[#5E53E0]">
            <CheckCircle width={16} height={16} />
            {t("identity.verified")}
          </span>
        )}

        {/* Location */}
        {profile.location && (
          <span className="inline-flex items-center gap-1">
            <Globe width={14} height={14} />
            {profile.location}
          </span>
        )}

        {/* Languages spoken */}
        {profile.languagesSpoken && profile.languagesSpoken.length > 0 && (
          <span>{profile.languagesSpoken.join(", ")}</span>
        )}
      </div>
    </div>
  );
}
