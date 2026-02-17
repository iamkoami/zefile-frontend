"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("pages.terms");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <LoadingFullscreen />;
  }

  const sections = [
    { title: t("acceptanceTitle"), content: t("acceptanceContent") },
    { title: t("servicesTitle"), content: t("servicesContent") },
    { title: t("accountsTitle"), content: t("accountsContent") },
    { title: t("fileTransfersTitle"), content: t("fileTransfersContent") },
    { title: t("paymentsTitle"), content: t("paymentsContent") },
    { title: t("intellectualPropertyTitle"), content: t("intellectualPropertyContent") },
    { title: t("prohibitedUseTitle"), content: t("prohibitedUseContent") },
    { title: t("limitationTitle"), content: t("limitationContent") },
    { title: t("terminationTitle"), content: t("terminationContent") },
    { title: t("changesTitle"), content: t("changesContent") },
    { title: t("contactTitle"), content: t("contactContent") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-[#171717] mb-4">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {t("lastUpdated")}
          </p>

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
