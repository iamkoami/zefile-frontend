'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, WarningCircle } from 'iconoir-react';
import { transferApi, TransferDto } from '@/services/transfer-api';
import { recipientApi } from '@/services/recipient-api';
import TransferPreviewModal from '@/features/home/components/TransferPreviewModal';

type PageState = 'loading' | 'email-input' | 'otp-verification' | 'transfer-details' | 'error';

export default function TransferLandingPage() {
  const params = useParams();
  const t = useTranslations('transferLanding');
  const tOtp = useTranslations('otp');
  const tCurrency = useTranslations('currency');
  const shortCode = params.shortCode as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [transfer, setTransfer] = useState<TransferDto | null>(null);
  const [error, setError] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [otpExpiry, setOtpExpiry] = useState<number>(0);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);

  // Load transfer data
  useEffect(() => {
    if (shortCode) {
      loadTransfer();
    }
  }, [shortCode]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const loadTransfer = async () => {
    try {
      setPageState('loading');
      const response = await transferApi.getTransferByShortCode(shortCode);

      if (response.success && response.data) {
        setTransfer(response.data);

        // Check if transfer is expired
        if (response.data.status === 'expired') {
          setError(t('transferExpired'));
          setPageState('error');
          return;
        }

        setPageState('email-input');
      } else {
        setError(t('transferNotFound'));
        setPageState('error');
      }
    } catch (err: any) {
      setError(err.message || t('transferNotFound'));
      setPageState('error');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !transfer) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await recipientApi.requestOTP({
        email: email.trim(),
        shortCode: transfer.shortCode,
        purpose: 'transfer-access'
      });

      if (response.success) {
        setOtpExpiry(response.expiresIn || 1800);
        setResendCooldown(response.cooldown || 60);
        setPageState('otp-verification');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !transfer) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await recipientApi.verifyOTP({
        email: email.trim(),
        shortCode: transfer.shortCode,
        otp: otp.trim()
      });

      if (response.success) {
        setIsVerified(true);
        setPageState('transfer-details');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !transfer) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await recipientApi.requestOTP({
        email: email.trim(),
        shortCode: transfer.shortCode,
        purpose: 'transfer-access'
      });

      if (response.success) {
        setOtpExpiry(response.expiresIn || 1800);
        setResendCooldown(response.cooldown || 60);
        setOtp('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalSize = (): string => {
    if (!transfer?.files) return '0 MB';
    const total = transfer.files.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(total);
  };

  const calculateExpiryDays = (): number => {
    if (!transfer) return 0;
    const now = new Date();
    const expiry = new Date(transfer.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handlePayment = async () => {
    if (!transfer) return;

    // If free, mark as paid immediately
    if (!transfer.amount || transfer.amount === 0) {
      setIsPaid(true);
      return;
    }

    // TODO: Integrate with actual payment provider
    // For now, show alert
    alert('Payment integration coming soon! This would integrate with your payment provider.');

    // Simulate payment success for demo
    // setIsPaid(true);
  };

  const handleDownload = () => {
    if (!isPaid && transfer?.amount && transfer.amount > 0) {
      alert('Please complete payment first');
      return;
    }

    // TODO: Implement actual download logic
    alert('Download functionality coming soon!');
  };

  // Render loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="text-center">
          <p className="text-lg">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="ze-panel max-w-md w-full mx-4 p-8 text-center">
          <WarningCircle width={64} height={64} className="mx-auto mb-4" style={{ color: '#171717' }} />
          <h1 className="text-2xl font-bold mb-4">{error}</h1>
        </div>
      </div>
    );
  }

  // Render email input state
  if (pageState === 'email-input') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="ze-panel max-w-md w-full mx-4 p-8">
          <div className="text-center mb-8">
            <Download width={64} height={64} className="mx-auto mb-4" style={{ color: '#171717' }} />
            <h1 className="text-3xl font-bold mb-2">{t('downloadFiles')}</h1>
            <p className="text-sm" style={{ color: '#666' }}>
              {t('filesExpireIn')} {calculateExpiryDays()} {calculateExpiryDays() === 1 ? 'day' : 'days'}
            </p>
          </div>

          {transfer?.title && (
            <h2 className="text-xl font-bold mb-6 text-center">{transfer.title}</h2>
          )}

          <form onSubmit={handleEmailSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">{t('yourEmail')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ze-form-input w-full"
                placeholder={t('yourEmail')}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="ze-button-primary w-full"
            >
              {isSubmitting ? t('loading') : t('continue')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render OTP verification state
  if (pageState === 'otp-verification') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="ze-panel max-w-md w-full mx-4 p-8">
          <h1 className="text-2xl font-bold mb-2 text-center">{tOtp('title')}</h1>
          <p className="text-sm mb-1 text-center" style={{ color: '#666' }}>
            {tOtp('description')} <strong>{email}</strong>
          </p>
          <p className="text-sm mb-6 text-center" style={{ color: '#666' }}>
            {tOtp('instruction')}
          </p>

          <form onSubmit={handleOtpVerify}>
            <div className="mb-6">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="ze-form-input w-full text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>

            {error && <p className="text-sm text-red-600 mb-4 text-center">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="ze-button-primary w-full mb-4"
            >
              {isSubmitting ? tOtp('verifying') : tOtp('checkAndSend')}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || isSubmitting}
                className="text-sm"
                style={{ color: resendCooldown > 0 ? '#999' : '#171717' }}
              >
                {resendCooldown > 0
                  ? tOtp('waitBeforeResend', { seconds: resendCooldown })
                  : tOtp('resendCode')}
              </button>
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setPageState('email-input')}
                className="text-sm"
                style={{ color: '#171717' }}
              >
                {tOtp('backButton')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render transfer details state (after OTP verification)
  if (pageState === 'transfer-details' && transfer) {
    const fileCount = transfer.files?.length || 0;
    const totalSize = getTotalSize();
    const expiryDays = calculateExpiryDays();
    const price = transfer.amount || 0;
    const isFree = price === 0;

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F5F5F5', padding: '40px 20px' }}>
        <div className="max-w-md mx-auto">
          <div className="ze-panel p-8">
            {/* Download icon and heading */}
            <div className="text-center mb-6">
              <Download width={64} height={64} className="mx-auto mb-4" style={{ color: '#171717' }} />
              <h1 className="text-3xl font-bold mb-2">{t('downloadFiles')}</h1>
              <p className="text-sm" style={{ color: '#666' }}>
                {t('filesExpireIn')} {expiryDays} {expiryDays === 1 ? t('day') : t('days')}
              </p>
            </div>

            {/* Transfer title */}
            {transfer.title && (
              <h2 className="text-xl font-bold mb-6">{transfer.title}</h2>
            )}

            {/* File count and preview button */}
            <div className="flex items-center justify-between mb-4 p-4 rounded" style={{ backgroundColor: '#F0F0F0' }}>
              <div>
                <p className="font-medium">
                  {fileCount} {fileCount === 1 ? t('file') : t('files')}
                </p>
                <p className="text-sm" style={{ color: '#666' }}>{totalSize}</p>
              </div>
              <button
                onClick={() => setShowPreview(true)}
                className="px-4 py-2 rounded font-medium hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'white', color: '#171717' }}
              >
                {t('preview')}
              </button>
            </div>

            {/* Report transfer link */}
            <div className="mb-6 text-center">
              <button className="text-sm flex items-center gap-2 mx-auto" style={{ color: '#666' }}>
                <WarningCircle width={16} height={16} />
                {t('reportTransfer')}
              </button>
            </div>

            {/* Pay and download button */}
            {!isPaid ? (
              <button
                onClick={handlePayment}
                className="ze-button-primary w-full"
              >
                {isFree ? t('payAndDownload') : `${t('payAndDownload')} - ${price} ${tCurrency('cfa')}`}
              </button>
            ) : (
              <button
                onClick={handleDownload}
                className="ze-button-primary w-full"
              >
                Download Files
              </button>
            )}

            {transfer.message && (
              <div className="mt-6 p-4 rounded" style={{ backgroundColor: '#F0F0F0' }}>
                <p className="text-sm" style={{ color: '#666' }}>{transfer.message}</p>
              </div>
            )}
          </div>

          {/* Preview Modal */}
          {transfer.files && transfer.files.length > 0 && (
            <TransferPreviewModal
              files={transfer.files}
              isOpen={showPreview}
              onClose={() => setShowPreview(false)}
              isPaid={isPaid}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}
