'use client';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingFullscreen from '@/components/LoadingFullscreen';

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get payment reference from Paystack callback
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');

    // Use either reference or trxref (Paystack may use either)
    const paymentReference = reference || trxref;

    if (paymentReference) {
      // Redirect to processing page with reference
      router.push(`/payment/processing?reference=${paymentReference}`);
    } else {
      // No reference found, redirect to home
      router.push('/');
    }
  }, [searchParams, router]);

  return <LoadingFullscreen />;
}
