"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations("pages.about");

  const sections = [
    { title: t("missionTitle"), content: t("missionContent") },
    { title: t("storyTitle"), content: t("storyContent") },
    { title: t("howTitle"), content: t("howContent") },
    { title: t("securityTitle"), content: t("securityContent") },
    { title: t("builtForTitle"), content: t("builtForContent") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-[#171717] mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            {t("subtitle")}
          </p>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <section key={index} className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-[#171717] mb-3">
                  {section.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">
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
