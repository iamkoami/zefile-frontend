'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const t = useTranslations('payment');
  const [reference, setReference] = useState<string>('');

  useEffect(() => {
    const ref = searchParams.get('reference');
    if (ref) {
      setReference(ref);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#87E64B] flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-[#171717] mb-4">
          {t('paymentSuccessful')}
        </h1>
        <p className="text-[#666666] text-base leading-relaxed mb-8">
          {t('paymentSuccessMessage')}
        </p>

        {/* Reference */}
        {reference && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">{t('transactionReference')}</p>
            <p className="text-sm font-mono text-gray-700">{reference}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/transfers"
            className="block w-full py-3 px-6 bg-[#87E64B] text-white font-semibold rounded-lg hover:bg-[#75D43A] transition-colors"
          >
            {t('viewMyTransfers')}
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-6 border-2 border-gray-300 text-[#171717] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
