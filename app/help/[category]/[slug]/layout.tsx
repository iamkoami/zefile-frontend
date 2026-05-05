import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { localizeArticle, type HelpArticleDto } from "@/services/help-articles-types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchArticle(slug: string, locale: "en" | "fr"): Promise<HelpArticleDto | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/help/article/${slug}?locale=${locale}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as HelpArticleDto;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as "en" | "fr";
  const article = await fetchArticle(slug, locale);
  if (!article) return { title: "Help — ZeFile" };

  const localePrefix = locale === "fr" ? "/fr" : "";
  const { title, slug: localeSlug } = localizeArticle(article, locale);
  const url = `${SITE_URL}${localePrefix}/help/${article.category}/${localeSlug}`;
  const description = title.length > 100 ? title.slice(0, 157) + "..." : title;

  return {
    title: `${title} — ZeFile Help`,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: url,
      languages: {
        [locale]: url,
      },
    },
  };
}

export default function HelpArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
