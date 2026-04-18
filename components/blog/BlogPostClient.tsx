"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Facebook,
  Linkedin,
  X,
  Whatsapp,
  Mail,
  Link as LinkIcon,
  ArrowRight,
} from "iconoir-react";
import { useTranslations, useLocale } from "next-intl";
import { PostCard } from "@/components/blog/PostCard";
import { toast } from "@/components/shared/Toast";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

interface BlogPostClientProps {
  post: BlogPostDto;
}

export function ShareButtons({ post }: BlogPostClientProps) {
  const locale = useLocale();

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(post.title);

  const handleShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success(locale === "fr" ? "Lien copie" : "Link copied");
    } catch {
      // Fallback silently
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {locale === "fr" ? "Partager" : "Share"}
      </span>
      <button
        onClick={() =>
          handleShare(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          )
        }
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Share on Facebook"
      >
        <Facebook className="w-4 h-4" />
      </button>
      <button
        onClick={() =>
          handleShare(
            `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
          )
        }
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Share on X"
      >
        <X className="w-4 h-4" />
      </button>
      <button
        onClick={() =>
          handleShare(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
          )
        }
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>
      <button
        onClick={() =>
          handleShare(
            `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
          )
        }
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Share on WhatsApp"
      >
        <Whatsapp className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          window.location.href = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`;
        }}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Share via email"
      >
        <Mail className="w-4 h-4" />
      </button>
      <button
        onClick={handleCopyLink}
        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Copy link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ReadingProgressBar() {
  const [readProgress, setReadProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setReadProgress(100);
        return;
      }
      setReadProgress(
        Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)),
      );
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (readProgress <= 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[101] h-1 bg-gray-200/50">
      <div
        className="h-full bg-[#5E53E0] transition-[width] duration-150 ease-out"
        style={{ width: `${readProgress}%` }}
      />
    </div>
  );
}

export default function BlogPostFooter({ post }: BlogPostClientProps) {
  const t = useTranslations("blog");
  const locale = useLocale();
  const [relatedPosts, setRelatedPosts] = useState<BlogPostDto[]>([]);

  useEffect(() => {
    if (post.tags.length === 0) return;

    const loadRelated = async () => {
      try {
        const response = await blogApi.getPublishedPosts(
          locale,
          1,
          4,
          post.tags[0],
        );
        if (response.data?.data) {
          setRelatedPosts(
            response.data.data
              .filter((p) => p.slug !== post.slug)
              .slice(0, 3),
          );
        }
      } catch {
        // Related posts are non-critical
      }
    };

    loadRelated();
  }, [post, locale]);

  return (
    <>
      {/* Soft CTA */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="mt-16 p-6 bg-[#FDFAF4] border border-gray-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-[#171717] text-sm font-medium">
            {t("tryZefileCta")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#87E64B] text-[#171717] text-sm font-bold rounded hover:bg-[#78d43f] transition-colors flex-shrink-0"
          >
            {t("getStarted")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Related Articles */}
      {relatedPosts.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-32">
          <div className="border-t border-gray-200 pt-16">
            <h2 className="text-2xl font-bold text-[#171717] mb-8">
              {t("relatedArticles")}
            </h2>
            <div className="space-y-8">
              {relatedPosts.map((relatedPost) => (
                <PostCard
                  key={relatedPost.id}
                  post={relatedPost}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
