'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, SmartphoneDevice, CreditCard, Download, Xmark, Eye, WarningCircle, MessageAlert } from 'iconoir-react';
import LoadingPanel from '@/components/LoadingPanel';
import Header from '@/components/shared/Header';
import TimeOfDayBackground from '@/components/shared/TimeOfDayBackground';
import HeroText from '@/components/shared/HeroText';
import PaperPlaneAnimation from '@/components/shared/PaperPlaneAnimation';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import ToastContainer from '@/components/shared/Toast';
import { TransferSummaryCard } from '@/components/shared/TransferSummaryCard';
import { transferApi, TransferDto } from '@/services/transfer-api';
import { paymentApi } from '@/services/payment-api';
import { storageApi } from '@/services/storage-api';
import { toast } from '@/components/shared/Toast';
import type { MobileMoneyProvider } from '@/features/payment/components/PaymentMethodSelector';
import { PhoneNumberInput } from '@/features/payment/components/PhoneNumberInput';
import type { CountryCode } from 'libphonenumber-js';
import usePaymentStatus from '@/hooks/usePaymentStatus';
import ReportIssueModal from '@/components/shared/ReportIssueModal';

// Helper to extract sender email from senderId
const getSenderEmail = (transfer: TransferDto): string | undefined => {
  if (!transfer.senderId) return undefined;
  if (typeof transfer.senderId === 'object') {
    return transfer.senderId.email;
  }
  return undefined;
};

type PageState = 'loading' | 'password' | 'payment' | 'phone-input' | 'payment-prompt' | 'ready' | 'error';

export default function TransferLandingPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('transferLanding');
  const tPayment = useTranslations('payment');
  const { timeOfDay } = useTimeOfDay();
  const shortCode = params.shortCode as string;

  // Page state
  const [pageState, setPageState] = useState<PageState>('loading');
  const [transfer, setTransfer] = useState<TransferDto | null>(null);
  const [error, setError] = useState<string>('');

  // Password form
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Payment form
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'mobile_money' | 'card' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mobile money
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>('GH');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [providers, setProviders] = useState<Array<{ provider: MobileMoneyProvider; name: string; icon: string }>>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Payment prompt
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Payment status polling
  const {
    pollingStatus,
    error: pollingError,
    startPolling,
    stopPolling,
    reset: resetPolling,
  } = usePaymentStatus({
    interval: 3000,
    timeout: 120000,
    onSuccess: () => {
      toast.success(tPayment('paymentSuccessful'));
      setTimeout(() => {
        setPageState('ready');
      }, 2000);
    },
    onFailed: (payment) => {
      toast.error(payment.failureReason || tPayment('paymentFailed'));
    },
    onTimeout: () => {
      // Keep showing prompt
    },
  });

  // Load transfer data
  useEffect(() => {
    const loadTransfer = async () => {
      try {
        setPageState('loading');
        const response = await transferApi.getTransferByShortCode(shortCode);

        if (!response.error && response.data) {
          setTransfer(response.data);

          if (response.data.status === 'expired') {
            setError(t('transferExpired'));
            setPageState('error');
            return;
          }

          if (response.data.status === 'cancelled') {
            setError(t('transferCancelled'));
            setPageState('error');
            return;
          }

          if (response.data.status === 'pending') {
            setError(t('transferNotReady'));
            setPageState('error');
            return;
          }

          if (response.data.hasPassword) {
            setPageState('password');
            return;
          }

          if (response.data.price && response.data.price > 0) {
            setPageState('payment');
            return;
          }

          setPageState('ready');
        } else {
          setError(response.error?.message || t('transferNotFound'));
          setPageState('error');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : t('transferNotFound');
        setError(errorMessage);
        setPageState('error');
      }
    };

    if (shortCode) {
      loadTransfer();
    }
  }, [shortCode, t]);

  // Fetch mobile money providers
  useEffect(() => {
    if (pageState === 'payment' || pageState === 'phone-input') {
      fetchProviders();
    }
  }, [pageState]);

  // Start polling when in payment prompt state
  useEffect(() => {
    if (pageState === 'payment-prompt' && paymentReference) {
      startPolling(paymentReference);
    }
    return () => stopPolling();
  }, [pageState, paymentReference, startPolling, stopPolling]);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const cachedCountry = localStorage.getItem('zefile_detected_country');
      let url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods`;
      if (cachedCountry) {
        url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${cachedCountry}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      if (data.countryCode && data.countryCode !== 'UNKNOWN') {
        localStorage.setItem('zefile_detected_country', data.countryCode);
      }
      setProviders(data.mobileMoney || []);
      if (data.mobileMoney?.length > 0) {
        setSelectedProvider(data.mobileMoney[0].provider);
      }
    } catch {
      const fallback = [
        { provider: 'mtn_momo' as MobileMoneyProvider, name: 'MTN Mobile Money', icon: 'mtn' },
        { provider: 'vodafone_cash' as MobileMoneyProvider, name: 'Vodafone Cash', icon: 'vodafone' },
        { provider: 'airtel_tigo' as MobileMoneyProvider, name: 'AirtelTigo Money', icon: 'airtel' },
      ];
      setProviders(fallback);
      setSelectedProvider('mtn_momo');
    } finally {
      setLoadingProviders(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !transfer) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await storageApi.getTransferInfo(shortCode, password);

      if (!response.error && response.data) {
        if (transfer.price && transfer.price > 0) {
          setPageState('payment');
        } else {
          setPageState('ready');
        }
      } else {
        setError(t('incorrectPassword'));
      }
    } catch {
      setError(t('incorrectPassword'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    []
  );

  const handlePaymentContinue = async () => {
    if (!selectedPaymentType || !transfer) return;

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(tPayment('invalidEmail'));
      return;
    }

    if (selectedPaymentType === 'mobile_money') {
      setPageState('phone-input');
    } else {
      setIsLoading(true);
      try {
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: 'card',
        });

        if (response.error) {
          toast.error(response.error.message || tPayment('paymentInitFailed'));
          return;
        }

        if (response.data?.authorizationUrl) {
          window.location.href = response.data.authorizationUrl;
        }
      } catch {
        toast.error(tPayment('paymentInitFailed'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMobileMoneySubmit = async () => {
    if (!isPhoneValid || !transfer || !selectedProvider) return;

    setIsLoading(true);

    try {
      const response = await paymentApi.initializePaymentV2({
        transferId: transfer.id,
        customerEmail: customerEmail,
        requestedCurrency: transfer.currency,
        paymentMethod: 'mobile_money',
        mobileMoneyProvider: selectedProvider,
        phoneNumber: phoneNumber,
      });

      if (response.error) {
        toast.error(response.error.message || tPayment('paymentInitFailed'));
        setIsLoading(false);
        return;
      }

      if (response.data) {
        setPaymentReference(response.data.reference);
        setPaymentAmount(response.data.pricingAmountMinorUnits);
        setPageState('payment-prompt');
      }
    } catch {
      toast.error(tPayment('paymentInitFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!transfer) return;

    setIsDownloading(true);

    try {
      const response = await storageApi.streamZipDownload(transfer.shortCode, password || undefined);

      if (response.error) {
        toast.error(response.error.message || t('downloadFailed'));
      }
    } catch {
      toast.error(t('downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => acc + (Number(file.size) || 0), 0);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDaysUntilExpiry = (): string => {
    if (!transfer?.expireAt) return '';
    const now = new Date();
    const expiry = new Date(transfer.expireAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return t('expired');
    return `${diffDays} ${diffDays === 1 ? tPayment('day') : tPayment('days')}`;
  };

  const getProviderName = (provider?: string): string => {
    const names: Record<string, string> = {
      mtn_momo: 'MTN Mobile Money',
      vodafone_cash: 'Vodafone Cash',
      airtel_tigo: 'AirtelTigo Money',
      mpesa: 'M-Pesa',
      airtel_money: 'Airtel Money',
      orange_money: 'Orange Money',
      wave: 'Wave',
    };
    return names[provider || ''] || provider || '';
  };

  const fileCount = transfer?.files?.length || 0;

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container" style={{ position: 'relative', zIndex: 10 }}>
              <LoadingPanel className="py-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container" style={{ position: 'relative', zIndex: 10 }}>
              <div className="ze-upload-panel text-center">
                <WarningCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-[#171717] mb-2">{t('error')}</h1>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Password protection state
  if (pageState === 'password') {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container" style={{ position: 'relative', zIndex: 10 }}>
              <div className="ze-upload-panel">
                {/* Lock Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <Lock className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
                  </div>
                </div>

                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t('passwordProtected')}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t('enterPasswordToAccess')}
                </p>

                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type={isPasswordVisible ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('enterPassword')}
                        className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent pr-12 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !password.trim()}
                    className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('unlockTransfer')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Payment state
  if (pageState === 'payment') {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container flex-col lg:flex-row gap-6" style={{ position: 'relative', zIndex: 10 }}>
              {/* Payment Form Panel */}
              <div className="ze-upload-panel" style={{ maxWidth: '400px' }}>
                <h1 className="text-xl font-bold text-[#171717] mb-2">
                  {tPayment('securePayment')}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  {tPayment('makePaymentToDownload')}
                </p>

                {/* Name Input */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={tPayment('yourName')}
                    className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent text-sm"
                  />
                </div>

                {/* Email Input */}
                <div className="mb-4">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={tPayment('yourEmail')}
                    className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent text-sm"
                  />
                </div>

                {/* Payment Method Section */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[#171717] mb-3">
                    {tPayment('paymentMethodTitle')}
                  </h3>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedPaymentType('mobile_money')}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 rounded transition-all ${
                        selectedPaymentType === 'mobile_money'
                          ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <SmartphoneDevice className={`w-6 h-6 ${selectedPaymentType === 'mobile_money' ? 'text-[#5E53E0]' : 'text-gray-400'}`} />
                      <span className="font-medium text-[#171717] text-sm">{tPayment('mobileMoney')}</span>
                    </button>

                    <button
                      onClick={() => setSelectedPaymentType('card')}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 rounded transition-all ${
                        selectedPaymentType === 'card'
                          ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className={`w-6 h-6 ${selectedPaymentType === 'card' ? 'text-[#5E53E0]' : 'text-gray-400'}`} />
                      <span className="font-medium text-[#171717] text-sm">{tPayment('bankCard')}</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => router.push('/')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    {tPayment('cancel')}
                  </button>
                  <button
                    onClick={handlePaymentContinue}
                    disabled={!selectedPaymentType || !customerEmail || isLoading}
                    className="flex-1 px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {tPayment('payAndDownload')}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>{tPayment('securityGuarantee')}</p>
                </div>
              </div>

              {/* Transfer Summary */}
              {transfer && (
                <div className="w-full lg:w-[300px] flex-shrink-0">
                  <TransferSummaryCard
                    title={transfer.title || 'Untitled'}
                    fileCount={transfer.files?.length || 0}
                    totalSize={calculateTotalSize()}
                    price={transfer.price || 0}
                    currency={transfer.currency || 'XOF'}
                    message={transfer.message}
                    createdAt={transfer.createdAt}
                    senderEmail={getSenderEmail(transfer)}
                    versionCount={transfer.versionCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Phone input state (Mobile Money)
  if (pageState === 'phone-input') {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container flex-col lg:flex-row gap-6" style={{ position: 'relative', zIndex: 10 }}>
              <div className="ze-upload-panel" style={{ maxWidth: '400px' }}>
                <h1 className="text-xl font-bold text-[#171717] mb-2">
                  {tPayment('enterPhoneNumber')}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  {tPayment('enterPhoneForMobileMoney')}
                </p>

                {/* Provider Selection */}
                {loadingProviders ? (
                  <LoadingPanel className="py-4" />
                ) : (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-[#171717] mb-2">
                      {tPayment('selectProvider')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {providers.map((provider) => (
                        <button
                          key={provider.provider}
                          onClick={() => setSelectedProvider(provider.provider)}
                          className={`px-3 py-2 border-2 rounded font-medium transition-all text-sm ${
                            selectedProvider === provider.provider
                              ? 'border-[#5E53E0] bg-[#5E53E0]/5 text-[#5E53E0]'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phone Input */}
                <div className="mb-6">
                  <PhoneNumberInput
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    defaultCountry={phoneCountryCode}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setPageState('payment')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    {tPayment('cancel')}
                  </button>
                  <button
                    onClick={handleMobileMoneySubmit}
                    disabled={!isPhoneValid || !selectedProvider || isLoading}
                    className="flex-1 px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {tPayment('payAndDownload')}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>{tPayment('securityGuarantee')}</p>
                </div>
              </div>

              {/* Transfer Summary */}
              {transfer && (
                <div className="w-full lg:w-[300px] flex-shrink-0">
                  <TransferSummaryCard
                    title={transfer.title || 'Untitled'}
                    fileCount={transfer.files?.length || 0}
                    totalSize={calculateTotalSize()}
                    price={transfer.price || 0}
                    currency={transfer.currency || 'XOF'}
                    message={transfer.message}
                    createdAt={transfer.createdAt}
                    senderEmail={getSenderEmail(transfer)}
                    versionCount={transfer.versionCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Payment prompt state (STK Push waiting)
  if (pageState === 'payment-prompt') {
    const isSuccess = pollingStatus === 'success';
    const isFailed = pollingStatus === 'failed';
    const isTimeout = pollingStatus === 'timeout';
    const isPolling = pollingStatus === 'polling';

    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container flex-col lg:flex-row gap-6" style={{ position: 'relative', zIndex: 10 }}>
              <div className="ze-upload-panel" style={{ maxWidth: '400px' }}>
                {/* Status Icon */}
                <div className="flex justify-center mb-4">
                  {isSuccess ? (
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Download className="w-8 h-8 text-green-600" />
                    </div>
                  ) : isFailed ? (
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <Xmark className="w-8 h-8 text-red-600" />
                    </div>
                  ) : isTimeout ? (
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                      <WarningCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                  ) : (
                    <LoadingPanel />
                  )}
                </div>

                {/* Status Message */}
                <div className="text-center mb-4">
                  {isSuccess ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment('paymentSuccessful')}
                      </h1>
                      <p className="text-sm text-gray-600">{t('readyToDownload')}</p>
                    </>
                  ) : isFailed ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment('paymentFailed')}
                      </h1>
                      <p className="text-sm text-gray-600">{pollingError || tPayment('youWereNotCharged')}</p>
                    </>
                  ) : isTimeout ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment('takingLongerThanUsual')}
                      </h1>
                      <p className="text-sm text-gray-600">{tPayment('didntReceivePrompt')}</p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment('checkYourPhone')}
                      </h1>
                      <p className="text-sm text-gray-600">{tPayment('confirmPaymentOn')}</p>
                    </>
                  )}
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">{tPayment('payWith')}</span>
                    <span className="font-medium text-[#171717]">{getProviderName(selectedProvider || '')}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">{tPayment('phoneNumber')}</span>
                    <span className="font-medium text-[#171717]">{phoneNumber}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600">{tPayment('amount')}</span>
                    <span className="font-bold text-[#171717]">
                      {paymentAmount ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === 'XOF' ? 'Fr CFA' : transfer?.currency || ''}` : ''}
                    </span>
                  </div>
                </div>

                {/* Polling Status */}
                {isPolling && (
                  <p className="text-xs text-gray-500 text-center mb-4">{tPayment('waitingForConfirmation')}</p>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {isSuccess && (
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      {t('downloadFiles')}
                    </button>
                  )}

                  {(isFailed || isTimeout) && (
                    <button
                      onClick={() => {
                        resetPolling();
                        setPageState('phone-input');
                      }}
                      className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
                    >
                      {tPayment('resend')}
                    </button>
                  )}

                  {!isSuccess && (
                    <button
                      onClick={() => {
                        resetPolling();
                        setPageState('payment');
                      }}
                      className="w-full px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors text-sm"
                    >
                      {tPayment('useDifferentMethod')}
                    </button>
                  )}
                </div>
              </div>

              {/* Transfer Summary */}
              {transfer && (
                <div className="w-full lg:w-[300px] flex-shrink-0">
                  <TransferSummaryCard
                    title={transfer.title || 'Untitled'}
                    fileCount={transfer.files?.length || 0}
                    totalSize={calculateTotalSize()}
                    price={transfer.price || 0}
                    currency={transfer.currency || 'XOF'}
                    message={transfer.message}
                    createdAt={transfer.createdAt}
                    senderEmail={getSenderEmail(transfer)}
                    versionCount={transfer.versionCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Ready to download state (free transfer or paid)
  if (pageState === 'ready' && transfer) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />

        {/* Report Issue Modal */}
        {showDisputeModal && (
          <ReportIssueModal
            transferId={transfer.id}
            shortCode={shortCode}
            role="recipient"
            onClose={() => setShowDisputeModal(false)}
          />
        )}

        <main style={{ minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
          <div className={`ze-content-panel ze-time-${timeOfDay}`} style={{ position: 'relative', overflow: 'hidden' }}>
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div className="ze-panels-container" style={{ position: 'relative', zIndex: 10 }}>
              <div className="ze-upload-panel">
                {/* Download Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <Download className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t('downloadFiles')}
                </h1>

                {/* Expiry Info */}
                {transfer.expireAt && (
                  <p className="text-sm text-gray-500 text-center mb-4">
                    {t('filesExpireIn')} <span className="font-semibold text-[#171717]">{getDaysUntilExpiry()}</span>
                  </p>
                )}

                {/* Transfer Title */}
                <h2 className="text-base font-semibold text-[#171717] mb-3">
                  {transfer.title || t('untitled')}
                </h2>

                {/* File Info Row */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg mb-4">
                  <div>
                    <p className="text-sm font-medium text-[#171717]">
                      {fileCount} {fileCount === 1 ? t('file') : t('files')}
                    </p>
                    <p className="text-xs text-gray-500">{formatSize(calculateTotalSize())}</p>
                  </div>
                  <button
                    onClick={() => {/* TODO: Open preview */}}
                    className="text-sm text-[#171717] underline hover:no-underline font-medium"
                  >
                    {t('preview')}
                  </button>
                </div>

                {/* Report Link */}
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-4 transition-colors"
                >
                  <MessageAlert className="w-4 h-4" />
                  {t('reportTransfer')}
                </button>

                {/* Preview/Download Button */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? t('preparingDownload') : t('preview')}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
