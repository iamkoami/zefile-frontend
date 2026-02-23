import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';
const isProduction = SITE_URL === 'https://zefile.io';

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
      // Block AI training crawlers
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'ClaudeBot', disallow: '/' },
      { userAgent: 'Amazonbot', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
