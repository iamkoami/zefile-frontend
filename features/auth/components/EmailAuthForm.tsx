'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { authApi } from '@/services/auth-api';
import { useCaptcha, CAPTCHA_ACTIONS } from '@/hooks/useCaptcha';
import LoadingFullscreen from '@/components/LoadingFullscreen';

interface EmailAuthFormProps {
  onSuccess: () => void;
}

const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSuccess }) => {
  const t = useTranslations('auth');
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

      const response = await authApi.requestOTP({ email, captchaToken });

      if (response.error) {
        // Handle CAPTCHA-specific errors
        if (response.error.code === 'CAPTCHA_FAILED') {
          setError(t('captchaFailed'));
        } else {
          setError(response.error.message);
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

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const otpCode = otp.join('');
    if (otpCode.length === 6 && step === 'otp' && !loading) {
      handleOtpSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

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
        setError(response.error.message);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        // Show full page loading before reload
        setIsLoggingIn(true);
        onSuccess();
        // Wait for loading overlay to show, then reload
        setTimeout(() => {
          window.location.reload();
        }, 400);
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

      const response = await authApi.requestOTP({ email, captchaToken });

      if (response.error) {
        if (response.error.code === 'CAPTCHA_FAILED') {
          setError(t('captchaFailed'));
        } else {
          setError(response.error.message);
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
        <h2 className="ze-form-title text-lg font-semibold text-gray-900 mb-6">
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
              className="ze-email-input w-full font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 pb-4"
              placeholder="cemail@gmail.com"
              style={{
                caretColor: '#000',
                fontFamily: 'inherit',
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                lineHeight: '1.1',
              }}
              autoFocus
            />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200" />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValidEmail}
            className="ze-submit-button bg-black text-white font-medium py-4 px-16 rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <h2 className="ze-form-title text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {t('enterOtpTitle')}
          </h2>
          <p className="text-gray-400 text-base mb-1">
            {t('otpSentTo')} {sentTo}.
          </p>
          <p className="text-gray-400 text-base">
            {resendCountdown > 0 ? (
              <>{t('resendIn')} 00:{String(resendCountdown).padStart(2, '0')}</>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-[#171717] hover:text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('resendCode')}
              </button>
            )}
          </p>
          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
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
                  className="ze-otp-input w-full aspect-square font-bold text-center border-b-2 border-gray-200 focus:border-[#171717] outline-none transition-colors bg-transparent text-[#171717]"
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
