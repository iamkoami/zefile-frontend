'use client';

export const runtime = 'edge';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import Header from '@/components/shared/Header';
import { WarningCircle } from 'iconoir-react';
import { transferApi } from '@/services/transfer-api';
import { detectNetwork } from '@/utils/network-detection';

/**
 * Download Landing Page Redirect
 *
 * Flow: /downloads?code=z-{shortCode} → fetch transfer → /downloads/{transferId}/z-{shortCode}?params
 */
function DownloadRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('transferLanding');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function redirect() {
      const codeParam = searchParams?.get('code');

      if (!codeParam) {
        router.replace('/');
        return;
      }

      // Ensure z- prefix
      const shortCodeWithPrefix = codeParam.startsWith('z-') ? codeParam : `z-${codeParam}`;

      try {
        // Fetch transfer to get transferId
        const response = await transferApi.getTransferByShortCode(shortCodeWithPrefix);

        if (response.data) {
          const transfer = response.data;
          const now = Date.now();

          // Build tracking params
          const trackingParams = new URLSearchParams();

          // Use existing params if present, otherwise generate new ones
          const expireAt = transfer.expireAt ? new Date(transfer.expireAt).getTime() : Date.now() + 14 * 24 * 60 * 60 * 1000;
          trackingParams.set('z_exp', searchParams?.get('z_exp') ||
            Math.floor(expireAt / 1000).toString());
          trackingParams.set('z_sid', searchParams?.get('z_sid') ||
            `${Math.floor(now / 1000)}-${Math.random().toString(36).substring(2, 14)}`);
          trackingParams.set('z_src', searchParams?.get('z_src') || 'link');

          // Use existing z_network if set, otherwise detect from referrer/user-agent
          const existingNetwork = searchParams?.get('z_network');
          if (existingNetwork) {
            trackingParams.set('z_network', existingNetwork);
          } else {
            const detectedNetwork = detectNetwork();
            trackingParams.set('z_network', detectedNetwork);
          }

          trackingParams.set('z_ts', searchParams?.get('z_ts') || Math.floor(now / 1000).toString());

          // Redirect to full landing page URL
          router.replace(`/downloads/${transfer.id}/${shortCodeWithPrefix}?${trackingParams.toString()}`);
        } else {
          setError(response.error?.message || t('transferNotFound'));
        }
      } catch (err) {
        console.error('Download redirect error:', err);
        setError(t('transferNotFound'));
      }
    }

    redirect();
  }, [searchParams, router, t]);

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <WarningCircle className="w-12 h-12 text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-[#171717] mb-2">{t('error')}</h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return <LoadingFullscreen />;
}

/**
 * Download Landing Page
 * Fetches transfer by shortCode and redirects to /downloads/{transferId}/{shortCode}?params
 */
export default function TransferDownloadPage() {
  return (
    <Suspense fallback={<LoadingFullscreen />}>
      <DownloadRedirect />
    </Suspense>
  );
}
