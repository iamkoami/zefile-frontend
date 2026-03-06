export const runtime = "edge";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import { getTranslations } from "next-intl/server";

export default async function JobsPage() {
  const t = await getTranslations("pages.jobs");

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
