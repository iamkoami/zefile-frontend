/**
 * Type and constant definitions for help articles, separated from
 * `help-articles-api.ts` so they can be imported from edge-runtime route
 * files without pulling in the Sentry-bundled `api-client.ts` chain.
 *
 * Use `helpArticlesApi` from `help-articles-api.ts` from client/non-edge code.
 * In edge route files, do raw `fetch` calls and reuse only these types.
 */

export type HelpCategory =
  | "general"
  | "download"
  | "payment"
  | "payout"
  | "account"
  | "technical";

export const HELP_CATEGORIES: HelpCategory[] = [
  "general",
  "download",
  "payment",
  "payout",
  "account",
  "technical",
];

export interface HelpArticleDto {
  id: string;
  titleEn: string;
  titleFr: string;
  slugEn: string;
  slugFr: string;
  contentEn: string;
  contentFr: string;
  category: HelpCategory;
  tags: string[];
  status: "PUBLISHED" | "DRAFT" | "AI_PROPOSED" | "ARCHIVED";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface HelpCategorySummaryDto {
  category: HelpCategory;
  articleCount: number;
}

export interface HelpSitemapEntryDto {
  slugEn: string;
  slugFr: string;
  category: HelpCategory;
  updatedAt: string;
}

/** Pick the locale-correct title / slug / content from a bilingual row. */
export function localizeArticle(article: HelpArticleDto, locale: "en" | "fr") {
  if (locale === "fr") {
    return {
      title: article.titleFr,
      slug: article.slugFr,
      content: article.contentFr,
    };
  }
  return {
    title: article.titleEn,
    slug: article.slugEn,
    content: article.contentEn,
  };
}
