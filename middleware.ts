import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware to handle short link redirects
 * Matches Cloudflare Page Rule: zefile.io/z-* → zefile.io/downloads?code=$1
 *
 * This handles local development where Cloudflare rules aren't available.
 * In production, Cloudflare Page Rules handle this redirect.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /z-{shortCode} pattern
  // Match: /z-aBc12XyZ45 (z- prefix followed by alphanumeric characters)
  const shortLinkMatch = pathname.match(/^\/(z-[a-zA-Z0-9]+)$/);

  if (shortLinkMatch) {
    const fullCode = shortLinkMatch[1]; // Includes z- prefix (e.g., "z-KacqsK9MHn")

    // Build redirect URL matching Cloudflare rule
    const url = request.nextUrl.clone();
    url.pathname = '/downloads';
    url.searchParams.set('code', fullCode);

    // Add tracking params if not present
    if (!url.searchParams.has('z_src')) {
      url.searchParams.set('z_src', 'link');
    }
    if (!url.searchParams.has('z_ts')) {
      url.searchParams.set('z_ts', Date.now().toString());
    }

    return NextResponse.redirect(url, 302);
  }

  return NextResponse.next();
}

// Only run middleware on paths that could be short links
export const config = {
  matcher: [
    // Match /z-* pattern
    '/z-:path*',
  ],
};
