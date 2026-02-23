"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import {
  X,
  Linkedin,
  Facebook,
  Mail,
  Whatsapp,
  Link as LinkIcon,
} from "iconoir-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import { toast } from "@/components/shared/Toast";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const POSTS_PER_PAGE = 5;

function formatDate(dateString: string, locale: string): string {
  return new Date(dateString).toLocaleDateString(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
}

function PostCard({
  post,
  locale,
  t,
}: {
  post: BlogPostDto;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/blog/${post.slug}`
      : `/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(post.title);

  const handleShare = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success(t("linkCopied"));
    } catch {
      // Fallback silently
    }
  };

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col md:flex-row bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Image — left side */}
      {post.coverImageUrl ? (
        <div className="relative w-full md:w-1/2 aspect-[16/9] md:aspect-auto md:min-h-[400px] bg-gray-100 flex-shrink-0">
          <Image
            src={post.coverImageUrl}
            alt={post.coverImageAlt || post.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      ) : (
        <div className="w-full md:w-1/2 aspect-[16/9] md:aspect-auto md:min-h-[400px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
          <span className="text-5xl text-gray-300">Z</span>
        </div>
      )}

      {/* Content — right side */}
      <div className="flex flex-col justify-between p-6 md:p-8 flex-1">
        <div>
          {/* Category / first tag */}
          {post.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#5E53E0]" />
              <span className="text-xs font-medium text-[#5E53E0]">
                {post.tags[0]}
              </span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-bold text-[#171717] mb-3 line-clamp-2">
            {post.title}
          </h2>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4">
              {post.excerpt}
            </p>
          )}
        </div>

        {/* Bottom row: date + read time + share icons */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div className="flex items-center gap-3 text-sm text-gray-400">
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

          {/* Share icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) =>
                handleShare(
                  e,
                  `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
                )
              }
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share on X"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) =>
                handleShare(
                  e,
                  `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
                )
              }
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) =>
                handleShare(
                  e,
                  `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
                )
              }
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) =>
                handleShare(
                  e,
                  `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
                )
              }
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share on WhatsApp"
            >
              <Whatsapp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
              }}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share via email"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Copy link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PostCardSkeleton() {
  return (
    <div className="flex flex-col md:flex-row bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-full md:w-1/2 aspect-[16/9] md:aspect-auto md:min-h-[400px] bg-gray-200 flex-shrink-0" />
      <div className="flex flex-col justify-between p-6 md:p-8 flex-1">
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="flex items-center justify-between mt-6">
          <div className="h-3 bg-gray-200 rounded w-36" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-6 h-6 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlogListPage() {
  const t = useTranslations("blog");
  const locale = useLocale();

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
        <PageHero title={t("title")} subtitle={t("subtitle")} />

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
