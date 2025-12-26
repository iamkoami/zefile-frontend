'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Head from 'next/head';
import { getTransferByCodeUseCase } from '@/features/storage/domain/usecases/get_transfer_by_code.usecase';
import { TransferEntity, TrackingParams } from '@/features/storage/domain/entities/transfer.entity';
import { DownloadPage } from '@/features/storage/presentation/components/DownloadPage';

/**
 * Download Landing Page
 * Full landing page with transfer details and download options
 * URL: /downloads/{shortCode}?z_exp=...&z_sid=...
 */
export default function TransferDownloadPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [transfer, setTransfer] = useState<TransferEntity | null>(null);
  const [trackingParams, setTrackingParams] = useState<TrackingParams>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    const shortCode = params?.shortCode as string;

    if (!shortCode) {
      setError('Invalid transfer link');
      setLoading(false);
      return;
    }

    // Extract tracking parameters
    const tracking: TrackingParams = {
      z_exp: searchParams?.get('z_exp') || undefined,
      z_sid: searchParams?.get('z_sid') || undefined,
      z_src: searchParams?.get('z_src') || 'link',
      z_network: searchParams?.get('z_network') || undefined,
      z_ts: searchParams?.get('z_ts') || Date.now().toString(),
    };
    setTrackingParams(tracking);

    // Fetch transfer information
    fetchTransfer(shortCode);
  }, [params, searchParams]);

  const fetchTransfer = async (shortCode: string, pwd?: string) => {
    try {
      setLoading(true);
      setError(null);

      const transferData = await getTransferByCodeUseCase.execute({
        shortCode,
        password: pwd || password || undefined,
      });

      setTransfer(transferData);
      setPasswordRequired(false);
    } catch (err: any) {
      console.error('Error fetching transfer:', err);

      // Check if password is required
      if (err.message?.includes('password') || err.message?.includes('401')) {
        setPasswordRequired(true);
        setError('This transfer is password protected');
      } else if (err.message?.includes('404') || err.message?.includes('not found')) {
        setError('Transfer not found or expired');
      } else {
        setError(err.message || 'Failed to load transfer');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (pwd: string) => {
    setPassword(pwd);
    const shortCode = params?.shortCode as string;
    fetchTransfer(shortCode, pwd);
  };

  if (loading) {
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
            <p className="text-gray-600">Loading transfer...</p>
          </div>
        </div>
      </>
    );
  }

  if (error && !passwordRequired) {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
          <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
          <title>Transfer Not Available - ZeFile</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <svg
                className="w-16 h-16 text-red-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Transfer Not Available</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <a
                href="/"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
        <title>Download Files - ZeFile</title>
      </Head>
      <DownloadPage
        transfer={transfer}
        trackingParams={trackingParams}
        passwordRequired={passwordRequired}
        onPasswordSubmit={handlePasswordSubmit}
        error={error}
      />
    </>
  );
}
