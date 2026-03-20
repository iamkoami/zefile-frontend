'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authApi } from '@/services/auth-api';
import { referralsApi } from '@/services/referrals-api';
import { useCaptcha, CAPTCHA_ACTIONS } from '@/hooks/useCaptcha';
import { usersApi } from '@/services/users-api';
import { getAnalyticsConsent } from '@/components/shared/CookieConsentBanner';
import { toast } from '@/components/shared/Toast';
import LoadingFullscreen from '@/components/LoadingFullscreen';

interface EmailAuthFormProps {
  onSuccess: () => void;
  termsAccepted?: boolean;
  consentRequired?: boolean;
}

const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSuccess, termsAccepted, consentRequired }) => {
  const router = useRouter();
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const tReferrals = useTranslations('referrals');
  const { executeAsync: executeCaptcha, isEnabled: captchaEnabled } = useCaptcha();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sentTo, setSentTo] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError(t('invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      // Get CAPTCHA token if enabled (invisible to user)
      const captchaToken = captchaEnabled
        ? await executeCaptcha(CAPTCHA_ACTIONS.REQUEST_OTP)
        : null;

      if (captchaEnabled && !captchaToken) {
        setError(t('captchaNotReady'));
        setLoading(false);
        return;
      }

      const response = await authApi.requestOTP({ email, captchaToken });

      if (response.error) {
        // Handle CAPTCHA-specific errors
        if (response.error.code === 'CAPTCHA_FAILED') {
          setError(t('captchaFailed'));
        } else {
          const errorKey = response.error.errorKey;
          setError(errorKey ? tErrors(errorKey.replace('errors.', '')) : response.error.message);
        }
      } else {
        setSentTo(email);
        setStep('otp');
        setResendCountdown(30);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || t('requestOtpError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-submit when all 6 digits are entered (only if terms accepted or no checkbox required)
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && step === 'otp' && !loading && termsAccepted !== false) {
      handleOtpSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, termsAccepted]);

  const handleOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError(t('invalidOtp'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyOTP({ email, otp: otpCode });

      if (response.error) {
        const errorKey = response.error.errorKey;
        setError(errorKey ? tErrors(errorKey.replace('errors.', '')) : response.error.message);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        // Record legal consent if terms were accepted during auth
        if (termsAccepted) {
          usersApi.acceptLegalTerms({
            termsAccepted: true,
            privacyAccepted: true,
            cookieConsentAnalytics: getAnalyticsConsent(),
          }).catch(() => {});
        }

        // Apply referral code if present (fire-and-forget)
        const referralCode = localStorage.getItem('referral_code');
        if (referralCode) {
          const referrerName = localStorage.getItem('referral_referrer_name');
          localStorage.removeItem('referral_code');
          localStorage.removeItem('referral_referrer_name');
          referralsApi.applyCode(referralCode)
            .then((applyResponse) => {
              if (!applyResponse.error && referrerName) {
                toast.success(tReferrals('welcomeReferred', { name: referrerName }));
              }
            })
            .catch(() => {
              // Silently ignore — don't disrupt onboarding
            });
        }

        // Soft navigation - no page reload needed
        setIsLoggingIn(true);
        onSuccess();
        // Use Next.js router for soft navigation (refreshes server components)
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || t('verifyOtpError'));
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    setError('');

    try {
      // Get CAPTCHA token if enabled (invisible to user)
      const captchaToken = captchaEnabled
        ? await executeCaptcha(CAPTCHA_ACTIONS.REQUEST_OTP)
        : null;

      if (captchaEnabled && !captchaToken) {
        setError(t('captchaNotReady'));
        setLoading(false);
        return;
      }

      const response = await authApi.requestOTP({ email, captchaToken });

      if (response.error) {
        if (response.error.code === 'CAPTCHA_FAILED') {
          setError(t('captchaFailed'));
        } else {
          const errorKey = response.error.errorKey;
          setError(errorKey ? tErrors(errorKey.replace('errors.', '')) : response.error.message);
        }
      } else {
        setResendCountdown(30);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || t('requestOtpError'));
    } finally {
      setLoading(false);
    }
  };

  // Full page loading overlay during login
  if (isLoggingIn) {
    return <LoadingFullscreen />;
  }

  if (step === 'email') {
    return (
      <div className="ze-email-form w-full">
        <h2 className="ze-form-title text-lg font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mb-6">
          {t('enterEmailTitle')}
        </h2>

        <form onSubmit={handleEmailSubmit}>
          <div className="ze-email-input-wrapper relative mb-12">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                const newEmail = e.target.value;
                setEmail(newEmail);
                setIsValidEmail(validateEmail(newEmail));
                setError('');
              }}
              className="ze-email-input w-full font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 dark:text-[oklch(0.91_0_0)] pb-4"
              placeholder="cemail@gmail.com"
              style={{
                caretColor: 'currentColor',
                fontFamily: 'inherit',
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                lineHeight: '1.1',
              }}
              autoFocus
            />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-border" />
          </div>

          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValidEmail || (consentRequired && !termsAccepted)}
            className="ze-submit-button bg-black dark:bg-[oklch(0.91_0_0)] text-white dark:text-[oklch(0.19_0_0)] font-medium py-4 px-16 rounded hover:bg-gray-800 dark:hover:bg-[oklch(0.82_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '4px' }}
          >
            {loading ? t('loading') : t('continue')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ze-otp-form w-full">
      <form onSubmit={handleOtpSubmit} className="flex flex-col md:flex-row md:items-start md:gap-16 lg:gap-24">
        {/* Left side - Title and info */}
        <div className="mb-8 md:mb-0 md:flex-shrink-0 md:w-auto">
          <h2 className="ze-form-title text-2xl md:text-3xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mb-4">
            {t('enterOtpTitle')}
          </h2>
          <p className="text-gray-400 dark:text-[oklch(0.60_0_0)] text-base mb-1">
            {t('otpSentTo')} {sentTo}.
          </p>
          <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)]">
            {t('checkSpamFolder')}
          </p>
          <p className="text-gray-400 dark:text-[oklch(0.60_0_0)] text-base">
            {resendCountdown > 0 ? (
              <>{t('resendIn')} 00:{String(resendCountdown).padStart(2, '0')}</>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-[#171717] dark:text-[oklch(0.91_0_0)] hover:text-black dark:hover:text-[oklch(0.75_0_0)] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('resendCode')}
              </button>
            )}
          </p>
          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>
          )}
        </div>

        {/* Right side - OTP inputs */}
        <div className="flex-1">
          <div className="ze-otp-inputs flex gap-2 md:gap-4">
            {otp.map((digit, index) => (
              <div key={index} className="relative flex-1 max-w-[80px] md:max-w-[100px]">
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="ze-otp-input w-full aspect-square font-bold text-center border-b-2 border-gray-200 dark:border-border focus:border-[#171717] dark:focus:border-[oklch(0.91_0_0)] outline-none transition-colors bg-transparent text-[#171717] dark:text-[oklch(0.91_0_0)]"
                  style={{
                    fontSize: 'clamp(3rem, 8vw, 6rem)',
                    lineHeight: '1',
                    caretColor: 'transparent',
                  }}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmailAuthForm;
