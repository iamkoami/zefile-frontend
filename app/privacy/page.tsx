"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
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
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero title={t("title")} subtitle={t("lastUpdated")} />

        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <section key={index} className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-[#171717] mb-4">
                  {index + 1}. {section.title}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
