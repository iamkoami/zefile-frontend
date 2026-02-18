"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

export default function PressPage() {
  const t = useTranslations("pages.press");

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-[#171717] mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600">
            {t("comingSoon")}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
