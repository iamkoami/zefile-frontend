'use client';

export const runtime = 'edge';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import Header from '@/components/shared/Header';
import TimeOfDayBackground from '@/components/shared/TimeOfDayBackground';
import HeroText from '@/components/shared/HeroText';
import PaperPlaneAnimation from '@/components/shared/PaperPlaneAnimation';
import { transferApi } from '@/services/transfer-api';
import { detectNetwork } from '@/utils/network-detection';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/**
 * Download Landing Page Redirect
 *
 * Flow: /downloads?code=z-{shortCode} → fetch transfer → /downloads/{transferId}/z-{shortCode}?params
 */
function DownloadRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('transferLanding');
  const tNotFound = useTranslations('notFound');
  const { timeOfDay } = useTimeOfDay();
  const [error, setError] = useState<string | null>(null);

  // Dynamic import for cat lottie animation
  const [catAnimationData, setCatAnimationData] = useState<any>(null);
  useEffect(() => {
    import('@/public/lotties/cat.json').then((m) => setCatAnimationData(m.default));
  }, []);

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
            `${Math.floor(now / 1000)}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('')}`);
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
        <main
          style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}
        >
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: 'relative', zIndex: 10 }}
            >
              <div className="ze-upload-panel text-center py-8">
                <div className="align-center mx-auto mb-3">
                  {catAnimationData && (
                    <Lottie
                      animationData={catAnimationData}
                      loop={true}
                      autoplay={true}
                      style={{
                        width: '300px',
                        height: 'auto',
                      }}
                    />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-[#171717] mb-3">
                  {tNotFound('transferNotFoundTitle')}
                </h1>
                <p className="text-gray-600 text-sm font-medium max-w-md mx-auto mb-8 leading-relaxed">
                  {tNotFound('transferNotFoundSubtitle')}
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
                >
                  {tNotFound('startTransfer')}
                </Link>
              </div>
            </div>
          </div>
        </main>
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
