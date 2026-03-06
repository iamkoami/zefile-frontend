export const runtime = "edge";

import { getTranslations } from "next-intl/server";
import PricingClient from "./PricingClient";

export default async function PricingPage() {
  const t = await getTranslations("subscriptions");
  const tPage = await getTranslations("subscription");

  return (
    <>
      {/* Server-rendered SEO content for crawlers */}
      <div className="sr-only" aria-hidden="true">
        <h1>{t.rich("title", { highlight: (chunks) => chunks })}</h1>
        <p>{t("subtitle")}</p>

        <h2>Free</h2>
        <p>
          {t("tiers.free.name")} - {t("tiers.free.description")}
        </p>

        <h2>Starter</h2>
        <p>
          {t("tiers.starter.name")} - {t("tiers.starter.description")}
        </p>

        <h2>Pro</h2>
        <p>
          {t("tiers.pro.name")} - {t("tiers.pro.description")}
        </p>

        <h2>Features</h2>
        <ul>
          <li>{t("features.basicUploads")}</li>
          <li>{t("features.watermarkedPreviews")}</li>
          <li>{t("features.emailNotifications")}</li>
          <li>{t("features.passwordProtection")}</li>
          <li>{t("features.fileVersioning")}</li>
          <li>{t("features.customBranding")}</li>
          <li>{t("features.customDomain")}</li>
          <li>{t("features.prioritySupport")}</li>
        </ul>

        <h2>
          {tPage.rich("compareFeatures", { highlight: (chunks) => chunks })}
        </h2>

        <h2>FAQ</h2>
        <h3>{t("faqQ1")}</h3>
        <p>{t("faqA1")}</p>
        <h3>{t("faqQ2")}</h3>
        <p>{t("faqA2")}</p>
        <h3>{t("faqQ3")}</h3>
        <p>{t("faqA3")}</p>

        <p>{t("cancelAnytime")}</p>
      </div>

      <PricingClient />
    </>
  );
}
