"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicProfileDto } from "@/services/creators-public-api";
import ProfileIdentityBlock from "./ProfileIdentityBlock";
import ProfileBioSection from "./ProfileBioSection";
import ProfileServicesSection from "./ProfileServicesSection";
import ProfileStatsBlock from "./ProfileStatsBlock";
import ProfileSocialLinks from "./ProfileSocialLinks";
import ProfileCTA from "./ProfileCTA";
import Footer from "@/components/shared/Footer";

interface PublicProfilePageProps {
  profile: PublicProfileDto;
  locale: string;
}

export default function PublicProfilePage({
  profile,
  locale: initialLocale,
}: PublicProfilePageProps) {
  const t = useTranslations("profile");
  const [contentLocale, setContentLocale] = useState<"en" | "fr">(
    initialLocale === "fr" ? "fr" : "en",
  );

  // AC3: Language toggle only for Starter+ creators with bilingual content
  const hasBilingualContent =
    profile.tier !== "FREE" &&
    profile.bioEn &&
    profile.bioFr &&
    profile.bioEn !== profile.bioFr;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#1a1a1a]">
      {/* Hero gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#F3F0FF] via-[#FDFAF4] to-[#F0FFF4] dark:from-[#1f1f2e] dark:via-[#1a1a1a] dark:to-[#1a2a1a]">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#5E53E0]/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#87E64B]/[0.06] rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="max-w-2xl mx-auto px-6 pt-16 pb-12 relative z-10">
          <ProfileIdentityBlock profile={profile} contentLocale={contentLocale} />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
          {/* Language toggle for bilingual content */}
          {hasBilingualContent && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setContentLocale("en")}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  contentLocale === "en"
                    ? "bg-[#5E53E0] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {t("languageToggle.en")}
              </button>
              <button
                onClick={() => setContentLocale("fr")}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  contentLocale === "fr"
                    ? "bg-[#5E53E0] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {t("languageToggle.fr")}
              </button>
            </div>
          )}

          {/* Bio */}
          <ProfileBioSection profile={profile} contentLocale={contentLocale} />

          {/* Services */}
          {profile.servicesOffered && profile.servicesOffered.length > 0 && (
            <ProfileServicesSection services={profile.servicesOffered} />
          )}

          {/* Stats */}
          <ProfileStatsBlock
            stats={profile.stats}
            contentLocale={contentLocale}
          />

          {/* CTA */}
          <ProfileCTA
            handle={profile.handle}
            tier={profile.tier}
            hasFileRequests={profile.hasFileRequests}
          />

          {/* Social Links */}
          {profile.socialLinks && profile.socialLinks.length > 0 && (
            <ProfileSocialLinks links={profile.socialLinks} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
