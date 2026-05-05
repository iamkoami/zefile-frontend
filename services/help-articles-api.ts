/**
 * Help Articles API Service
 *
 * Public read-only client for the help-center backend (`/help/*` on the API).
 * Backed by the existing `SupportArticle` entity which is bilingual at the
 * row level (titleEn / titleFr / contentEn / contentFr).
 *
 * Edge route files should NOT import from this module (it pulls in
 * `api-client.ts` → `lib/sentry.ts` → @sentry/react which uses Node APIs).
 * Use raw `fetch` in edge routes and import types from
 * `./help-articles-types.ts` instead.
 */

import { apiClient, type ApiResponse } from "./api-client";
import type {
  HelpArticleDto,
  HelpCategory,
  HelpCategorySummaryDto,
  HelpSitemapEntryDto,
} from "./help-articles-types";

export type {
  HelpArticleDto,
  HelpCategory,
  HelpCategorySummaryDto,
  HelpSitemapEntryDto,
};
export { HELP_CATEGORIES, localizeArticle } from "./help-articles-types";

class HelpArticlesApi {
  async listCategories(): Promise<ApiResponse<HelpCategorySummaryDto[]>> {
    return apiClient.get<HelpCategorySummaryDto[]>("/help/categories");
  }

  async listByCategory(category: HelpCategory): Promise<ApiResponse<HelpArticleDto[]>> {
    return apiClient.get<HelpArticleDto[]>(`/help/category/${category}`);
  }

  async getBySlug(slug: string, locale: "en" | "fr"): Promise<ApiResponse<HelpArticleDto>> {
    return apiClient.get<HelpArticleDto>(`/help/article/${slug}?locale=${locale}`);
  }

  async getSitemap(): Promise<ApiResponse<HelpSitemapEntryDto[]>> {
    return apiClient.get<HelpSitemapEntryDto[]>("/help/sitemap");
  }
}

export const helpArticlesApi = new HelpArticlesApi();
