/**
 * Blog API Service
 * Public endpoints for reading published blog posts
 */

import { apiClient, type ApiResponse } from './api-client';

export interface BlogPostDto {
  id: string;
  title: string;
  slug: string;
  locale: string;
  excerpt?: string | null;
  content?: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  status: string;
  tags: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt?: string | null;
  readingTimeMinutes?: number | null;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface BlogListResponseDto {
  items: BlogPostDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SitemapSlugDto {
  slug: string;
  locale: string;
  updatedAt: string | null;
}

class BlogApi {
  async getPublishedPosts(
    locale: string,
    page = 1,
    limit = 10,
    tag?: string,
  ): Promise<ApiResponse<BlogListResponseDto>> {
    const params = new URLSearchParams({
      locale,
      page: page.toString(),
      limit: limit.toString(),
    });
    if (tag) params.set('tag', tag);
    return apiClient.get<BlogListResponseDto>(`/blog?${params.toString()}`);
  }

  async getPostBySlug(
    slug: string,
    locale: string,
  ): Promise<ApiResponse<BlogPostDto>> {
    return apiClient.get<BlogPostDto>(`/blog/${slug}?locale=${locale}`);
  }

  async getSitemapSlugs(): Promise<ApiResponse<SitemapSlugDto[]>> {
    return apiClient.get<SitemapSlugDto[]>('/blog/sitemap');
  }
}

export const blogApi = new BlogApi();
