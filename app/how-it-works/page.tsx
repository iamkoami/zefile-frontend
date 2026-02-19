"use client";

export const runtime = "edge";

import Link from "next/link";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

export default function HowItWorksPage() {
  const t = useTranslations("pages.howItWorks");

  const steps = [
    { title: t("step1Title"), content: t("step1Content") },
    { title: t("step2Title"), content: t("step2Content") },
    { title: t("step3Title"), content: t("step3Content") },
  ];

  const features = [
    { title: t("feature1Title"), content: t("feature1Content") },
    { title: t("feature2Title"), content: t("feature2Content") },
    { title: t("feature3Title"), content: t("feature3Content") },
    { title: t("feature4Title"), content: t("feature4Content") },
    { title: t("feature5Title"), content: t("feature5Content") },
    { title: t("feature6Title"), content: t("feature6Content") },
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

          {/* Steps */}
          <div className="space-y-6 mb-16">
            {steps.map((step, index) => (
              <section key={index} className="bg-white rounded-2xl border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-[#171717] mb-3">
                  {step.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {step.content}
                </p>
              </section>
            ))}
          </div>

          {/* Features */}
          <h2 className="text-2xl font-bold text-[#171717] mb-8">
            {t("featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-[#171717] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.content}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <section className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-[#171717] mb-3">
              {t("ctaTitle")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("ctaContent")}
            </p>
            <Link
              href="/"
              className="inline-block bg-[#87E64B] text-[#171717] font-semibold px-8 py-3 rounded hover:bg-[#78d43f] transition-colors"
            >
              {t("ctaButton")}
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
