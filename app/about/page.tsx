
import { getTranslations } from "next-intl/server";
import AboutClient from "./AboutClient";

export default async function AboutPage() {
  const t = await getTranslations("pages.about");

  return (
    <>
      {/* Server-rendered SEO content for crawlers */}
      <div className="sr-only" aria-hidden="true">
        <h1>
          {t.rich("title", { highlight: (chunks) => chunks })}
        </h1>
        <p>{t("subtitle")}</p>

        <h2>
          {t.rich("problemTitle", { highlight: (chunks) => chunks })}
        </h2>
        <p>{t("problemP1")}</p>
        <p>{t("problemP2")}</p>
        <p>{t("problemP3")}</p>

        <p>{t("painStatsTagline")}</p>
        <p>{t("painStat1Label")}</p>
        <p>{t("painStat2Label")}</p>
        <p>{t("painStat3Label")}</p>

        <h2>
          {t.rich("storyTitle", { highlight: (chunks) => chunks })}
        </h2>
        <p>{t("storyTagline")}</p>
        <p>{t("storyP1")}</p>
        <p>{t("storyP2")}</p>
        <p>{t("storyP3")}</p>

        <h2>
          {t.rich("capabilitiesTitle", { highlight: (chunks) => chunks })}
        </h2>
        <h3>{t("cap1Title")}</h3>
        <p>{t("cap1Content")}</p>
        <h3>{t("cap2Title")}</h3>
        <p>{t("cap2Content")}</p>
        <h3>{t("cap3Title")}</h3>
        <p>{t("cap3Content")}</p>
        <h3>{t("cap4Title")}</h3>
        <p>{t("cap4Content")}</p>
        <h3>{t("cap5Title")}</h3>
        <p>{t("cap5Content")}</p>

        <h2>
          {t.rich("trustTitle", { highlight: (chunks) => chunks })}
        </h2>
        <p>{t("trustIntro")}</p>

        <h2>
          {t.rich("africaTitle", { highlight: (chunks) => chunks })}
        </h2>
        <p>{t("africaP1")}</p>
        <p>{t("africaP2")}</p>

        <h2>
          {t.rich("valuesTitle", { highlight: (chunks) => chunks })}
        </h2>
        <h3>{t("value1Title")}</h3>
        <p>{t("value1Content")}</p>
        <h3>{t("value2Title")}</h3>
        <p>{t("value2Content")}</p>
        <h3>{t("value3Title")}</h3>
        <p>{t("value3Content")}</p>
        <h3>{t("value4Title")}</h3>
        <p>{t("value4Content")}</p>

        <h2>
          {t.rich("ctaTitle", { highlight: (chunks) => chunks })}
        </h2>
        <p>{t("ctaSubtext")}</p>
      </div>

      <AboutClient />
    </>
  );
}
