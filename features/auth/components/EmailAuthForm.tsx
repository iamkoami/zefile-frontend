'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { authApi } from '@/services/auth-api';
import LoadingFullscreen from '@/components/LoadingFullscreen';

interface EmailAuthFormProps {
  onSuccess: () => void;
}

const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSuccess }) => {
  const t = useTranslations('auth');
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
      const response = await authApi.requestOTP({ email });

      if (response.error) {
        setError(response.error.message);
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

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const response = await authApi.requestOTP({ email });

      if (response.error) {
        setError(response.error.message);
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
      <div className="ze-email-form">
        <h2 className="ze-form-title text-2xl font-bold text-gray-900 mb-8">
          {t('enterEmailTitle')}
        </h2>

        <form onSubmit={handleEmailSubmit} className="mt-8">
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
              className="ze-email-input w-full text-7xl font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 pb-4"
              placeholder="cemail@gmail.com"
              style={{
                caretColor: '#000',
                fontFamily: 'inherit',
              }}
              autoFocus
            />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200" />
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValidEmail}
            className="ze-submit-button mt-8 bg-black text-white font-medium py-3 px-8 rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '4px' }}
          >
            {loading ? t('loading') : t('continue')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="ze-otp-form flex flex-col">
      <div className="mb-12">
        <h2 className="ze-form-title text-3xl font-bold text-gray-900 mb-4">
          {t('enterOtpTitle')}
        </h2>
        <p className="text-gray-500 text-base mb-2">
          {t('otpSentTo')} <span className="font-medium">{sentTo}</span>.
        </p>
        <p className="text-gray-400 text-sm">
          {t('resendIn')} {resendCountdown > 0 ? `00:${String(resendCountdown).padStart(2, '0')}` : ''}
        </p>
      </div>

      <form onSubmit={handleOtpSubmit} className="flex flex-col">
        <div className="ze-otp-inputs flex gap-4 mb-12">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="ze-otp-input w-20 h-24 text-5xl font-bold text-center border-b-2 border-gray-300 focus:border-black outline-none transition-colors bg-transparent"
              style={{
                caretColor: '#000',
              }}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-4">
          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="ze-submit-button bg-black text-white font-medium py-3 px-8 rounded hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-start"
            style={{ borderRadius: '4px' }}
          >
            {loading ? t('verifying') : t('verify')}
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCountdown > 0 || loading}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('resendCode')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailAuthForm;
