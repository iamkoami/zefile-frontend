"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

export default function AdvertisersPage() {
  const t = useTranslations("pages.advertisers");

  const reasons = [
    { title: t("why1Title"), content: t("why1Content") },
    { title: t("why2Title"), content: t("why2Content") },
    { title: t("why3Title"), content: t("why3Content") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-[#171717] mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {t("subtitle")}
          </p>
          <p className="text-gray-600 leading-relaxed mb-12">
            {t("introContent")}
          </p>

          {/* Why Advertise */}
          <h2 className="text-2xl font-bold text-[#171717] mb-6">
            {t("whyTitle")}
          </h2>
          <div className="space-y-5 mb-12">
            {reasons.map((reason, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-[#171717] mb-2">
                  {reason.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {reason.content}
                </p>
              </div>
            ))}
          </div>

          {/* Ad Formats */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
            <h2 className="text-xl font-semibold text-[#171717] mb-3">
              {t("formatsTitle")}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {t("formatsContent")}
            </p>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
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
              </a>{" "}
              {t("contactSuffix")}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
