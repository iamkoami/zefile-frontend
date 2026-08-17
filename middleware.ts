import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// --- Platform status gate (server-side, zero-flash) ---

interface PlatformStatusData {
  maintenance: boolean;
  maintenanceMessage?: string;
  maintenanceEstimate?: string;
  maintenanceAllowDownloads?: boolean;
  waitlist: boolean;
  darkModeEnabled: boolean;
}

let statusCache: { data: PlatformStatusData; timestamp: number } | null = null;
const STATUS_CACHE_TTL = 30_000; // 30 seconds

/**
 * Fetch platform status from backend API with in-memory edge cache.
 * Fails open (returns null) if API is unreachable — normal page is served.
 */
async function fetchPlatformStatus(): Promise<PlatformStatusData | null> {
  if (statusCache && Date.now() - statusCache.timestamp < STATUS_CACHE_TTL) {
    return statusCache.data;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiUrl}/platform-settings/status`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return statusCache?.data ?? null;
    const data: PlatformStatusData = await res.json();
    statusCache = { data, timestamp: Date.now() };
    return data;
  } catch {
    return statusCache?.data ?? null;
  }
}

/** Paths that are real app routes (not creator profile handles) */
const KNOWN_APP_ROUTES = [
  '/downloads', '/deliver', '/about', '/pricing', '/contact-us', '/fr',
  '/blog', '/help', '/how-it-works', '/jobs', '/payment', '/presentation',
  '/press', '/privacy', '/r', '/review', '/security', '/terms', '/test-page',
  '/maintenance', '/waitlist',
];

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

  // ── Story 135.6 — the film player's manifest and segment origin ──────────────────────────
  //
  // ⚠ SHAKA'S FETCHES ARE GOVERNED BY `connect-src`, NOT `media-src`, AND THAT IS THE TRAP.
  //
  // Shaka does not put the manifest or the segments in a `src` attribute. It FETCHES them (XHR /
  // fetch) and appends the bytes to a `MediaSource`. So `media-src` covers only the blob: URL of
  // the MediaSource object assigned to the <video> element — which `media-src blob:` above
  // already allows — while every actual byte of the film is a `connect-src` decision.
  //
  // The failure mode is silent from the buyer's seat and invisible to every static check: a
  // correct player, a correct credential and correct segments produce a BLACK FRAME and one
  // console CSP violation.
  //
  // Under the SELF-HOSTED provider the manifest is `{BACKEND_URL}/stream/hls/{fileId}/master.m3u8`
  // and the segments sit under the same path, so `apiUrl` in connect-src already covers them and
  // nothing new is needed. Under CLOUDFLARE the manifest comes from
  // `https://{subdomain}.cloudflarestream.com/...`, which appears in NO directive at all — hence
  // this variable. It must be the same subdomain as the backend's
  // CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN, e.g. `https://customer-abc123.cloudflarestream.com`.
  //
  // Deliberately an exact origin and never `https:`. Widening to a scheme would let any host on
  // the internet feed bytes into the player, which is a materially worse trade than an env var.
  const streamOrigin = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_ORIGIN || '';

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
    // `streamOrigin` in media-src too: Cloudflare Stream falls back to native HLS on Safari/iOS,
    // where the manifest URL goes straight into the <video> element's src and never touches
    // MediaSource. That path is a media-src decision, and omitting it would leave the player
    // working everywhere except the platform most likely to take the fallback.
    `media-src 'self' blob: ${apiUrl}${cdnUrl ? ` ${cdnUrl}` : ''}${streamOrigin ? ` ${streamOrigin}` : ''}`,
    `connect-src 'self' ${apiUrl} ${wasabiEndpoint} ${posthogDomains} https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://www.google.com${streamOrigin ? ` ${streamOrigin}` : ''}`,
    `font-src 'self'`,
    `frame-src ${apiUrl} https://checkout.paystack.com https://checkout.startbutton.africa https://app.startbutton.io https://www.google.com https://challenges.cloudflare.com`,
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
 * Countries where ZeFile has a real payment rail. Must stay in sync with
 * SUPPORTED_COUNTRIES / REGIONAL_PRICING in services/subscription-api.ts and
 * with the options the CurrencySwitcher offers.
 */
const GEO_SUPPORTED_COUNTRIES = new Set(['NG', 'GH', 'KE', 'CI', 'TG', 'BJ']);

/** Client-readable (not HttpOnly) — the Zustand currency store reads it on hydrate. */
export const GEO_COUNTRY_COOKIE = 'zefile_geo_country';

/**
 * Resolve the visitor's country from Cloudflare's CF-IPCountry header.
 *
 * Returns null when there is nothing trustworthy to say — no header at all
 * (local dev, or any origin not behind Cloudflare), 'XX' (Cloudflare could not
 * determine it) or 'T1' (Tor exit node). Callers must treat null as "don't
 * touch the cookie" rather than "International", so a missing header never
 * overwrites a good value from an earlier request.
 *
 * A supported country returns its own code; anywhere else returns 'DEFAULT',
 * because International/USD is the honest answer for a country we cannot
 * charge in local currency.
 */
function resolveGeoCountry(request: NextRequest): string | null {
  const header = request.headers.get('cf-ipcountry');
  if (!header) return null;
  const code = header.toUpperCase();
  if (code === 'XX' || code === 'T1') return null;
  return GEO_SUPPORTED_COUNTRIES.has(code) ? code : 'DEFAULT';
}

/**
 * Attach the geo country cookie, mirroring the NEXT_LOCALE pattern above: only
 * Set-Cookie when the value actually changes, so steady-state responses stay
 * edge-cacheable.
 *
 * Returns true when a cookie was written. The caller MUST then make that single
 * response uncacheable via `geoCacheControl()` — see the note there for why Vary
 * cannot be relied on to do it.
 *
 * This never writes localStorage — an explicit choice in the CurrencySwitcher
 * always outranks geo, and the store enforces that on hydrate.
 */
function applyGeoCountryCookie(request: NextRequest, response: NextResponse): boolean {
  const geo = resolveGeoCountry(request);
  if (!geo) return false;
  if (request.cookies.get(GEO_COUNTRY_COOKIE)?.value === geo) return false;
  response.cookies.set(GEO_COUNTRY_COOKIE, geo, {
    path: '/',
    // Shorter than NEXT_LOCALE's year: where someone is can change, and a stale
    // country is worse than re-detecting it.
    maxAge: 30 * 24 * 60 * 60,
    sameSite: 'lax',
  });
  return true;
}

/**
 * Cache-Control for a response that may carry the geo cookie.
 *
 * A response containing a country-specific Set-Cookie must never be reusable by
 * anyone else, or a shared cache could hand one country's cookie to every
 * cookie-less visitor behind it. The usual guard for that is `Vary`, and this
 * middleware does set `CF-IPCountry` there — but that header does NOT survive to
 * the client on Cloudflare Pages. Verified on demo.zefile.io: the response
 * arrives with Next.js's own `vary: RSC, Next-Router-State-Tree, …,
 * accept-encoding`, while `Content-Language` from this same block does survive.
 * The adapter overwrites Vary after middleware runs, so Vary is kept as
 * belt-and-braces and the real guarantee is made here instead.
 *
 * Marking only the cookie-setting response private costs one uncacheable
 * request per visitor per 30 days; every subsequent response takes the normal
 * cacheable path because no Set-Cookie is emitted once the value matches.
 */
function geoCacheControl(geoCookieSet: boolean, cacheable: string): string {
  return geoCookieSet ? 'private, no-store' : cacheable;
}

/**
 * Middleware handles:
 * 1. Short link redirects (/z-{code} → /downloads?code=z-{code})
 * 2. Content-Security-Policy with per-request nonce
 * 3. SEO headers (Vary, Content-Language) for i18n content negotiation
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Case-insensitive redirect for app routes. /@handle (creator profiles) and
  // short codes legitimately use mixed case. Files with extensions (favicon,
  // og-image) keep their case so a typo 404s normally.
  //
  // Short codes are CASE-SENSITIVE: the DB stores "HkGXm2GHhB" and looks it up
  // with `=`, so lowercasing the path turns a working transfer into a 404
  // ("This transfer has vanished into thin air"). The old guard only matched
  // /z-AbC at the ROOT, which missed every route that carries the code in a
  // later segment — /downloads/<uuid>/z-AbC, /r/AbC, /review/AbC — i.e. the
  // canonical download URL the short link ultimately redirects to. Matching on
  // the "z-" prefix alone is also not enough, because /review/<code> and
  // /r/<code> can carry a bare code with no prefix.
  const SHORT_CODE_PREFIX = process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || 'z-';
  const CODE_BEARING_ROUTES = ['/downloads/', '/r/', '/review/'];
  const carriesShortCode =
    CODE_BEARING_ROUTES.some((p) => pathname.startsWith(p)) ||
    pathname
      .split('/')
      .some((seg) =>
        seg.toLowerCase().startsWith(SHORT_CODE_PREFIX.toLowerCase())
      );

  const hasExtension = pathname.includes('.') && !pathname.startsWith('/fr/');
  if (
    !hasExtension &&
    !pathname.startsWith('/@') &&
    !carriesShortCode &&
    pathname !== pathname.toLowerCase()
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  // --- Platform status gate (server-side, prevents home page flash) ---
  // Normalize pathname: strip /fr/ prefix for route matching
  const normalizedPath = pathname.startsWith('/fr/')
    ? pathname.slice(3)
    : pathname === '/fr' ? '/' : pathname;

  const isGateRoute = normalizedPath === '/maintenance' || normalizedPath === '/waitlist';

  // Skip status check for static files (have extension like .ico, .png, .js)
  const isStaticFile = pathname.includes('.') && !pathname.startsWith('/fr/');

  if (!isStaticFile) {
    const status = await fetchPlatformStatus();

    if (status) {
      const isDownloadPage = normalizedPath.startsWith('/downloads');
      const isProfilePage =
        normalizedPath.startsWith('/@') ||
        (/^\/[a-zA-Z0-9_-]+$/.test(normalizedPath) &&
          !KNOWN_APP_ROUTES.some(r => normalizedPath === r || normalizedPath.startsWith(r + '/')));

      // Determine gate target: maintenance takes priority over waitlist
      let gateTarget: string | null = null;

      if (status.maintenance && !isGateRoute) {
        const downloadExempt = isDownloadPage && status.maintenanceAllowDownloads;
        if (!downloadExempt && !isProfilePage) {
          gateTarget = '/maintenance';
        }
      }

      if (!gateTarget && status.waitlist && !isGateRoute) {
        gateTarget = '/waitlist';
      }

      if (gateTarget) {
        const nonce = generateNonce();
        const csp = buildCsp(nonce);
        const url = request.nextUrl.clone();
        url.pathname = gateTarget;

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-nonce', nonce);

        if (gateTarget === '/maintenance') {
          if (status.maintenanceMessage) requestHeaders.set('x-maintenance-message', status.maintenanceMessage);
          if (status.maintenanceEstimate) requestHeaders.set('x-maintenance-estimate', status.maintenanceEstimate);
        }

        const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
        response.headers.set('Content-Security-Policy', csp);
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        response.headers.set('Cache-Control', 'no-store');
        response.headers.delete('X-Powered-By');

        // Preserve French locale for /fr paths. Only Set-Cookie when the
        // existing value differs — avoids tagging every response with
        // Set-Cookie, which would prevent Cloudflare from edge-caching.
        if (pathname.startsWith('/fr') && request.cookies.get('NEXT_LOCALE')?.value !== 'fr') {
          response.cookies.set('NEXT_LOCALE', 'fr', { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
        }

        return response;
      }

      // Redirect away from gate pages when not active
      if (normalizedPath === '/maintenance' && !status.maintenance) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      if (normalizedPath === '/waitlist' && !status.waitlist) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

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

    // Profile pages (/@handle) need short cache since visibility can change anytime
    const isProfileRoute = canonicalPath.startsWith('/@') || /^\/[a-zA-Z0-9_-]+$/.test(canonicalPath);
    const cacheControl = isProfileRoute
      ? 'public, s-maxage=30, stale-while-revalidate=60'
      : 'public, s-maxage=3600, stale-while-revalidate=86400';

    // Only Set-Cookie when the existing value differs — avoids tagging every
    // /fr/* response with Set-Cookie, which would prevent Cloudflare from
    // edge-caching the response. Crawlers without cookies get a clean
    // cacheable response; users transitioning EN → FR still get the cookie
    // set on their first /fr visit so subsequent / navigation stays in FR.
    if (request.cookies.get('NEXT_LOCALE')?.value !== 'fr') {
      response.cookies.set('NEXT_LOCALE', 'fr', { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
    }
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const geoCookieSet = applyGeoCountryCookie(request, response);
    response.headers.set('Vary', 'Accept-Language, Cookie, CF-IPCountry');
    response.headers.set('Content-Language', 'fr');
    response.headers.set('Cache-Control', geoCacheControl(geoCookieSet, cacheControl));
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
      const geoCookieSet = applyGeoCountryCookie(request, response);
      response.headers.set('Vary', 'Accept-Language, Cookie, CF-IPCountry');
      response.headers.set('Content-Language', detectedLocale);
      response.headers.set(
        'Cache-Control',
        geoCacheControl(geoCookieSet, 'public, s-maxage=30, stale-while-revalidate=60'),
      );
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

  // Currency follows the visitor's country, resolved from Cloudflare's edge.
  // When this writes a cookie the response is forced private below — see
  // geoCacheControl() for why Vary alone cannot carry that guarantee here.
  const geoCookieSet = applyGeoCountryCookie(request, response);

  // SEO: Signal language negotiation to search engines and CDN caches.
  // Content varies by Accept-Language (i18n fallback) and Cookie (NEXT_LOCALE);
  // the geo cookie above additionally varies the response by CF-IPCountry.
  response.headers.set('Vary', 'Accept-Language, Cookie, CF-IPCountry');

  // SEO: Set Content-Language based on detected locale (cookie > Accept-Language > default)
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const detectedLocale = localeCookie === 'fr' ? 'fr' : parseAcceptLanguage(request.headers.get('Accept-Language'));
  response.headers.set('Content-Language', detectedLocale);

  // Cache-control for HTML pages — prevent stale content from heuristic caching
  // (Cloudflare Pages _headers only applies to static files, not dynamic routes)
  response.headers.set(
    'Cache-Control',
    geoCacheControl(geoCookieSet, 'public, s-maxage=3600, stale-while-revalidate=86400'),
  );

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
