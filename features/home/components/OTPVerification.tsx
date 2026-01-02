'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NavArrowLeft } from 'iconoir-react';

interface OTPVerificationProps {
  email: string;
  onBack: () => void;
  onVerify: (code: string) => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onBack,
  onVerify
}) => {
  const otpLength = parseInt(process.env.NEXT_PUBLIC_OTP_LENGTH || '6', 10);
  const t = useTranslations('otp');
  const tCommon = useTranslations('common');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');

  // Format OTP for display (e.g., "123456" -> "123 456")
  const formatOTPDisplay = (value: string): string => {
    if (value.length <= 3) return value;
    return `${value.slice(0, 3)} ${value.slice(3)}`;
  };

  const handleSubmit = async () => {
    if (otpCode.length !== otpLength) return;

    setIsVerifying(true);
    setError('');
    try {
      await onVerify(otpCode);
    } catch (err: any) {
      // Display error message from API
      setError(err.message || t('invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    // TODO: Implement resend code logic
    console.log('Resending code to:', email);
  };

  const handleLearnMore = () => {
    // TODO: Implement learn more logic
    console.log('Learn more clicked');
  };

  const isButtonDisabled = otpCode.length !== otpLength || isVerifying;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Title */}
      <h2 className="text-lg font-bold text-black mb-4 text-center">
        {t('title')}
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center mb-2">
        {t('description')}
      </p>
      <p className="text-sm font-semibold text-black text-center mb-2">
        {email}
      </p>
      <p className="text-sm text-gray-600 text-center mb-6">
        {t('instruction')}
      </p>

      {/* OTP Input */}
      <div className="w-full mb-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formatOTPDisplay(otpCode)}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').replace(/\s/g, '');
            if (value.length <= otpLength) {
              setOtpCode(value);
              setError(''); // Clear error on input change
            }
          }}
          placeholder="000 000"
          className={`ze-form-input w-full text-center text-lg font-bold tracking-widest placeholder:text-[#E1E1E1] ${error ? 'border-red-500' : ''}`}
          disabled={isVerifying}
          maxLength={otpLength + 1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isButtonDisabled) {
              handleSubmit();
            }
          }}
        />
        {error && (
          <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
        )}
      </div>

      {/* Links */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button
          className="font-bold underline text-[#171717] hover:opacity-80 transition-opacity"
          onClick={handleLearnMore}
          type="button"
        >
          {t('knowMore')}
        </button>
        <span className="text-gray-400">{tCommon('or')}</span>
        <button
          className="font-bold underline text-[#171717] hover:opacity-80 transition-opacity"
          onClick={handleResendCode}
          type="button"
        >
          {t('resendCode')}
        </button>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={handleSubmit}
          disabled={isButtonDisabled}
          className="ze-transfer-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? t('verifying') : t('checkAndSend')}
        </button>

        <button
          onClick={onBack}
          className="ze-options-button"
          disabled={isVerifying}
          type="button"
          aria-label="Back"
        >
          <NavArrowLeft width={20} height={20} strokeWidth={2} />
        </button>
      </div>

      {/* Terms & Privacy Agreement */}
      <div className="w-full mt-3 text-xs text-center text-gray-600">
        <p>
          {t('termsAgreement')}{' '}
          <a
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#171717] font-medium underline hover:opacity-80 transition-opacity"
          >
            {t('termsOfService')}
          </a>{' '}
          {t('and')}{' '}
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#171717] font-medium underline hover:opacity-80 transition-opacity"
          >
            {t('privacyPolicy')}
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default OTPVerification;
