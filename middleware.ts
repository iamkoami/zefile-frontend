import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate a random nonce for CSP using Web Crypto API (edge-compatible).
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Build Content-Security-Policy header value.
 * Uses per-request nonce + strict-dynamic for script-src.
 */
function buildCsp(nonce: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${apiUrl} https://*.wasabisys.com`,
    `media-src 'self' blob: ${apiUrl} https://*.wasabisys.com`,
    `connect-src 'self' ${apiUrl} https://*.wasabisys.com ${posthogHost} https://eu.i.posthog.com https://us.i.posthog.com https://eu-assets.i.posthog.com https://us-assets.i.posthog.com https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`,
    `font-src 'self'`,
    `frame-src ${apiUrl} https://checkout.paystack.com https://www.google.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];

  return directives.join('; ');
}

/**
 * Middleware handles:
 * 1. Short link redirects (/z-{code} → /downloads?code=z-{code})
 * 2. Content-Security-Policy with per-request nonce
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /z-{shortCode} pattern — redirect to downloads page
  const shortLinkMatch = pathname.match(/^\/(z-[a-zA-Z0-9]+)$/);

  if (shortLinkMatch) {
    const fullCode = shortLinkMatch[1]; // Includes z- prefix

    const url = request.nextUrl.clone();
    url.pathname = '/downloads';
    url.searchParams.set('code', fullCode);

    // Add tracking params
    if (!url.searchParams.has('z_src')) {
      url.searchParams.set('z_src', 'link');
    }
    if (!url.searchParams.has('z_ts')) {
      url.searchParams.set('z_ts', Date.now().toString());
    }

    return NextResponse.redirect(url, 302);
  }

  // Generate per-request nonce for CSP
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Pass nonce to Next.js via request header — Next.js automatically
  // applies it as a nonce attribute on framework <script> tags.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Content-Security-Policy (dynamic, with per-request nonce)
  response.headers.set('Content-Security-Policy', csp);

  // Security headers (must be set here — middleware overrides next.config.ts headers)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Remove server technology fingerprint
  response.headers.delete('X-Powered-By');

  return response;
}

/**
 * Explicit route matcher for Cloudflare Pages compatibility.
 * Catch-all regex breaks static 500.html generation on @cloudflare/next-on-pages.
 * Update this list when adding new page routes.
 */
export const config = {
  matcher: [
    '/',
    '/about',
    '/advertisers',
    '/blog',
    '/blog/:path*',
    '/downloads/:path*',
    '/help',
    '/how-it-works',
    '/jobs',
    '/payment/:path*',
    '/press',
    '/pricing',
    '/privacy',
    '/terms',
    '/z-:path*',
  ],
};
