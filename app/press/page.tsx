"use client";

export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import { useTranslations } from "next-intl";

export default function PressPage() {
  const t = useTranslations("pages.press");

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero title={t("title")} subtitle={t("comingSoon")} />
      </main>

      <Footer />
    </div>
  );
}
