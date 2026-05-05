export const runtime = "edge";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import {
  HELP_CATEGORIES,
  type HelpArticleDto,
  type HelpCategory,
  localizeArticle,
} from "@/services/help-articles-types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const CATEGORY_LABELS: Record<HelpCategory, { en: string; fr: string }> = {
  general: { en: "Getting started", fr: "Premiers pas" },
  download: { en: "Downloads", fr: "Téléchargements" },
  payment: { en: "Payments", fr: "Paiements" },
  payout: { en: "Payouts", fr: "Retraits" },
  account: { en: "Account & billing", fr: "Compte & facturation" },
  technical: { en: "Technical support", fr: "Support technique" },
};

async function fetchArticlesByCategory(category: HelpCategory): Promise<HelpArticleDto[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/help/category/${category}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    return (await res.json()) as HelpArticleDto[];
  } catch {
    return [];
  }
}

export default async function HelpCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!HELP_CATEGORIES.includes(category as HelpCategory)) {
    notFound();
  }

  const locale = (await getLocale()) as "en" | "fr";
  const categoryKey = category as HelpCategory;
  const localePrefix = locale === "fr" ? "/fr" : "";
  const articles = await fetchArticlesByCategory(categoryKey);
  const label = CATEGORY_LABELS[categoryKey][locale];
  const helpHomeLabel = locale === "fr" ? "Centre d'aide" : "Help center";

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <BreadcrumbJsonLd
        items={[
          { name: locale === "fr" ? "Accueil" : "Home", url: `${SITE_URL}${localePrefix || "/"}` },
          { name: helpHomeLabel, url: `${SITE_URL}${localePrefix}/help` },
          { name: label, url: `${SITE_URL}${localePrefix}/help/${categoryKey}` },
        ]}
      />
      <Header />

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 pt-16 pb-8">
          <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5">
            <Link href={`${localePrefix}/help`} className="hover:text-[#171717]">
              {helpHomeLabel}
            </Link>
            <span>›</span>
            <span className="text-[#171717]">{label}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold text-[#171717] mb-4">{label}</h1>
          <p className="text-gray-600">
            {locale === "fr"
              ? `Articles d'aide sur ${label.toLowerCase()}.`
              : `Help articles about ${label.toLowerCase()}.`}
          </p>
        </section>

        <section className="max-w-4xl mx-auto px-6 pb-20">
          {articles.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <p className="text-gray-600 mb-2">
                {locale === "fr"
                  ? "Aucun article publié dans cette catégorie pour le moment."
                  : "No articles published in this category yet."}
              </p>
              <Link
                href={`${localePrefix}/help`}
                className="text-[#5E53E0] font-medium hover:underline"
              >
                {locale === "fr" ? "Retour au centre d'aide" : "Back to help center"}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => {
                const { title, slug } = localizeArticle(article, locale);
                return (
                  <Link
                    key={article.id}
                    href={`${localePrefix}/help/${categoryKey}/${slug}`}
                    className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                  >
                    <h2 className="text-xl font-bold text-[#171717] mb-2">{title}</h2>
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-[#5E53E0] bg-[#5E53E0]/10 rounded px-2 py-1"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
