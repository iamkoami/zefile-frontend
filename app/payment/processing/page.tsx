'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import { useTranslations } from 'next-intl';
import paymentAnimation from '@/public/lotties/payment_zefile.json';

export default function PaymentProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('payment');
  const [paymentReference, setPaymentReference] = useState<string>('');

  useEffect(() => {
    const verifyPayment = async (reference: string) => {
      try {
        // Wait a bit before verifying to allow Paystack to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference }),
        });

        const data = await response.json();

        if (data.success && data.data.status === 'success') {
          // Payment successful, redirect to success page
          router.push(`/payment/success?reference=${reference}`);
        } else {
          // Payment failed, redirect to failure page
          router.push(`/payment/failed?reference=${reference}`);
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
        // On error, redirect to failure page
        router.push(`/payment/failed?reference=${reference}`);
      }
    };

    // Get payment reference from URL
    const reference = searchParams.get('reference');
    if (reference) {
      setPaymentReference(reference);
      // Start verification process
      verifyPayment(reference);
    } else {
      // No reference, redirect to home
      setTimeout(() => {
        router.push('/');
      }, 2000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Lottie Animation */}
      <div className="mb-8">
        <Lottie
          animationData={paymentAnimation}
          loop={true}
          autoplay={true}
          style={{ width: 172, height: 172 }}
        />
      </div>

      {/* Processing Text */}
      <div className="text-center max-w-md px-4">
        <h1 className="text-2xl font-semibold text-[#171717] mb-4">
          {t('processing')}
        </h1>
        <p className="text-[#666666] text-base leading-relaxed mb-2">
          {t('pleaseWait')}
        </p>
        <p className="text-[#666666] text-base leading-relaxed">
          {t('doNotClose')}
        </p>
      </div>

      {/* Reference (for debugging in development) */}
      {process.env.NODE_ENV === 'development' && paymentReference && (
        <div className="mt-8 text-xs text-gray-400">
          Ref: {paymentReference}
        </div>
      )}
    </div>
  );
}
