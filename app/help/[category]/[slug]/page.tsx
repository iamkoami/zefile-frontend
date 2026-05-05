export const runtime = "edge";

import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import BlogPostContent from "@/components/blog/BlogPostContent";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
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

async function fetchArticle(slug: string, locale: "en" | "fr"): Promise<HelpArticleDto | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/help/article/${slug}?locale=${locale}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as HelpArticleDto;
  } catch {
    return null;
  }
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  if (!HELP_CATEGORIES.includes(category as HelpCategory)) {
    notFound();
  }

  const locale = (await getLocale()) as "en" | "fr";
  const article = await fetchArticle(slug, locale);
  if (!article) notFound();

  // Article belongs to a different category than the URL — 308 redirect to
  // the correct category URL so we don't have duplicate URLs for one article.
  if (article.category !== category) {
    const target = `${locale === "fr" ? "/fr" : ""}/help/${article.category}/${
      locale === "fr" ? article.slugFr : article.slugEn
    }`;
    permanentRedirect(target);
  }

  // Article exists at the wrong slug for this locale — redirect to canonical.
  const expectedSlug = locale === "fr" ? article.slugFr : article.slugEn;
  if (slug !== expectedSlug) {
    const target = `${locale === "fr" ? "/fr" : ""}/help/${article.category}/${expectedSlug}`;
    permanentRedirect(target);
  }

  const localePrefix = locale === "fr" ? "/fr" : "";
  const categoryKey = article.category as HelpCategory;
  const categoryLabel = CATEGORY_LABELS[categoryKey][locale];
  const helpHomeLabel = locale === "fr" ? "Centre d'aide" : "Help center";
  const { title, content } = localizeArticle(article, locale);

  const articleUrl = `${SITE_URL}${localePrefix}/help/${article.category}/${expectedSlug}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <BreadcrumbJsonLd
        items={[
          { name: locale === "fr" ? "Accueil" : "Home", url: `${SITE_URL}${localePrefix || "/"}` },
          { name: helpHomeLabel, url: `${SITE_URL}${localePrefix}/help` },
          { name: categoryLabel, url: `${SITE_URL}${localePrefix}/help/${article.category}` },
          { name: title, url: articleUrl },
        ]}
      />
      <ArticleJsonLd
        headline={title}
        datePublished={article.createdAt}
        dateModified={article.updatedAt}
        author="ZeFile"
        description={title}
        url={articleUrl}
        locale={locale}
      />

      <Header />

      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 pt-16 pb-12">
          <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
            <Link href={`${localePrefix}/help`} className="hover:text-[#171717]">
              {helpHomeLabel}
            </Link>
            <span>›</span>
            <Link
              href={`${localePrefix}/help/${article.category}`}
              className="hover:text-[#171717]"
            >
              {categoryLabel}
            </Link>
            <span>›</span>
            <span className="text-[#171717] truncate">{title}</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-bold text-[#171717] mb-8 leading-tight">
            {title}
          </h1>

          <BlogPostContent html={content} />

          <div className="mt-16 pt-8 border-t border-gray-200">
            <Link
              href={`${localePrefix}/help/${article.category}`}
              className="text-[#5E53E0] font-medium hover:underline"
            >
              ← {locale === "fr" ? "Retour à" : "Back to"} {categoryLabel.toLowerCase()}
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
