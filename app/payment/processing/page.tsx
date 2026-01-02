'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import { useTranslations } from 'next-intl';

export default function PaymentProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('payment');
  const [animationData, setAnimationData] = useState<object | null>(null);
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

    // Load Lottie animation
    fetch('/lotties/payment_zefile.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Failed to load animation:', error));

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

  if (!animationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#87E64B] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Lottie Animation */}
      <div className="mb-8">
        <Lottie
          animationData={animationData}
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
