'use client';

export const runtime = 'edge';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Custom 404 Not Found Page
 * Handles client-side routing for dynamic routes in static export
 *
 * This page is served by Cloudflare Pages for any non-existent routes,
 * allowing our SPA to handle dynamic routes like /z-{code} and /downloads/{code}
 */
export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = window.location.search;

    // Handle /z-{code} short links - redirect to /downloads?code={code}
    if (pathname?.startsWith('/z-')) {
      const shortCode = pathname.replace('/z-', '');
      router.replace(`/downloads?code=${shortCode}${searchParams}`);
      return;
    }

    // Handle /downloads/{code} - redirect to /downloads?code={code}
    if (pathname?.startsWith('/downloads/')) {
      const shortCode = pathname.replace('/downloads/', '');
      router.replace(`/downloads?code=${shortCode}${searchParams ? '&' + searchParams.substring(1) : ''}`);
      return;
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-6">Page not found</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
