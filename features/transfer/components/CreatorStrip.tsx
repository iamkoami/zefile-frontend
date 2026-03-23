"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { OpenNewWindow } from "iconoir-react";

interface CreatorStripProps {
  handle: string;
  name: string | null;
  specialtyEn: string | null;
  specialtyFr: string | null;
  location: string | null;
  profilePictureUrl: string | null;
}

function AvatarInitial({ name, handle }: { name: string | null; handle: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[oklch(0.35_0_0)] flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-gray-500 dark:text-[oklch(0.65_0_0)]">
        {(name || handle).charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function CreatorStrip({
  handle,
  name,
  specialtyEn,
  specialtyFr,
  location,
  profilePictureUrl,
}: CreatorStripProps) {
  const t = useTranslations("creatorStrip");
  const locale = useLocale();
  const [avatarError, setAvatarError] = useState(false);

  const specialty = locale === "fr" && specialtyFr ? specialtyFr : specialtyEn;
  const profileUrl = `/@${handle}`;
  const displayName = name || handle;

  const displayParts = [name, specialty, location].filter(Boolean);

  if (displayParts.length === 0) return null;

  return (
    <Link
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("viewProfile") + " " + displayName}
      className="mt-4 flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-[oklch(0.24_0_0)] rounded hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] transition-colors group"
    >
      {/* Avatar */}
      {profilePictureUrl && !avatarError ? (
        <img
          src={profilePictureUrl}
          alt={displayName}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          onError={() => setAvatarError(true)}
        />
      ) : (
        <AvatarInitial name={name} handle={handle} />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-[oklch(0.60_0_0)] truncate">
          {displayParts.join(" \u2014 ")}
        </p>
      </div>

      {/* View profile link */}
      <span className="text-xs text-[#5E53E0] dark:text-[oklch(0.68_0.15_285)] font-medium flex items-center gap-1 flex-shrink-0 group-hover:underline">
        {t("viewProfile")}
        <OpenNewWindow className="w-3 h-3" />
      </span>
    </Link>
  );
}
