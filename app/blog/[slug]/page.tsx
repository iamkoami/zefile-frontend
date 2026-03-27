export const runtime = "edge";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import BlogPostContent from "@/components/blog/BlogPostContent";
import BlogPostFooter, {
  ShareButtons,
  ReadingProgressBar,
} from "@/components/blog/BlogPostClient";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import type { BlogPostDto } from "@/services/blog-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
}

async function fetchPost(
  slug: string,
  locale: string,
): Promise<BlogPostDto | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_URL}/blog/${slug}?locale=${locale}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      return await response.json();
    }

    // Fallback: try alternate locale
    const fallbackLocale = locale === "en" ? "fr" : "en";
    const fallbackResponse = await fetch(
      `${API_URL}/blog/${slug}?locale=${fallbackLocale}`,
      { next: { revalidate: 300 } },
    );
    if (fallbackResponse.ok) {
      return await fallbackResponse.json();
    }
  } catch {
    // Network error — fall through to notFound
  }
  return null;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("blog");
  const post = await fetchPost(slug, locale);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <ArticleJsonLd
        headline={post.title}
        datePublished={post.publishedAt || post.createdAt}
        dateModified={post.updatedAt || post.createdAt}
        author={post.authorName || "ZeFile"}
        image={post.coverImageUrl || undefined}
        description={post.metaDescription || post.excerpt || post.title}
        url={`${SITE_URL}/blog/${post.slug}`}
        locale={post.locale}
      />

      <ReadingProgressBar />

      {/* Blog Post Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #F3F0FF 0%, #FDFAF4 40%, #F0FFF4 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 pt-16 pb-16 relative z-10">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-400 mb-12 flex items-center gap-1.5 overflow-hidden">
            <Link
              href="/"
              className="hover:text-[#171717] transition-colors flex-shrink-0"
            >
              {locale === "fr" ? "Accueil" : "Home"}
            </Link>
            <span className="flex-shrink-0">&rsaquo;</span>
            <Link
              href="/blog"
              className="hover:text-[#171717] transition-colors flex-shrink-0"
            >
              Blog
            </Link>
            <span className="flex-shrink-0">&rsaquo;</span>
            <span className="text-gray-500 truncate">{post.title}</span>
          </nav>

          {/* Title — server-rendered for SEO */}
          <h1 className="text-4xl md:text-5xl font-bold text-[#171717] mb-10 leading-tight animate-[slideUp_0.8s_ease_0.1s_both]">
            {post.title}
          </h1>

          {/* Meta row: date/reading time + share icons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {post.publishedAt && (
                <span>{formatDate(post.publishedAt, locale)}</span>
              )}
              {post.readingTimeMinutes && (
                <>
                  <span aria-hidden="true">&middot;</span>
                  <span>
                    {t("readingTime", { minutes: post.readingTimeMinutes })}
                  </span>
                </>
              )}
            </div>

            <ShareButtons post={post} />
          </div>
        </div>

        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#5E53E0]/[0.04] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#87E64B]/[0.06] rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      </section>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-16">
          {/* Cover image */}
          {post.coverImageUrl && (
            <div className="relative w-full aspect-[2/1] mb-10 rounded-2xl overflow-hidden">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
            </div>
          )}

          {/* Article content — server-rendered for SEO */}
          {post.content ? (
            <BlogPostContent html={post.content} />
          ) : (
            <p className="text-gray-500 italic">
              {locale === "fr"
                ? "Contenu non disponible."
                : "Content not available."}
            </p>
          )}
        </div>

        <BlogPostFooter post={post} />
      </main>

      <Footer />
    </div>
  );
}
