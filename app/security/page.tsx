"use client";

export const runtime = "edge";

import LegalPageLayout from "@/components/shared/LegalPageLayout";
import { useTranslations } from "next-intl";

export default function SecurityPage() {
  const t = useTranslations("pages.security");

  const sections = [
    { title: t("introTitle"), content: t("introContent") },
    { title: t("scopeTitle"), content: t("scopeContent") },
    { title: t("outOfScopeTitle"), content: t("outOfScopeContent") },
    { title: t("rulesTitle"), content: t("rulesContent") },
    { title: t("reportingTitle"), content: t("reportingContent") },
    { title: t("timelineTitle"), content: t("timelineContent") },
    { title: t("safeHarborTitle"), content: t("safeHarborContent") },
    { title: t("contactTitle"), content: t("contactContent") },
  ];

  return (
    <LegalPageLayout
      title={t.rich("title", {
        highlight: (chunks) => (
          <span className="ze-highlight-purple">{chunks}</span>
        ),
      })}
      subtitle={t("lastUpdated")}
      sections={sections}
    />
  );
}
