"use client";

import { useTranslations } from "next-intl";

interface ProfileServicesSectionProps {
  services: string[];
}

export default function ProfileServicesSection({
  services,
}: ProfileServicesSectionProps) {
  const t = useTranslations("profile");

  return (
    <section>
      <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-3">
        {t("services.heading")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {services.map((service) => (
          <span
            key={service}
            className="inline-block px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {service}
          </span>
        ))}
      </div>
    </section>
  );
}
