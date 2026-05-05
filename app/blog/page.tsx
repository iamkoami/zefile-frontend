export const runtime = "edge";

import { getLocale, getTranslations } from "next-intl/server";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import BlogListClient from "@/components/blog/BlogListClient";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import type { BlogPostDto } from "@/services/blog-api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const POSTS_PER_PAGE = 5;

interface BlogListResponse {
  data: BlogPostDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function fetchInitialPosts(locale: string): Promise<{ posts: BlogPostDto[]; totalPages: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const params = new URLSearchParams({ locale, page: '1', limit: POSTS_PER_PAGE.toString() });
    const response = await fetch(`${API_URL}/blog?${params}`, {
      next: { revalidate: 300 },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data: BlogListResponse = await response.json();
      return { posts: data.data, totalPages: data.meta.totalPages };
    }
  } catch {
    // Graceful fallback — page still renders, client will retry
  }
  return { posts: [], totalPages: 0 };
}

export default async function BlogListPage() {
  const locale = await getLocale();
  const t = await getTranslations("blog");
  const { posts, totalPages } = await fetchInitialPosts(locale);

  const highlight = (chunks: React.ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";
  const localePrefix = locale === "fr" ? "/fr" : "";

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: `${SITE_URL}${localePrefix || "/"}` },
        { name: 'Blog', url: `${SITE_URL}${localePrefix}/blog` },
      ]} />
      <Header />

      <main className="flex-1">
        <PageHero title={t.rich("title", { highlight })} subtitle={t("subtitle")} />

        <div className="max-w-5xl mx-auto px-6 py-24">
          <BlogListClient initialPosts={posts} initialTotalPages={totalPages} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
