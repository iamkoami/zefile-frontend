'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Lottie from 'lottie-react';
import { useTranslations } from 'next-intl';
import paymentAnimation from '@/public/lotties/payment_zefile.json';
import { paymentApi, PaymentStatusType } from '@/services/payment-api';
import {
  hydrateDrawerFromRedirect,
  DRAWER_REDIRECT_STATE_KEY,
} from '@/stores';

/**
 * This page is where a gateway redirect lands: Paystack falls back to
 * `${FRONTEND_URL}/payment/callback` whenever a payment is initialized without an
 * explicit allow-listed callback URL (paystack.service.ts, both initialize methods),
 * and /payment/callback forwards here with the reference.
 *
 * It used to POST to `/payments/verify` — a v1 path that does not exist; `v2/payments`
 * is the only payments controller. Every buyer who got here was told their successful
 * payment had failed. Going through `paymentApi` rather than raw `fetch` is what keeps
 * that from recurring: it carries the CSRF token the global CsrfGuard requires and
 * types the response, so a wrong path or a wrong shape stops compiling.
 */

/** Statuses that mean the gateway has finished deciding. */
const TERMINAL_STATUSES: PaymentStatusType[] = ['SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'];

/**
 * `/v2/payments/verify` is throttled to 5 requests per minute per IP, so the retry
 * budget stays under it: one attempt after the initial settle delay, then three more
 * at 15s. Bank transfer and USSD can take a moment to clear after the redirect, and
 * calling a still-pending payment "failed" is the bug this page already had once.
 */
const MAX_VERIFY_ATTEMPTS = 4;
const INITIAL_DELAY_MS = 3000;
const RETRY_DELAY_MS = 15000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function hydrateStashedDrawerIfAny(): void {
  if (typeof window === 'undefined') return;
  const raw = window.sessionStorage.getItem(DRAWER_REDIRECT_STATE_KEY);
  if (!raw) return;
  // Idempotent: clear immediately so a back-button re-hit doesn't replay.
  window.sessionStorage.removeItem(DRAWER_REDIRECT_STATE_KEY);
  try {
    const parsed = JSON.parse(raw);
    hydrateDrawerFromRedirect(parsed);
  } catch {
    // Malformed payload — key already cleared above; nothing else to do.
  }
}

export default function PaymentProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('payment');
  const [paymentReference, setPaymentReference] = useState<string>('');
  // 'checking' until the gateway gives a terminal answer; 'unconfirmed' when the retry
  // budget runs out with the payment still in flight. An unconfirmed payment is not a
  // failed one, so it stays here rather than being sent to /payment/failed.
  const [phase, setPhase] = useState<'checking' | 'unconfirmed'>('checking');
  // Bumped by "Check again" to re-run the effect. Without it the page was a dead end:
  // once the retry budget was spent the only way to ask again was a full reload, which
  // restarted the whole wait from zero.
  const [checkRound, setCheckRound] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async (reference: string) => {
      // Give the gateway a moment to finish settling before the first ask.
      await sleep(INITIAL_DELAY_MS);

      let status: PaymentStatusType | null = null;

      for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS && !cancelled; attempt++) {
        try {
          const response = await paymentApi.verifyPaymentV2(reference);

          if (response.data && TERMINAL_STATUSES.includes(response.data.status)) {
            status = response.data.status;
            break;
          }

          // Not terminal yet — or the backend refused because the gateway has not
          // marked the charge successful. Both are "ask again", not "failed".
        } catch (error) {
          console.error('Payment verification failed:', error);
        }

        if (attempt < MAX_VERIFY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
        }
      }

      if (cancelled) return;

      // Restore any drawer state stashed before the Paystack redirect
      // (Story 132-4b, AC 5) once we stop waiting, so the user lands back where
      // they were whichever way this went.
      hydrateStashedDrawerIfAny();

      if (!status) {
        // Still in flight after the retry budget. Say so — do not route to
        // /payment/failed, which is what made a successful bank transfer look
        // like a declined one.
        setPhase('unconfirmed');
        return;
      }

      const destination = status === 'SUCCESS' ? 'success' : 'failed';
      router.push(`/payment/${destination}?reference=${encodeURIComponent(reference)}`);
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

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, checkRound]);

  const checkAgain = () => {
    setPhase('checking');
    setCheckRound((round) => round + 1);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      {/* Lottie Animation */}
      <div className="mb-8">
        <Lottie
          animationData={paymentAnimation}
          loop={true}
          autoplay={true}
          className="ze-lottie-container"
          style={{ width: 172, height: 172 }}
        />
      </div>

      {/* Processing Text */}
      <div className="text-center max-w-md px-4">
        <h1 className="text-2xl font-bold text-[#171717] mb-4">
          {phase === 'unconfirmed' ? t('paymentPending') : t('processing')}
        </h1>
        {phase === 'unconfirmed' ? (
          <>
            <p className="text-[#666666] text-base leading-relaxed mb-2">
              {t('takingLongerThanUsual')}
            </p>
            <p className="text-[#666666] text-base leading-relaxed">
              {t('waitingForConfirmation')}
            </p>
            {/* Two ways out. The page used to have none once the retries ran out. */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={checkAgain}
                className="bg-[#87E64B] text-[#171717] px-6 py-3 rounded hover:bg-[#78d43f] transition-colors"
              >
                {t('checkAgain')}
              </button>
              <button
                onClick={() => router.push('/')}
                className="text-[#5E53E0] text-sm hover:underline"
              >
                {t('backToHome')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[#666666] text-base leading-relaxed mb-2">
              {t('pleaseWait')}
            </p>
            <p className="text-[#666666] text-base leading-relaxed">
              {t('doNotClose')}
            </p>
          </>
        )}
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
