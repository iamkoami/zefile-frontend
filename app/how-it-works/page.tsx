export const runtime = "edge";

import { getTranslations } from "next-intl/server";
import HowItWorksClient from "./HowItWorksClient";

export default async function HowItWorksPage() {
  const t = await getTranslations("pages.howItWorks");

  const pass = (chunks: React.ReactNode) => chunks;

  return (
    <>
      {/* Server-rendered SEO content for crawlers -- invisible to users */}
      <div className="sr-only" aria-hidden="true">
        <h1>{t.rich("title", { highlight: pass, br: () => " " })}</h1>
        <p>{t("subtitle")}</p>

        <h2>
          {t.rich("timelineTitle", { highlight: pass })}
        </h2>
        <h3>{t("step1Title")}</h3>
        <p>{t("step1Content")}</p>
        <h3>{t("step2Title")}</h3>
        <p>{t("step2Content")}</p>
        <h3>{t("step3Title")}</h3>
        <p>{t("step3Content")}</p>

        <h2>
          {t.rich("perspectiveTitle", { highlight: pass })}
        </h2>
        <p>{t("perspectiveSubtitle")}</p>

        <h3>{t("senderStep1Title")}</h3>
        <p>{t("senderStep1Desc")}</p>
        <h3>{t("senderStep2Title")}</h3>
        <p>{t("senderStep2Desc")}</p>
        <h3>{t("senderStep3Title")}</h3>
        <p>{t("senderStep3Desc")}</p>
        <h3>{t("senderStep4Title")}</h3>
        <p>{t("senderStep4Desc")}</p>

        <h3>{t("receiverStep1Title")}</h3>
        <p>{t("receiverStep1Desc")}</p>
        <h3>{t("receiverStep2Title")}</h3>
        <p>{t("receiverStep2Desc")}</p>
        <h3>{t("receiverStep3Title")}</h3>
        <p>{t("receiverStep3Desc")}</p>
        <h3>{t("receiverStep4Title")}</h3>
        <p>{t("receiverStep4Desc")}</p>

        <h2>
          {t.rich("bentoTitle", { highlight: pass })}
        </h2>

        <h2>
          {t.rich("fileTypesTitle", { highlight: pass })}
        </h2>

        <h2>
          {t.rich("faqTitle", { highlight: pass })}
        </h2>

        <h2>
          {t.rich("ctaTitle", { highlight: pass })}
        </h2>
      </div>

      <HowItWorksClient />
    </>
  );
}
