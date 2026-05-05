import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface BlogPostMeta {
  title: string;
  slug: string;
  locale: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  authorName?: string;
}

async function fetchPostMeta(slug: string, locale: string): Promise<BlogPostMeta | null> {
  try {
    const response = await fetch(`${API_URL}/blog/${slug}?locale=${locale}`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      return await response.json();
    }
    // Fallback: try alternate locale (slug may belong to the other language)
    const altLocale = locale === 'en' ? 'fr' : 'en';
    const altResponse = await fetch(`${API_URL}/blog/${slug}?locale=${altLocale}`, {
      next: { revalidate: 3600 },
    });
    if (altResponse.ok) {
      return await altResponse.json();
    }
  } catch {
    // Graceful fallback
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();

  const post = await fetchPostMeta(slug, locale);
  if (!post) {
    return { title: "Blog - ZeFile" };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || "";
  // Canonical URL must reflect the post's actual locale, not the URL locale —
  // a FR post requested under /blog/<slug> still canonicalises to /fr/blog/<slug>.
  const url = `${SITE_URL}${post.locale === "fr" ? "/fr" : ""}/blog/${post.slug}`;

  return {
    title: `${title} - ZeFile Blog`,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: post.locale === "fr" ? "fr_FR" : "en_US",
      ...(post.publishedAt && { publishedTime: post.publishedAt }),
      ...(post.coverImageUrl && {
        images: [{ url: post.coverImageUrl, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
      // Self-referencing hreflang only — translation pairing isn't tracked in
      // the data model, so we cannot honestly claim a counterpart at the other
      // locale's URL. Once BlogPost gets a translationOfId FK, emit the pair.
      languages: {
        [post.locale]: url,
      },
    },
  };
}

export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const post = await fetchPostMeta(slug, locale);

  const localePrefix = post?.locale === "fr" ? "/fr" : "";
  const breadcrumbItems = [
    { name: 'Home', url: `${SITE_URL}${localePrefix || "/"}` },
    { name: 'Blog', url: `${SITE_URL}${localePrefix}/blog` },
  ];

  if (post) {
    breadcrumbItems.push({
      name: post.title,
      url: `${SITE_URL}${localePrefix}/blog/${post.slug}`,
    });
  }

  return (
    <>
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {children}
    </>
  );
}
