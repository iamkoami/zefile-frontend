import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Build Content-Security-Policy with allowed domains
const buildCSP = () => {
  const isDev = process.env.NODE_ENV === 'development';

  // Base directives
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      isDev ? "'unsafe-eval'" : '', // Only in dev mode
      'https://js.paystack.co', // Paystack SDK
      'https://checkout.paystack.com',
      'https://*.posthog.com', // PostHog analytics
      'https://eu-assets.i.posthog.com',
      'https://us-assets.i.posthog.com',
      'https://static.cloudflareinsights.com', // Cloudflare Web Analytics
    ].filter(Boolean),
    'style-src': ["'self'", "'unsafe-inline'"], // Next.js uses inline styles
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.wasabisys.com', // Wasabi S3
      'https://s3.eu-central-1.wasabisys.com',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      process.env.NEXT_PUBLIC_API_URL || 'https://api.zefile.io',
      'https://*.wasabisys.com', // Wasabi S3 for uploads
      'https://s3.eu-central-1.wasabisys.com',
      'https://api.paystack.co', // Paystack API
      'https://*.posthog.com', // PostHog analytics
      'https://eu.i.posthog.com',
      'https://eu-assets.i.posthog.com',
      'https://us.i.posthog.com',
      'https://us-assets.i.posthog.com',
      'https://static.cloudflareinsights.com', // Cloudflare Web Analytics
    ],
    'media-src': [
      "'self'",
      'blob:',
      'https://*.wasabisys.com', // Media files from S3
      'https://s3.eu-central-1.wasabisys.com',
    ],
    'frame-src': [
      "'self'",
      'https://checkout.paystack.com', // Paystack checkout iframe
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    // Only upgrade to HTTPS in production (causes SSL errors on localhost)
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  };

  // Build CSP string
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
};

const nextConfig: NextConfig = {
  // Disable image optimization for Cloudflare Pages
  images: {
    unoptimized: true,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: buildCSP(),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
