"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { PostCard, PostCardSkeleton } from "@/components/blog/PostCard";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const POSTS_PER_PAGE = 5;

interface BlogListClientProps {
  initialPosts: BlogPostDto[];
  initialTotalPages: number;
}

export default function BlogListClient({
  initialPosts,
  initialTotalPages,
}: BlogListClientProps) {
  const t = useTranslations("blog");
  const locale = useLocale();

  const [posts, setPosts] = useState<BlogPostDto[]>(initialPosts);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(1 < initialTotalPages);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll — load next pages client-side
  const loadMore = useCallback(
    async (pageNum: number) => {
      setIsLoadingMore(true);
      const response = await blogApi.getPublishedPosts(
        locale,
        pageNum,
        POSTS_PER_PAGE,
      );
      if (response.data) {
        setPosts((prev) => [...prev, ...response.data!.data]);
        setHasMore(pageNum < response.data.meta.totalPages);
      }
      setIsLoadingMore(false);
    },
    [locale],
  );

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadMore(nextPage);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, page, loadMore]);

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">{t("noPostsYet")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} locale={locale} t={t} />
      ))}

      {isLoadingMore && <PostCardSkeleton />}

      {hasMore && !isLoadingMore && (
        <div ref={sentinelRef} className="h-1" />
      )}
    </div>
  );
}
