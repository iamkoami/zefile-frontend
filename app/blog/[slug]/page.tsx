"use client";

export const runtime = "edge";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import {
  NavArrowLeft,
  Facebook,
  Linkedin,
  X,
  Whatsapp,
  Mail,
  Link as LinkIcon,
  ArrowRight,
} from "iconoir-react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import { PostCard } from "@/components/blog/PostCard";
import { ArticleJsonLd } from "@/components/seo/JsonLd";
import { toast } from "@/components/shared/Toast";
import DOMPurify from "dompurify";
import { blogApi, type BlogPostDto } from "@/services/blog-api";

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "a",
    "strong",
    "em",
    "u",
    "s",
    "blockquote",
    "pre",
    "code",
    "img",
    "br",
    "hr",
    "span",
    "div",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "sub",
    "sup",
  ],
  ALLOWED_ATTR: [
    "href",
    "src",
    "alt",
    "class",
    "target",
    "rel",
    "width",
    "height",
  ],
  ALLOW_DATA_ATTR: false,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

function BlogPostNotFound({
  locale,
  backLabel,
}: {
  locale: string;
  backLabel: string;
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [catAnimation, setCatAnimation] = useState<object | null>(null);

  useEffect(() => {
    import("@/public/lotties/cat.json").then((m) => setCatAnimation(m.default));
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main
        className="flex-1 flex flex-col items-center justify-center px-4"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        <div className="mb-8">
          {catAnimation && (
            <Lottie
              lottieRef={lottieRef}
              animationData={catAnimation}
              loop
              autoplay
              style={{ width: 350, height: 350 }}
            />
          )}
        </div>

        <h1 className="text-2xl font-bold text-[#171717] mb-3 text-center">
          {locale === "fr" ? "Article introuvable" : "Post not found"}
        </h1>

        <p className="text-gray-500 mb-8 text-center max-w-md leading-relaxed">
          {locale === "fr"
            ? "Cet article a peut-être été déplacé ou n'est plus disponible. Pas de panique, il y a plein d'autres choses à lire."
            : "This post may have been moved or is no longer available. Don't worry, there's plenty more to read."}
        </p>

        <Link
          href="/blog"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
        >
          <NavArrowLeft className="w-5 h-5" />
          {backLabel}
        </Link>

        <div className="mt-4">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-[#171717] transition-colors"
          >
            {locale === "fr" ? "Retour à l'accueil" : "Go to homepage"}
          </Link>
        </div>
      </main>
    </div>
  );
}

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
  const [readProgress, setReadProgress] = useState(0);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostDto[]>([]);

  // Track reading progress based on page scroll
  useEffect(() => {
    if (!post) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setReadProgress(100);
        return;
      }
      const progress = Math.min(
        100,
        Math.max(0, (scrollTop / docHeight) * 100),
      );
      setReadProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [post]);

  useEffect(() => {
    const loadPost = async () => {
      setIsLoading(true);
      const response = await blogApi.getPostBySlug(slug, locale);
      if (response.data) {
        setPost(response.data);
      } else {
        // Fallback: try alternate locale if current locale not found
        const fallbackLocale = locale === "en" ? "fr" : "en";
        const fallbackResponse = await blogApi.getPostBySlug(
          slug,
          fallbackLocale,
        );
        if (fallbackResponse.data) {
          setPost(fallbackResponse.data);
        } else {
          setNotFound(true);
        }
      }
      setIsLoading(false);
    };

    loadPost();
  }, [slug, locale]);

  // Fetch related posts by first tag
  useEffect(() => {
    if (!post || post.tags.length === 0) return;

    const loadRelated = async () => {
      try {
        const response = await blogApi.getPublishedPosts(locale, 1, 4, post.tags[0]);
        if (response.data?.items) {
          const filtered = response.data.items
            .filter((p) => p.slug !== post.slug)
            .slice(0, 3);
          setRelatedPosts(filtered);
        }
      } catch {
        // Related posts are non-critical — fail silently
      }
    };

    loadRelated();
  }, [post, locale]);

  if (isLoading) {
    return <LoadingFullscreen />;
  }

  if (notFound || !post) {
    return <BlogPostNotFound locale={locale} backLabel={t("backToBlog")} />;
  }

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/blog/${post.slug}`
      : `/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedTitle = encodeURIComponent(post.title);

  const handleShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      toast.success(t("linkCopied"));
    } catch {
      // Fallback silently
    }
  };

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

      {/* Reading progress bar */}
      {readProgress > 0 && (
        <div className="fixed top-16 left-0 right-0 z-[101] h-1 bg-gray-200/50">
          <div
            className="h-full bg-[#5E53E0] transition-[width] duration-150 ease-out"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      )}

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

          {/* Title */}
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

            {/* Share row */}
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

          {/* Content */}
          {post.content ? (
            <article
              className="prose prose-lg max-w-none prose-headings:font-bold prose-a:text-[#171717] prose-img:rounded-lg"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(post.content, SANITIZE_CONFIG),
              }}
            />
          ) : (
            <p className="text-gray-500 italic">
              {locale === "fr"
                ? "Contenu non disponible."
                : "Content not available."}
            </p>
          )}

          {/* Soft CTA */}
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
      </main>

      <Footer />
    </div>
  );
}
