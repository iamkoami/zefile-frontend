import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Build CSP header with per-request nonce.
 * Replaces 'unsafe-inline' in script-src with nonce-based policy.
 */
function buildCspHeader(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      isDev ? "'unsafe-eval'" : '',
      'https://js.paystack.co',
      'https://checkout.paystack.com',
      'https://*.posthog.com',
      'https://eu-assets.i.posthog.com',
      'https://us-assets.i.posthog.com',
      'https://static.cloudflareinsights.com',
    ].filter(Boolean),
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      process.env.NEXT_PUBLIC_API_URL || 'https://api.zefile.io',
      'https://api-dev.zefile.io',
      'https://*.wasabisys.com',
      'https://s3.eu-central-1.wasabisys.com',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      process.env.NEXT_PUBLIC_API_URL || 'https://api.zefile.io',
      'https://api-dev.zefile.io',
      'https://*.wasabisys.com',
      'https://s3.eu-central-1.wasabisys.com',
      'https://api.paystack.co',
      'https://*.posthog.com',
      'https://eu.i.posthog.com',
      'https://eu-assets.i.posthog.com',
      'https://us.i.posthog.com',
      'https://us-assets.i.posthog.com',
      'https://static.cloudflareinsights.com',
    ],
    'media-src': [
      "'self'",
      'blob:',
      process.env.NEXT_PUBLIC_API_URL || 'https://api.zefile.io',
      'https://api-dev.zefile.io',
      'https://*.wasabisys.com',
      'https://s3.eu-central-1.wasabisys.com',
    ],
    'frame-src': ["'self'", 'https://checkout.paystack.com'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  };

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Middleware handles:
 * 1. Short link redirects (/z-{code} → /downloads?code=z-{code})
 * 2. CSP nonce generation (per-request nonce for script-src)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /z-{shortCode} pattern — redirect before nonce (no HTML response)
  const shortLinkMatch = pathname.match(/^\/(z-[a-zA-Z0-9]+)$/);

  if (shortLinkMatch) {
    const fullCode = shortLinkMatch[1];

    const url = request.nextUrl.clone();
    url.pathname = '/downloads';
    url.searchParams.set('code', fullCode);

    if (!url.searchParams.has('z_src')) {
      url.searchParams.set('z_src', 'link');
    }
    if (!url.searchParams.has('z_ts')) {
      url.searchParams.set('z_ts', Date.now().toString());
    }

    return NextResponse.redirect(url, 302);
  }

  // Generate per-request nonce for CSP
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = buildCspHeader(nonce);

  // Pass nonce to Next.js via request header (auto-applied to framework scripts)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP on the response
  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except static files:
     * - _next/static (framework JS/CSS bundles)
     * - _next/image (optimized images)
     * - Static assets by extension
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|ico|json|txt|xml|css|js|map)).*)',
  ],
};
