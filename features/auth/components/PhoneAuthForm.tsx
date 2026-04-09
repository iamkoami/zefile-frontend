'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authApi } from '@/services/auth-api';
import { referralsApi } from '@/services/referrals-api';
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstile } from '@/hooks/useTurnstile';
import { setCaptchaToken, setDeviceFingerprint } from '@/services/api-client';
import { getDeviceFingerprint } from '@/utils/fingerprint';
import { usersApi } from '@/services/users-api';
import { getAnalyticsConsent } from '@/components/shared/CookieConsentBanner';
import { toast } from '@/components/shared/Toast';
import LoadingFullscreen from '@/components/LoadingFullscreen';

interface PhoneAuthFormProps {
  onSuccess: () => void;
  onSwitchToEmail?: () => void;
  termsAccepted?: boolean;
  consentRequired?: boolean;
}

const PhoneAuthForm: React.FC<PhoneAuthFormProps> = ({
  onSuccess,
  onSwitchToEmail,
  termsAccepted,
}) => {
  const router = useRouter();
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const tReferrals = useTranslations('referrals');
  const { getToken, isEnabled: captchaEnabled, turnstileRef, siteKey, onSuccess: onTurnstileSuccess, onError: onTurnstileError, onExpire: onTurnstileExpire } = useTurnstile();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+228');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sentTo, setSentTo] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Pre-load device fingerprint on mount (fire-and-forget, never blocks UI)
  useEffect(() => {
    getDeviceFingerprint().then((fp) => {
      if (fp) setDeviceFingerprint(fp);
    });
  }, []);

  const getFullPhoneNumber = () => `${countryCode}${phone}`;

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length < 8) {
      setError(t('invalidPhone'));
      return;
    }

    setLoading(true);

    try {
      // Get Turnstile token and inject via header
      const token = await getToken();
      setCaptchaToken(token);

      const fullPhone = getFullPhoneNumber();
      const response = await authApi.requestOTP({ identifier: fullPhone });

      if (response.error) {
        if (response.error.code === 'CAPTCHA_FAILED') {
          setError(t('captchaFailed'));
        } else {
          const errorKey = response.error.errorKey;
          setError(errorKey ? tErrors(errorKey.replace('errors.', '')) : response.error.message);
        }
      } else {
        const displayPhone = `${countryCode} ${phone}`;
        setSentTo(displayPhone);
        // Store the email returned by the backend (needed for verifyOTP)
        if (response.data?.email) {
          setUserEmail(response.data.email);
        }
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
      // verifyOTP uses the user's email (returned from requestOTP)
      const response = await authApi.verifyOTP({ email: userEmail, otp: otpCode });

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
            .catch(() => {});
        }

        // Soft navigation - no page reload needed
        setIsLoggingIn(true);
        onSuccess();
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
      // Get Turnstile token and inject via header
      const token = await getToken();
      setCaptchaToken(token);

      const fullPhone = getFullPhoneNumber();
      const response = await authApi.requestOTP({ identifier: fullPhone });

      if (response.error) {
        const errorKey = response.error.errorKey;
        setError(errorKey ? tErrors(errorKey.replace('errors.', '')) : response.error.message);
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

  if (isLoggingIn) {
    return <LoadingFullscreen />;
  }

  if (step === 'phone') {
    return (
      <div className="ze-phone-form w-full">
        <h2 className="ze-form-title text-lg font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mb-6">
          {t('enterPhoneTitle')}
        </h2>

        <form onSubmit={handlePhoneSubmit}>
          <div className="ze-phone-input-wrapper flex items-end gap-4 mb-12">
            <div className="w-auto">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="ze-country-code font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 dark:text-[oklch(0.91_0_0)] pb-4 appearance-none cursor-pointer"
                style={{
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                  lineHeight: '1.1',
                }}
              >
                <option value="+228">+228</option>
                <option value="+229">+229</option>
                <option value="+225">+225</option>
                <option value="+233">+233</option>
                <option value="+234">+234</option>
                <option value="+254">+254</option>
              </select>
              <div className="h-0.5 bg-gray-200 dark:bg-border" />
            </div>

            <div className="flex-1 relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="ze-phone-input w-full font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 dark:text-[oklch(0.91_0_0)] pb-4"
                placeholder="90 90 90 90"
                maxLength={10}
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                  lineHeight: '1.1',
                }}
                autoFocus
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-border" />
            </div>
          </div>

          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !phone}
            className="ze-submit-button bg-black dark:bg-[oklch(0.91_0_0)] text-white dark:text-[oklch(0.19_0_0)] font-medium py-4 px-16 rounded hover:bg-gray-800 dark:hover:bg-[oklch(0.82_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '4px' }}
          >
            {loading ? t('loading') : t('continue')}
          </button>

          {captchaEnabled && (
            <Turnstile
              ref={turnstileRef}
              siteKey={siteKey}
              options={{ size: 'invisible' }}
              onSuccess={onTurnstileSuccess}
              onError={onTurnstileError}
              onExpire={onTurnstileExpire}
            />
          )}
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
            {t('otpSentToWhatsApp')} {sentTo}.
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

          {/* Email fallback link (AC5) */}
          {onSwitchToEmail && (
            <p className="text-gray-400 dark:text-[oklch(0.60_0_0)] text-sm mt-4">
              <button
                type="button"
                onClick={onSwitchToEmail}
                className="text-[#5E53E0] hover:underline font-medium"
              >
                {t('loginWithEmailInstead')}
              </button>
            </p>
          )}

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

export default PhoneAuthForm;
