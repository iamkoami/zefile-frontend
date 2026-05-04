import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';
const isProduction = SITE_URL === 'https://zefile.io';

// Cloudflare Pages prepends a managed robots.txt section (Scrape Shield) that blocks
// GPTBot, ClaudeBot, Google-Extended, CCBot, Bytespider, etc. with `Disallow: /`.
// Per RFC 9309, the most-specific User-agent section wins, so the explicit blocks below
// for GPTBot / ClaudeBot / OAI-SearchBot override the Cloudflare wildcard for those UAs.
// To eliminate the duplicate `User-agent: *` block entirely, disable the Cloudflare
// managed robots.txt under: Pages → Settings → Scrape Shield → AI Scrape Block.

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/pricing',
  '/blog',
  '/help',
  '/how-it-works',
  '/privacy',
  '/terms',
  '/contact-us',
  '/security',
  '/press',
];

const PRIVATE_PATHS = [
  '/z-',
  '/download/',
  '/download/*',
  '/transfer/',
  '/transfer/*',
  '/t/',
  '/t/*',
  '/*?code=',
  '/*?transfer=',
  '/*?shortCode=',
  '/*?download=',
  '/dashboard',
  '/dashboard/',
  '/account',
  '/account/',
  '/profile',
  '/profile/',
  '/settings',
  '/settings/',
  '/admin',
  '/admin/',
  '/api/',
  '/api/*',
];

export default function robots(): MetadataRoute.Robots {
  // Block all crawlers on staging/dev environments
  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC_PATHS,
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Googlebot',
        disallow: ['/download/', '/transfer/', '/dashboard/', '/z-'],
      },
      {
        userAgent: 'Bingbot',
        disallow: ['/download/', '/transfer/', '/dashboard/', '/z-'],
      },
      // AI search/grounding crawlers — allow on public surface, block private routes.
      // These crawlers fetch live for search citations (ChatGPT, Claude, Perplexity AI Overviews).
      // Without these explicit blocks the Cloudflare managed Disallow: / takes effect.
      { userAgent: 'GPTBot', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      { userAgent: 'OAI-SearchBot', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      { userAgent: 'ChatGPT-User', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      { userAgent: 'ClaudeBot', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      { userAgent: 'Claude-Web', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      { userAgent: 'PerplexityBot', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      { userAgent: 'Google-Extended', allow: PUBLIC_PATHS, disallow: PRIVATE_PATHS },
      // Training-only crawlers — keep fully blocked (Content-Signal: ai-train=no).
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      { userAgent: 'cohere-ai', disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
