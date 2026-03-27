
import LegalPageLayout from "@/components/shared/LegalPageLayout";
import { getTranslations } from "next-intl/server";

export default async function SecurityPage() {
  const t = await getTranslations("pages.security");

  const sections = [
    { title: t("introTitle"), content: t("introContent") },
    { title: t("scopeTitle"), content: t("scopeContent") },
    { title: t("outOfScopeTitle"), content: t("outOfScopeContent") },
    { title: t("rulesTitle"), content: t("rulesContent") },
    { title: t("reportingTitle"), content: t("reportingContent") },
    { title: t("timelineTitle"), content: t("timelineContent") },
    { title: t("safeHarborTitle"), content: t("safeHarborContent") },
    { title: t("contactTitle"), content: t("contactContent") },
  ];

  return (
    <LegalPageLayout
      title={t.rich("title", {
        highlight: (chunks) => (
          <span className="ze-highlight-purple">{chunks}</span>
        ),
      })}
      subtitle={t("lastUpdated")}
      sections={sections}
    />
  );
}
