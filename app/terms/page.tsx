"use client";

export const runtime = "edge";

import LegalPageLayout from "@/components/shared/LegalPageLayout";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("pages.terms");

  const sections = [
    { title: t("acceptanceTitle"), content: t("acceptanceContent") },
    { title: t("servicesTitle"), content: t("servicesContent") },
    { title: t("accountsTitle"), content: t("accountsContent") },
    { title: t("fileTransfersTitle"), content: t("fileTransfersContent") },
    { title: t("paymentsTitle"), content: t("paymentsContent") },
    { title: t("subscriptionTitle"), content: t("subscriptionContent") },
    { title: t("intellectualPropertyTitle"), content: t("intellectualPropertyContent") },
    { title: t("prohibitedUseTitle"), content: t("prohibitedUseContent") },
    { title: t("limitationTitle"), content: t("limitationContent") },
    { title: t("terminationTitle"), content: t("terminationContent") },
    { title: t("changesTitle"), content: t("changesContent") },
    { title: t("governingLawTitle"), content: t("governingLawContent") },
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
