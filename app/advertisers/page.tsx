"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

export default function AdvertisersPage() {
  const t = useTranslations("pages.advertisers");

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold text-[#171717] mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("subtitle")}
          </p>

          {/* Placeholder content */}
          <div className="mt-12 p-8 bg-white rounded-2xl border border-gray-200 text-center">
            <p className="text-gray-500">{t("comingSoon")}</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
