"use client";

import { useTranslations } from "next-intl";

interface ProfileServicesSectionProps {
  services: string[];
  primaryService?: string | null;
}

export default function ProfileServicesSection({
  services,
  primaryService,
}: ProfileServicesSectionProps) {
  const t = useTranslations("profile");

  // Filter out the primary service from the list (it's shown as subtitle)
  const otherServices = primaryService
    ? services.filter((s) => s !== primaryService)
    : services;

  // If primary is set and no other services remain, skip the section
  if (otherServices.length === 0) return null;

  // When a primary service is set, show remaining as inline "Also does:" text
  if (primaryService) {
    return (
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        {t("services.alsoDoes")}:{" "}
        {otherServices
          .map((s) => t(`services.service_${s.replace(/-/g, "_")}`))
          .join(", ")}
      </p>
    );
  }

  // No primary service — show full services section with heading + badges
  return (
    <section>
      <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-3">
        {t("services.heading")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {otherServices.map((service) => (
          <span
            key={service}
            className="inline-block px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {t(`services.service_${service.replace(/-/g, "_")}`)}
          </span>
        ))}
      </div>
    </section>
  );
}
