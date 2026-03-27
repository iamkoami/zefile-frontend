'use client';


import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Header from '@/components/shared/Header';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import { PaymentFailureCard, PaymentErrorCode } from '@/features/payment/components/PaymentFailureCard';
import { paymentApi, PaymentStatusV2Response } from '@/services/payment-api';

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('payment');
  const [reference, setReference] = useState<string>('');
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatusV2Response | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shortCode, setShortCode] = useState<string>('');

  useEffect(() => {
    const loadPaymentDetails = async () => {
      const ref = searchParams.get('reference');
      const code = searchParams.get('shortCode');
      const errorCode = searchParams.get('error');

      if (ref) {
        setReference(ref);

        try {
          const response = await paymentApi.getPaymentStatusV2(ref);
          if (response.data) {
            setPaymentInfo(response.data);
          }
        } catch {
          // If we can't get payment details, use URL params
          if (errorCode) {
            setPaymentInfo({
              status: 'FAILED',
              failureReason: errorCode,
              reference: ref,
            } as PaymentStatusV2Response);
          }
        }
      }

      if (code) {
        setShortCode(code);
      }

      setIsLoading(false);
    };

    loadPaymentDetails();
  }, [searchParams]);

  /**
   * Map payment gateway failure reason to our error codes
   */
  const getErrorCode = (): PaymentErrorCode => {
    const reason = paymentInfo?.failureReason?.toLowerCase() || '';
    const errorParam = searchParams.get('error')?.toLowerCase() || '';
    const combined = `${reason} ${errorParam}`;

    if (combined.includes('insufficient') || combined.includes('balance')) {
      return 'insufficient_funds';
    }
    if (combined.includes('declined') || combined.includes('reject')) {
      return 'card_declined';
    }
    if (combined.includes('expired')) {
      return 'expired_card';
    }
    if (combined.includes('invalid') || combined.includes('incorrect')) {
      return 'invalid_card';
    }
    if (combined.includes('timeout') || combined.includes('time')) {
      return 'timeout';
    }
    if (combined.includes('cancel')) {
      return 'cancelled';
    }
    if (combined.includes('abandon')) {
      return 'abandoned';
    }
    if (combined.includes('bank')) {
      return 'bank_error';
    }
    if (combined.includes('network') || combined.includes('connection')) {
      return 'network_error';
    }

    return 'default';
  };

  const handleRetry = () => {
    // Go back to the transfer page to retry payment
    if (shortCode) {
      router.push(`/t/${shortCode}`);
    } else {
      router.back();
    }
  };

  const handleChangeMethod = () => {
    // Go back to transfer page to select different payment method
    if (shortCode) {
      router.push(`/t/${shortCode}?changeMethod=true`);
    } else {
      router.back();
    }
  };

  if (isLoading) {
    return <LoadingFullscreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-12">
        <PaymentFailureCard
          errorCode={getErrorCode()}
          amount={paymentInfo?.pricingAmountMinorUnits || 0}
          currency={paymentInfo?.pricingCurrency || 'XOF'}
          currencySymbol={getCurrencySymbol(paymentInfo?.pricingCurrency)}
          onRetry={handleRetry}
          onChangeMethod={handleChangeMethod}
        />

        {/* Reference (small text) */}
        {reference && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              {t('transactionReference')}: <span className="font-mono">{reference}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getCurrencySymbol(currency?: string): string {
  const symbols: Record<string, string> = {
    XOF: 'Fr CFA',
    NGN: '₦',
    GHS: '₵',
    KES: 'KSh',
    ZAR: 'R',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  return symbols[currency || 'XOF'] || currency || '';
}
