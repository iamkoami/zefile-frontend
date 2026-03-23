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
  const cdnDomain = process.env.NEXT_PUBLIC_CDN_DOMAIN || '';
  const cdnUrl = cdnDomain ? `https://${cdnDomain}` : '';
  // Wasabi S3 endpoint — only in connect-src for direct presigned-URL uploads.
  // Not exposed in img-src/media-src (thumbnails & previews route through API/CDN).
  const wasabiEndpoint = process.env.NEXT_PUBLIC_WASABI_ENDPOINT || 'https://s3.eu-central-1.wasabisys.com';

  // Deduplicate PostHog domains (posthogHost may overlap with hardcoded ingest endpoints)
  const posthogDomains = [...new Set([
    posthogHost,
    'https://eu.i.posthog.com',
    'https://us.i.posthog.com',
    'https://eu-assets.i.posthog.com',
    'https://us-assets.i.posthog.com',
  ].filter(Boolean))].join(' ');

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.google.com https://www.gstatic.com${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    // style-src 'unsafe-inline' is required: Next.js injects inline <style> tags for
    // styled-jsx and framework styles, and TailwindCSS generates inline style attributes.
    // CSP Level 2 hashes/nonces for styles are not supported by Next.js's build pipeline.
    // Investigated in Epic 46-11: no viable alternative without breaking the UI.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${apiUrl}${cdnUrl ? ` ${cdnUrl}` : ''}`,
    `media-src 'self' blob: ${apiUrl}${cdnUrl ? ` ${cdnUrl}` : ''}`,
    `connect-src 'self' ${apiUrl} ${wasabiEndpoint} ${posthogDomains} https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://www.google.com`,
    `font-src 'self'`,
    `frame-src ${apiUrl} https://checkout.paystack.com https://checkout.startbutton.africa https://app.startbutton.io https://www.google.com`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join('; ');
}

/**
 * Parse Accept-Language header to detect preferred locale.
 * Returns 'fr' if French is preferred, otherwise 'en'.
 */
function parseAcceptLanguage(header: string | null): 'en' | 'fr' {
  if (!header) return 'en';
  const languages = header.split(',').map((lang) => {
    const [code, q] = lang.trim().split(';q=');
    return { code: code.trim().toLowerCase().split('-')[0], q: q ? parseFloat(q) : 1.0 };
  });
  languages.sort((a, b) => b.q - a.q);
  for (const { code } of languages) {
    if (code === 'fr') return 'fr';
    if (code === 'en') return 'en';
  }
  return 'en';
}

/**
 * Middleware handles:
 * 1. Short link redirects (/z-{code} → /downloads?code=z-{code})
 * 2. Content-Security-Policy with per-request nonce
 * 3. SEO headers (Vary, Content-Language) for i18n content negotiation
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /fr prefix — French locale URLs for SEO indexability.
  // Rewrites /fr/* to /* but injects NEXT_LOCALE=fr into the request
  // so getLocale() returns 'fr' and the page renders in French.
  if (pathname === '/fr' || pathname.startsWith('/fr/')) {
    const nonce = generateNonce();
    const csp = buildCsp(nonce);
    const canonicalPath = pathname === '/fr' ? '/' : pathname.slice(3);

    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;

    const requestHeaders = new Headers(request.headers);
    // Override cookie so getLocale() returns 'fr'
    const existingCookies = requestHeaders.get('cookie') || '';
    const newCookies = existingCookies.includes('NEXT_LOCALE=')
      ? existingCookies.replace(/NEXT_LOCALE=[^;]*(;|$)/, `NEXT_LOCALE=fr$1`)
      : existingCookies ? `${existingCookies}; NEXT_LOCALE=fr` : 'NEXT_LOCALE=fr';
    requestHeaders.set('cookie', newCookies);
    requestHeaders.set('x-nonce', nonce);
    requestHeaders.set('x-locale', 'fr');
    requestHeaders.set('x-canonical-path', canonicalPath);

    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });

    response.cookies.set('NEXT_LOCALE', 'fr', { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Vary', 'Accept-Language, Cookie');
    response.headers.set('Content-Language', 'fr');
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    response.headers.delete('X-Powered-By');
    return response;
  }

  // Handle /@handle pattern — rewrite to /(profile)/[handle] route
  if (pathname.startsWith('/@')) {
    const handle = pathname.slice(2).replace(/\/+$/, ''); // Strip trailing slashes
    if (handle && /^[a-zA-Z0-9_-]+$/.test(handle)) {
      const nonce = generateNonce();
      const csp = buildCsp(nonce);

      const url = request.nextUrl.clone();
      url.pathname = `/${handle}`;

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-nonce', nonce);
      requestHeaders.set('x-canonical-path', pathname);

      const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
      const detectedLocale = localeCookie === 'fr' ? 'fr' : parseAcceptLanguage(request.headers.get('Accept-Language'));
      requestHeaders.set('x-locale', detectedLocale);

      const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });

      response.headers.set('Content-Security-Policy', csp);
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      response.headers.set('Vary', 'Accept-Language, Cookie');
      response.headers.set('Content-Language', detectedLocale);
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      response.headers.delete('X-Powered-By');
      return response;
    }
  }

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
  // Pass canonical path so layout.tsx can build correct hreflang URLs
  requestHeaders.set('x-canonical-path', pathname);
  requestHeaders.set('x-locale', 'en');

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
  // X-XSS-Protection intentionally removed — deprecated header, CSP covers this.

  // SEO: Signal language negotiation to search engines and CDN caches.
  // Content varies by Accept-Language (i18n fallback) and Cookie (NEXT_LOCALE).
  response.headers.set('Vary', 'Accept-Language, Cookie');

  // SEO: Set Content-Language based on detected locale (cookie > Accept-Language > default)
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const detectedLocale = localeCookie === 'fr' ? 'fr' : parseAcceptLanguage(request.headers.get('Accept-Language'));
  response.headers.set('Content-Language', detectedLocale);

  // Cache-control for HTML pages — prevent stale content from heuristic caching
  // (Cloudflare Pages _headers only applies to static files, not dynamic routes)
  response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  // Remove server technology fingerprint
  response.headers.delete('X-Powered-By');

  return response;
}

/**
 * Route matcher — covers all page routes including 404/not-found.
 * Next.js automatically excludes _next/static, _next/image, and public/ files.
 * Note: complex negative-lookahead regex (e.g. /((?!_next|...).*)) breaks
 * @cloudflare/next-on-pages static 500.html generation — simple segment
 * patterns like /:path* are safe.
 */
export const config = {
  matcher: ['/:path*', '/r/:path*'],
};
