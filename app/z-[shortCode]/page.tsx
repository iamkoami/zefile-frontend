'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Head from 'next/head';

/**
 * Generate static params for static export
 * Returns empty array to rely on client-side rendering for all short codes
 */
export function generateStaticParams() {
  return [];
}

/**
 * Short Link Handler Page
 * Handles incoming short links from zefile.co/z-{code}
 * Redirects to the full download page with tracking parameters
 */
export default function ShortLinkPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const shortCode = params?.shortCode as string;

    if (!shortCode) {
      router.push('/');
      return;
    }

    // Extract tracking parameters from URL
    const trackingParams = new URLSearchParams();

    // Copy existing tracking parameters
    const z_exp = searchParams?.get('z_exp');
    const z_sid = searchParams?.get('z_sid');
    const z_src = searchParams?.get('z_src');
    const z_network = searchParams?.get('z_network');
    const z_ts = searchParams?.get('z_ts');

    if (z_exp) trackingParams.set('z_exp', z_exp);
    if (z_sid) trackingParams.set('z_sid', z_sid);
    if (z_src) trackingParams.set('z_src', z_src);
    if (z_network) trackingParams.set('z_network', z_network);
    if (z_ts) trackingParams.set('z_ts', z_ts);

    // Add timestamp if not present
    if (!z_ts) {
      trackingParams.set('z_ts', Date.now().toString());
    }

    // Add source if not present
    if (!z_src) {
      trackingParams.set('z_src', 'link');
    }

    // Redirect to download page with short code and tracking params
    const queryString = trackingParams.toString();
    const redirectUrl = `/downloads/${shortCode}${queryString ? `?${queryString}` : ''}`;

    router.push(redirectUrl);
  }, [params, searchParams, router]);

  // Show loading state while redirecting
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
        <title>Loading Transfer - ZeFile</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your transfer...</p>
        </div>
      </div>
    </>
  );
}
