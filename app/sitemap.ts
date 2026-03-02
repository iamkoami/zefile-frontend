import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Shared OG image for pages that use the default brand image
const ogImage: MetadataRoute.Sitemap[number]['images'] = [
  `${SITE_URL}/og-image.png`,
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      images: ogImage,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: ogImage,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      images: ogImage,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      images: ogImage,
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      images: ogImage,
    },
    {
      url: `${SITE_URL}/help`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
      images: ogImage,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/contact-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
      images: ogImage,
    },
  ];

  // Fetch published blog post slugs
  let blogUrls: MetadataRoute.Sitemap = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_URL}/blog/sitemap`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const posts: Array<{ slug: string; locale: string; updatedAt: string | null }> =
        await response.json();
      blogUrls = posts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Graceful fallback — sitemap works without blog posts
  }

  return [...staticUrls, ...blogUrls];
}
