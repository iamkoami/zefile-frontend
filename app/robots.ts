import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';
const isProduction = SITE_URL === 'https://zefile.io';

// NOTE: Cloudflare Pages prepends a managed robots.txt section with Content-Signal
// directives and AI bot blocks. That section already handles GPTBot, CCBot, ClaudeBot,
// Amazonbot, Google-Extended, Bytespider, and meta-externalagent.
// To avoid duplicate User-agent: * blocks (undefined per RFC 9309), either:
//   1. Disable Cloudflare managed robots.txt in Pages dashboard (Settings > Scrape Shield)
//   2. Or keep both sections as-is (Cloudflare's block uses Allow: /, ours is more specific)
// We omit AI bot rules here to avoid duplication with the Cloudflare managed section.

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
        allow: [
          '/',
          '/about',
          '/pricing',
          '/blog',
          '/help',
          '/how-it-works',
          '/privacy',
          '/terms',
          '/contact-us',
        ],
        disallow: [
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
        ],
      },
      {
        userAgent: 'Googlebot',
        disallow: ['/download/', '/transfer/', '/dashboard/', '/z-'],
      },
      {
        userAgent: 'Bingbot',
        disallow: ['/download/', '/transfer/', '/dashboard/', '/z-'],
      },
      // AI training crawlers are blocked by Cloudflare's managed robots.txt section.
      // Only ChatGPT-User and anthropic-ai are not in Cloudflare's list, so keep them here.
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
