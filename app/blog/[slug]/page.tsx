"use client";

export const runtime = "edge";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
}

export default function BlogPostPage() {
  const t = useTranslations("blog");
  const locale = useLocale();
  const params = useParams();
  const slug = params.slug as string;

  const [post, setPost] = useState<BlogPostDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true);
      const response = await blogApi.getPostBySlug(slug, locale);
      if (response.data) {
        setPost(response.data);
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    };

    loadPost();
  }, [slug, locale]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
        <Header />
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-16">
            <div className="animate-pulse space-y-6">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="w-full aspect-[2/1] bg-gray-200 rounded-2xl" />
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="flex gap-3">
                <div className="h-3 bg-gray-200 rounded w-28" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
        <Header />
        <main className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <div className="text-6xl mb-4">&#128683;</div>
            <h1 className="text-2xl font-bold text-[#171717] mb-2">
              {locale === "fr" ? "Article introuvable" : "Post not found"}
            </h1>
            <p className="text-gray-500 mb-6">
              {locale === "fr"
                ? "Cet article n'existe pas ou n'est plus disponible."
                : "This post doesn't exist or is no longer available."}
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-[#5E53E0] hover:underline font-medium"
            >
              &larr; {t("backToBlog")}
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const alternateLocale = locale === "en" ? "fr" : "en";
  const alternateLabel =
    locale === "en" ? "Lire en fran\u00e7ais" : "Read in English";

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
      />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Nav bar */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-[#5E53E0] hover:underline text-sm font-medium"
            >
              &larr; {t("backToBlog")}
            </Link>
            <Link
              href={`/blog/${post.slug}?locale=${alternateLocale}`}
              className="text-sm text-gray-500 hover:text-[#5E53E0] transition-colors"
            >
              {alternateLabel}
            </Link>
          </div>

          {/* Cover image */}
          {post.coverImageUrl && (
            <div className="relative w-full aspect-[2/1] mb-8 rounded-2xl overflow-hidden">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
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

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-[#171717] mb-8 leading-tight">
            {post.title}
          </h1>

          {/* Content */}
          {post.content ? (
            <article
              className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[#5E53E0] prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <p className="text-gray-500 italic">
              {locale === "fr"
                ? "Contenu non disponible."
                : "Content not available."}
            </p>
          )}

          {/* Bottom nav */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-[#5E53E0] hover:underline text-sm font-medium"
            >
              &larr; {t("backToBlog")}
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
