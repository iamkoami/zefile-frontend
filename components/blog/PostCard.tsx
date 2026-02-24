"use client";

import Link from "next/link";
import Image from "next/image";
import {
  X,
  Linkedin,
  Facebook,
  Mail,
  Whatsapp,
  Link as LinkIcon,
} from "iconoir-react";
import { toast } from "@/components/shared/Toast";
import type { BlogPostDto } from "@/services/blog-api";

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

export function PostCard({
  post,
  locale,
  t,
}: {
  post: BlogPostDto;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const getPostUrl = () => `${window.location.origin}/blog/${post.slug}`;

  const handleShare = (e: React.MouseEvent, buildUrl: (encodedUrl: string, encodedTitle: string) => string) => {
    e.preventDefault();
    const postUrl = getPostUrl();
    const url = buildUrl(encodeURIComponent(postUrl), encodeURIComponent(post.title));
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(getPostUrl());
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
                  (url, title) => `https://x.com/intent/tweet?url=${url}&text=${title}`,
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
                  (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
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
                  (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
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
                  (url, title) => `https://wa.me/?text=${title}%20${url}`,
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
                const postUrl = getPostUrl();
                window.location.href = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(postUrl)}`;
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

export function PostCardSkeleton() {
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
