'use client';

export const runtime = 'edge';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingFullscreen from '@/components/LoadingFullscreen';

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get payment reference from gateway callback
    // Paystack uses 'reference' or 'trxref', Startbutton uses 'reference' or 'transactionReference'
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    const transactionReference = searchParams.get('transactionReference');

    const paymentReference = reference || trxref || transactionReference;

    if (paymentReference) {
      // Redirect to processing page with reference
      router.push(`/payment/processing?reference=${encodeURIComponent(paymentReference)}`);
    } else {
      // No reference found, redirect to home
      router.push('/');
    }
  }, [searchParams, router]);

  return <LoadingFullscreen />;
}
