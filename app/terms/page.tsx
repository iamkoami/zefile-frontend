"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
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
