'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface PhoneAuthFormProps {
  onSuccess: () => void;
  termsAccepted?: boolean;
}

const PhoneAuthForm: React.FC<PhoneAuthFormProps> = ({ onSuccess, termsAccepted }) => {
  const t = useTranslations('auth');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+228');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [sentTo, setSentTo] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length < 8) {
      setError(t('invalidPhone'));
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement phone OTP request when backend is ready
      // For now, just simulate the flow
      await new Promise(resolve => setTimeout(resolve, 1000));

      const fullPhone = `${countryCode} ${phone}`;
      setSentTo(fullPhone);
      setStep('otp');
      setResendCountdown(30);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
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
      // TODO: Implement phone OTP verification when backend is ready
      // TODO: Add referral code application after OTP success (see EmailAuthForm.tsx Story 89-4 pattern)
      await new Promise(resolve => setTimeout(resolve, 1000));

      setError(t('phoneAuthNotImplemented'));
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
      // TODO: Implement phone OTP resend when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      setResendCountdown(30);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || t('requestOtpError'));
    } finally {
      setLoading(false);
    }
  };

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
                <option value="+226">+226</option>
                <option value="+221">+221</option>
                <option value="+223">+223</option>
                <option value="+234">+234</option>
                <option value="+233">+233</option>
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

export default PhoneAuthForm;
