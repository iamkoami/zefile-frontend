'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingPanel from '@/components/LoadingPanel';

/**
 * Download Landing Page Redirect
 * Redirects /downloads?code={shortCode} to /t/{shortCode}
 * Preserves tracking parameters
 */
function DownloadRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get short code from query parameter (may include z- prefix)
    const codeParam = searchParams?.get('code');

    if (codeParam) {
      // Strip z- prefix if present (e.g., "z-KacqsK9MHn" → "KacqsK9MHn")
      const shortCode = codeParam.startsWith('z-') ? codeParam.slice(2) : codeParam;

      // Build query string for tracking params
      const trackingParams = new URLSearchParams();
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

      const queryString = trackingParams.toString();
      const redirectUrl = `/t/${shortCode}${queryString ? `?${queryString}` : ''}`;

      // Redirect to the new transfer landing page
      router.replace(redirectUrl);
    } else {
      // No code provided, redirect to home
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <LoadingPanel />
    </div>
  );
}

/**
 * Download Landing Page
 * Redirects to /t/{shortCode} for consistent experience
 */
export default function TransferDownloadPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <LoadingPanel />
        </div>
      }
    >
      <DownloadRedirect />
    </Suspense>
  );
}
