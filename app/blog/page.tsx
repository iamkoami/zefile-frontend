"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const POSTS_PER_PAGE = 10;

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function PostCard({ post, locale, t }: { post: BlogPostDto; locale: string; t: (key: string, values?: Record<string, string | number>) => string }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {post.coverImageUrl ? (
        <div className="relative w-full aspect-[16/9] bg-gray-100">
          <Image
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className="w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <span className="text-4xl text-gray-300">Z</span>
        </div>
      )}

      <div className="p-6">
        <h2 className="text-xl font-bold text-[#171717] mb-2 group-hover:text-[#5E53E0] transition-colors line-clamp-2">
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">
            {post.excerpt}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {post.publishedAt && (
            <span>{formatDate(post.publishedAt, locale)}</span>
          )}
          {post.readingTimeMinutes && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{t("readingTime", { minutes: post.readingTimeMinutes })}</span>
            </>
          )}
        </div>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function BlogListPage() {
  const t = useTranslations("blog");
  const locale = useLocale();

  const [posts, setPosts] = useState<BlogPostDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadPosts = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(false);
    const response = await blogApi.getPublishedPosts(locale, pageNum, POSTS_PER_PAGE);
    if (response.data) {
      setPosts(response.data.items);
      setTotalPages(response.data.totalPages);
    } else {
      setError(true);
    }
    setIsLoading(false);
  }, [locale]);

  useEffect(() => {
    loadPosts(page);
  }, [page, loadPosts]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-10">
          <h1 className="text-4xl font-bold text-[#171717] mb-3">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>

        {/* Post Grid */}
        <div className="max-w-5xl mx-auto px-6 pb-16">
          {error ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">
                {locale === "fr"
                  ? "Impossible de charger les articles."
                  : "Could not load posts."}
              </p>
              <button
                onClick={() => loadPosts(page)}
                className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                {locale === "fr" ? "Réessayer" : "Try again"}
              </button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse"
                >
                  <div className="w-full aspect-[16/9] bg-gray-200" />
                  <div className="p-6 space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-3 bg-gray-200 rounded w-20" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">{t("noPostsYet")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} locale={locale} t={t} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label={locale === "fr" ? "Page précédente" : "Previous page"}
                    className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    &larr;
                  </button>
                  <span className="text-sm text-gray-600" aria-live="polite">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label={locale === "fr" ? "Page suivante" : "Next page"}
                    className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
