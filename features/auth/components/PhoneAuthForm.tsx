'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface PhoneAuthFormProps {
  onSuccess: () => void;
}

const PhoneAuthForm: React.FC<PhoneAuthFormProps> = ({ onSuccess }) => {
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
      // TODO: Implement phone OTP verification when backend is ready
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
      <div className="ze-phone-form">
        <h2 className="ze-form-title text-2xl font-bold text-gray-900 mb-8">
          {t('enterPhoneTitle')}
        </h2>

        <form onSubmit={handlePhoneSubmit} className="mt-8">
          <div className="ze-phone-input-wrapper flex items-end gap-6 mb-12">
            <div className="w-50">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="ze-country-code w-full text-7xl font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 pb-4 appearance-none"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
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
              <div className="h-0.5 bg-gray-200" />
            </div>

            <div className="flex-1 relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="ze-phone-input w-full text-7xl font-bold border-none outline-none focus:outline-none bg-transparent text-gray-900 pb-4"
                placeholder="90 90 90 90"
                maxLength={10}
                autoFocus
              />
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200" />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !phone}
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

export default PhoneAuthForm;
