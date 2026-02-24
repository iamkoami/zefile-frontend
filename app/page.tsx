export const runtime = "edge";

import { getTranslations } from "next-intl/server";
import HomeClient from "@/features/home/components/HomeClient";

export default async function Home() {
  const t = await getTranslations("hero");

  return (
    <>
      {/* Server-rendered SEO content — present in initial HTML for crawlers.
          HeroText (client component) provides the styled visual version on desktop.
          This ensures the H1 is in the server response before JS hydration. */}
      <h1 className="sr-only">{t("title")}</h1>
      <p className="sr-only">{t("subtitle")}</p>
      <HomeClient />
    </>
  );
}
