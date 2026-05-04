import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Shared OG image for pages that use the default brand image
const ogImage: MetadataRoute.Sitemap[number]['images'] = [
  `${SITE_URL}/og-image.png`,
];

/**
 * Helper to add hreflang alternates for EN/FR.
 * Middleware rewrites /fr/<path> → /<path> with NEXT_LOCALE=fr, so /fr/<path>
 * is a real, distinct URL serving the French translation. The alternates point
 * to those distinct URLs so search engines can index each language variant.
 */
function withAlternates(path: string) {
  const enUrl = `${SITE_URL}${path}`;
  const frUrl = `${SITE_URL}/fr${path === '/' ? '' : path}`;
  return {
    languages: {
      en: enUrl,
      fr: frUrl,
      'x-default': enUrl,
    } as Record<string, string>,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      images: ogImage,
      alternates: withAlternates(`/`),
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      images: ogImage,
      alternates: withAlternates(`/pricing`),
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      images: ogImage,
      alternates: withAlternates(`/blog`),
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      images: ogImage,
      alternates: withAlternates(`/about`),
    },
    {
      url: `${SITE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      images: ogImage,
      alternates: withAlternates(`/how-it-works`),
    },
    {
      url: `${SITE_URL}/help`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
      images: ogImage,
      alternates: withAlternates(`/help`),
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: withAlternates(`/terms`),
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'yearly',
      priority: 0.3,
      alternates: withAlternates(`/privacy`),
    },
    {
      url: `${SITE_URL}/contact-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
      images: ogImage,
      alternates: withAlternates(`/contact-us`),
    },
    {
      url: `${SITE_URL}/security`,
      lastModified: new Date('2026-01-15'),
      changeFrequency: 'yearly',
      priority: 0.4,
      alternates: withAlternates(`/security`),
    },
    {
      url: `${SITE_URL}/press`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
      alternates: withAlternates(`/press`),
    },
    {
      url: `${SITE_URL}/jobs`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
      alternates: withAlternates(`/jobs`),
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
        alternates: withAlternates(`/blog/${post.slug}`),
      }));
    }
  } catch {
    // Graceful fallback — sitemap works without blog posts
  }

  // Fetch indexable creator profile handles
  let creatorUrls: MetadataRoute.Sitemap = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_URL}/creators/sitemap`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      const creators: Array<{ handle: string; updatedAt: string }> = await response.json();
      creatorUrls = creators.map((creator) => ({
        url: `${SITE_URL}/@${creator.handle}`,
        lastModified: creator.updatedAt ? new Date(creator.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        alternates: withAlternates(`/@${creator.handle}`),
      }));
    }
  } catch {
    // Graceful fallback — sitemap works without creator profiles
  }

  return [...staticUrls, ...blogUrls, ...creatorUrls];
}
