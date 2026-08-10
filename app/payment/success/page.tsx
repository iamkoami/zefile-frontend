'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toIntlLocale } from '@/lib/locale';
import { formatCurrencyFromMinor } from '@/lib/currency';
import { Download, PageEdit, ArrowDown } from 'iconoir-react';
import Header from '@/components/shared/Header';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import { paymentApi, PaymentStatusV2Response } from '@/services/payment-api';
import { transferApi, TransferDto } from '@/services/transfer-api';
import { storageApi } from '@/services/storage-api';
import { toast } from '@/components/shared/Toast';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const t = useTranslations('payment');
  const locale = useLocale();
  const tLanding = useTranslations('transferLanding');
  const [reference, setReference] = useState<string>('');
  const [transfer, setTransfer] = useState<TransferDto | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentStatusV2Response | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadPaymentDetails = async () => {
      const ref = searchParams.get('reference');

      if (ref) {
        setReference(ref);

        try {
          // Get payment status
          const paymentResponse = await paymentApi.getPaymentStatusV2(ref);
          if (paymentResponse.data) {
            setPaymentInfo(paymentResponse.data);

            // If we have a transferId, fetch the transfer details
            if (paymentResponse.data.transferId) {
              const transferResponse = await transferApi.getTransferById(paymentResponse.data.transferId);
              if (transferResponse.data) {
                setTransfer(transferResponse.data);
              }
            }
          }
        } catch {
          // If we can't get payment details, try shortCode
        }
      }

      setIsLoading(false);
    };

    loadPaymentDetails();
  }, [searchParams]);

  // Story 144.15, at cross-model review — a fourth copy of the same local symbol map lived here,
  // reading XOF as 'Fr CFA' with unbounded fraction digits, on the screen a buyer lands on right
  // after paying. It now formats exactly like every other money surface in the app.
  const formatAmount = (amount: number, currency?: string): string =>
    formatCurrencyFromMinor(amount, currency || 'XOF', locale);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(toIntlLocale(locale), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getExpiryDays = (): number => {
    if (!transfer?.expireAt) return 0;
    const expiry = new Date(transfer.expireAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => {
      const fileSize = Number(file.fileSize) || Number(file.size) || 0;
      return acc + fileSize;
    }, 0);
  };

  const handleDownload = async () => {
    if (!transfer?.shortCode) {
      toast.error(tLanding('downloadFailed'));
      return;
    }

    setIsDownloading(true);
    try {
      const response = await storageApi.streamZipDownload(transfer.shortCode);
      if (response.error) {
        toast.error(response.error.message || tLanding('downloadFailed'));
      }
    } catch {
      toast.error(tLanding('downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return <LoadingFullscreen />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Title */}
        <h1 className="text-4xl font-bold text-[#171717] mb-8">
          {t('paymentConfirmed')}
        </h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Transfer Summary Card */}
          <div className="flex-1 min-w-0">
            <div className="bg-[#FDF8F0] rounded-lg p-8">
              {/* Transfer Title */}
              <h2 className="text-2xl font-bold text-[#171717] mb-2">
                {transfer?.title || 'Invoice de ZeFile'}
              </h2>

              {/* File Info & Date */}
              <p className="text-sm text-gray-500 mb-6">
                {transfer?.files?.length || 0} {(transfer?.files?.length || 0) === 1 ? t('file') : t('files')} - {formatFileSize(calculateTotalSize())} - {t('sentOn')} {formatDate(transfer?.createdAt)}
              </p>

              {/* Message */}
              {transfer?.message && (
                <p className="text-gray-600 mb-8 leading-relaxed">
                  {transfer.message}
                </p>
              )}

              {/* File Count Box */}
              <div className="bg-white rounded-lg p-4 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PageEdit className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-[#171717]">
                    {transfer?.files?.length || 0} {(transfer?.files?.length || 0) === 1 ? t('file') : t('files')}
                  </span>
                </div>
                <span className="font-medium text-gray-600">
                  {formatFileSize(calculateTotalSize())}
                </span>
              </div>

              {/* Amount Paid */}
              <div className="flex items-center justify-between pt-4 border-t border-[#E8E0D5]">
                <span className="font-bold text-[#171717]">{t('amountPaid')}</span>
                <span className="text-xl font-bold text-[#171717]">
                  {formatAmount(
                    paymentInfo?.pricingAmountMinorUnits || transfer?.price || 0,
                    paymentInfo?.pricingCurrency || transfer?.currency
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Download Section */}
          <div className="w-full lg:w-[340px] flex-shrink-0 order-first lg:order-last">
            <div className="flex flex-col items-center text-center">
              {/* Download Arrow Icon */}
              <div className="mb-6">
                <div className="w-24 h-24 flex items-center justify-center">
                  <ArrowDown className="w-16 h-16 text-gray-300 stroke-[1.5]" />
                </div>
              </div>

              {/* Download Title */}
              <h3 className="text-xl font-bold text-[#171717] mb-2">
                {t('downloadTheFiles')}
              </h3>

              {/* Expiry Notice */}
              <p className="text-gray-500 mb-2">
                {tLanding('filesExpireIn')}
              </p>
              <p className="text-[#171717] font-medium mb-8">
                {getExpiryDays()} {getExpiryDays() === 1 ? t('day') : t('days')}
              </p>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading || !transfer?.shortCode}
                className="w-full max-w-xs px-8 py-4 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {t('download')}
              </button>
            </div>
          </div>
        </div>

        {/* Reference (small text) */}
        {reference && (
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400">
              {t('transactionReference')}: <span className="font-mono">{reference}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
