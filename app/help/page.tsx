"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

export default function HelpCenterPage() {
  const t = useTranslations("pages.help");

  const sections = [
    {
      title: t("gettingStartedTitle"),
      faqs: [
        { q: t("faq1Q"), a: t("faq1A") },
        { q: t("faq2Q"), a: t("faq2A") },
        { q: t("faq3Q"), a: t("faq3A") },
      ],
    },
    {
      title: t("transfersTitle"),
      faqs: [
        { q: t("faq4Q"), a: t("faq4A") },
        { q: t("faq5Q"), a: t("faq5A") },
        { q: t("faq6Q"), a: t("faq6A") },
      ],
    },
    {
      title: t("paymentsTitle"),
      faqs: [
        { q: t("faq7Q"), a: t("faq7A") },
        { q: t("faq8Q"), a: t("faq8A") },
        { q: t("faq9Q"), a: t("faq9A") },
      ],
    },
    {
      title: t("securityTitle"),
      faqs: [
        { q: t("faq10Q"), a: t("faq10A") },
        { q: t("faq11Q"), a: t("faq11A") },
      ],
    },
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

          <div className="space-y-10">
            {sections.map((section, sIdx) => (
              <div key={sIdx}>
                <h2 className="text-xl font-bold text-[#171717] mb-4">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.faqs.map((faq, fIdx) => (
                    <div key={fIdx} className="bg-white rounded-2xl border border-gray-200 p-6">
                      <h3 className="font-semibold text-[#171717] mb-2">
                        {faq.q}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <section className="mt-12 bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-[#171717] mb-3">
              {t("contactTitle")}
            </h2>
            <p className="text-gray-600">
              {t("contactContent")}{" "}
              <a
                href={`mailto:${t("contactEmail")}`}
                className="text-[#5E53E0] hover:underline font-medium"
              >
                {t("contactEmail")}
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
