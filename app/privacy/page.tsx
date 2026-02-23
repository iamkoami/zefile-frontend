"use client";

export const runtime = "edge";

import LegalPageLayout from "@/components/shared/LegalPageLayout";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("pages.privacy");

  const sections = [
    { title: t("dataControllerTitle"), content: t("dataControllerContent") },
    { title: t("collectionTitle"), content: t("collectionContent") },
    { title: t("legalBasisTitle"), content: t("legalBasisContent") },
    { title: t("useTitle"), content: t("useContent") },
    { title: t("storageTitle"), content: t("storageContent") },
    { title: t("retentionTitle"), content: t("retentionContent") },
    { title: t("subProcessorsTitle"), content: t("subProcessorsContent") },
    { title: t("internationalTransfersTitle"), content: t("internationalTransfersContent") },
    { title: t("cookiesTitle"), content: t("cookiesContent") },
    { title: t("rightsTitle"), content: t("rightsContent") },
    { title: t("complaintTitle"), content: t("complaintContent") },
    { title: t("securityTitle"), content: t("securityContent") },
    { title: t("automatedDecisionsTitle"), content: t("automatedDecisionsContent") },
    { title: t("childrenTitle"), content: t("childrenContent") },
    { title: t("changesTitle"), content: t("changesContent") },
    { title: t("contactTitle"), content: t("contactContent") },
  ];

  return (
    <LegalPageLayout
      title={t("title")}
      subtitle={t("lastUpdated")}
      sections={sections}
    />
  );
}
