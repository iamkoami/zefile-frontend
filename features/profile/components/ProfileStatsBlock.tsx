"use client";

import { useTranslations } from "next-intl";

interface ProfileStatsBlockProps {
  stats: {
    completedDeliveries: number;
    memberSince: string;
  };
  contentLocale: "en" | "fr";
}

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long" },
  );
}

export default function ProfileStatsBlock({
  stats,
  contentLocale,
}: ProfileStatsBlockProps) {
  const t = useTranslations("profile");

  return (
    <section>
      <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
        {/* Completed deliveries */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#87E64B]" />
          <span>
            {t("stats.completedDeliveries", {
              count: stats.completedDeliveries,
            })}
          </span>
        </div>

        {/* Member since */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>
            {t("stats.memberSince", {
              date: formatDate(stats.memberSince, contentLocale),
            })}
          </span>
        </div>
      </div>
    </section>
  );
}
