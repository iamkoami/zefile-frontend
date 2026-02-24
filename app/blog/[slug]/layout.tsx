import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface BlogPostMeta {
  title: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  authorName?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();

  try {
    const response = await fetch(`${API_URL}/blog/${slug}?locale=${locale}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return { title: "Blog - ZeFile" };
    }

    const post: BlogPostMeta = await response.json();
    const title = post.metaTitle || post.title;
    const description = post.metaDescription || post.excerpt || "";
    const url = `${SITE_URL}/blog/${post.slug}`;

    return {
      title: `${title} - ZeFile Blog`,
      description,
      openGraph: {
        title,
        description,
        url,
        type: "article",
        ...(post.publishedAt && { publishedTime: post.publishedAt }),
        ...(post.coverImageUrl && {
          images: [{ url: post.coverImageUrl, alt: post.title }],
        }),
      },
      twitter: {
        card: post.coverImageUrl ? "summary_large_image" : "summary",
        title,
        description,
        ...(post.coverImageUrl && { images: [post.coverImageUrl] }),
      },
      alternates: {
        canonical: url,
        languages: {
          'en': url,
          'fr': url,
          'x-default': url,
        },
      },
    };
  } catch {
    return { title: "Blog - ZeFile" };
  }
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
      ]} />
      {children}
    </>
  );
}
