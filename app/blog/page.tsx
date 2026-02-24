"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import { PostCard, PostCardSkeleton } from "@/components/blog/PostCard";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const POSTS_PER_PAGE = 5;

export default function BlogListPage() {
  const t = useTranslations("blog");
  const locale = useLocale();
  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  const [posts, setPosts] = useState<BlogPostDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(
    async (pageNum: number, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(false);

      const response = await blogApi.getPublishedPosts(
        locale,
        pageNum,
        POSTS_PER_PAGE,
      );

      if (response.data) {
        if (append) {
          setPosts((prev) => [...prev, ...response.data!.items]);
        } else {
          setPosts(response.data.items);
        }
        setHasMore(pageNum < response.data.totalPages);
      } else {
        setError(true);
      }

      setIsLoading(false);
      setIsLoadingMore(false);
    },
    [locale],
  );

  // Initial load
  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadPosts(nextPage, true);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, page, loadPosts]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero title={t.rich("title", { highlight })} subtitle={t("subtitle")} />

        {/* Posts */}
        <div className="max-w-5xl mx-auto px-6 py-24">
          {error && posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-4">
                {locale === "fr"
                  ? "Impossible de charger les articles."
                  : "Could not load posts."}
              </p>
              <button
                onClick={() => {
                  setPage(1);
                  loadPosts(1);
                }}
                className="px-4 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                {locale === "fr" ? "Réessayer" : "Try again"}
              </button>
            </div>
          ) : isLoading ? (
            <LoadingFullscreen />
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">{t("noPostsYet")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} locale={locale} t={t} />
              ))}

              {/* Loading more indicator */}
              {isLoadingMore && <PostCardSkeleton />}

              {/* Infinite scroll sentinel */}
              {hasMore && !isLoadingMore && (
                <div ref={sentinelRef} className="h-1" />
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
