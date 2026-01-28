'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, SmartphoneDevice, CreditCard, Download, Xmark, Eye, WarningCircle } from 'iconoir-react';
import LoadingPanel from '@/components/LoadingPanel';
import Header from '@/components/shared/Header';
import { TransferSummaryCard } from '@/components/shared/TransferSummaryCard';
import { transferApi, TransferDto } from '@/services/transfer-api';
import { paymentApi } from '@/services/payment-api';
import { storageApi } from '@/services/storage-api';
import { toast } from '@/components/shared/Toast';
import type { MobileMoneyProvider } from '@/features/payment/components/PaymentMethodSelector';
import { PhoneNumberInput } from '@/features/payment/components/PhoneNumberInput';
import type { CountryCode } from 'libphonenumber-js';
import usePaymentStatus from '@/hooks/usePaymentStatus';

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
  const t = useTranslations('transferLanding');
  const tPayment = useTranslations('payment');
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
      // AC5: Wait 2 seconds before transitioning to ready state
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

          // Check if transfer is expired or cancelled
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

          // Check if transfer is still pending (not yet active)
          if (response.data.status === 'pending') {
            setError(t('transferNotReady'));
            setPageState('error');
            return;
          }

          // Check if password protected
          if (response.data.hasPassword) {
            setPageState('password');
            return;
          }

          // Check if requires payment
          if (response.data.price && response.data.price > 0) {
            setPageState('payment');
            return;
          }

          // Free transfer - ready to download
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

  // Fetch mobile money providers when entering payment mode
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
      // Verify password using storage API
      const response = await storageApi.getTransferInfo(shortCode, password);

      if (!response.error && response.data) {
        // Password is correct - proceed based on price
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

    // Validate email
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(tPayment('invalidEmail'));
      return;
    }

    if (selectedPaymentType === 'mobile_money') {
      setPageState('phone-input');
    } else {
      // Card payment - redirect to payment provider
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

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <LoadingPanel className="py-32" />
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="text-center max-w-md mx-auto px-6">
            <WarningCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#171717] mb-2">{t('error')}</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Password protection state
  if (pageState === 'password') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Password Form */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <div className="w-16 h-16 bg-[#5E53E0]/10 rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8 text-[#5E53E0]" />
                </div>
                <h1 className="text-3xl font-bold text-[#171717] mb-2">
                  {t('passwordProtected')}
                </h1>
                <p className="text-gray-600">
                  {t('enterPasswordToAccess')}
                </p>
              </div>

              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#171717] mb-2">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <input
                      type={isPasswordVisible ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('enterPassword')}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={isPasswordVisible ? t('hidePassword') : t('showPassword')}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password.trim()}
                  className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                                    {t('unlockTransfer')}
                </button>
              </form>
            </div>

            {/* Right Column - Transfer Summary */}
            {transfer && (
              <div className="w-full lg:w-[340px] flex-shrink-0 order-first lg:order-last">
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
      </div>
    );
  }

  // Payment state
  if (pageState === 'payment') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Payment Form */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#171717]">
                  {tPayment('securePayment')}
                </h1>
                <p className="text-gray-600 mt-2">
                  {tPayment('makePaymentToDownload')}
                </p>
              </div>

              {/* Name Input */}
              <div className="mb-4">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={tPayment('yourName')}
                  className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
                />
              </div>

              {/* Email Input */}
              <div className="mb-6">
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={tPayment('yourEmail')}
                  className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
                />
              </div>

              {/* Payment Method Section */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#171717] mb-4">
                  {tPayment('paymentMethodTitle')}
                </h3>

                <div className="flex gap-4">
                  {/* Mobile Money Button */}
                  <button
                    onClick={() => setSelectedPaymentType('mobile_money')}
                    className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 border-2 rounded transition-all ${
                      selectedPaymentType === 'mobile_money'
                        ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <SmartphoneDevice className={`w-8 h-8 ${selectedPaymentType === 'mobile_money' ? 'text-[#5E53E0]' : 'text-gray-400'}`} />
                    <span className="font-medium text-[#171717]">{tPayment('mobileMoney')}</span>
                  </button>

                  {/* Card Button */}
                  <button
                    onClick={() => setSelectedPaymentType('card')}
                    className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 border-2 rounded transition-all ${
                      selectedPaymentType === 'card'
                        ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className={`w-8 h-8 ${selectedPaymentType === 'card' ? 'text-[#5E53E0]' : 'text-gray-400'}`} />
                    <span className="font-medium text-[#171717]">{tPayment('bankCard')}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => window.location.href = '/'}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {tPayment('cancel')}
                </button>
                <button
                  onClick={handlePaymentContinue}
                  disabled={!selectedPaymentType || !customerEmail || isLoading}
                  className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                                    {tPayment('payAndDownload')}
                </button>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 text-sm text-gray-500">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{tPayment('securityGuarantee')}</p>
              </div>
            </div>

            {/* Right Column - Transfer Summary */}
            {transfer && (
              <div className="w-full lg:w-[340px] flex-shrink-0 order-first lg:order-last">
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
      </div>
    );
  }

  // Phone input state (Mobile Money)
  if (pageState === 'phone-input') {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Phone Form */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#171717]">
                  {tPayment('enterPhoneNumber')}
                </h1>
                <p className="text-gray-600 mt-2">
                  {tPayment('enterPhoneForMobileMoney')}
                </p>
              </div>

              {/* Provider Selection */}
              {loadingProviders ? (
                <LoadingPanel className="py-4" />
              ) : (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-[#171717] mb-3">
                    {tPayment('selectProvider')}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {providers.map((provider) => (
                      <button
                        key={provider.provider}
                        onClick={() => setSelectedProvider(provider.provider)}
                        className={`px-4 py-2 border-2 rounded font-medium transition-all ${
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
              <div className="mb-8">
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  defaultCountry={phoneCountryCode}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setPageState('payment')}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {tPayment('cancel')}
                </button>
                <button
                  onClick={handleMobileMoneySubmit}
                  disabled={!isPhoneValid || !selectedProvider || isLoading}
                  className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                                    {tPayment('payAndDownload')}
                </button>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 text-sm text-gray-500">
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{tPayment('securityGuarantee')}</p>
              </div>
            </div>

            {/* Right Column - Transfer Summary */}
            {transfer && (
              <div className="w-full lg:w-[340px] flex-shrink-0 order-first lg:order-last">
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
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Status */}
            <div className="flex-1 min-w-0">
              {/* Status Icon */}
              <div className="mb-6">
                {isSuccess ? (
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <Download className="w-10 h-10 text-green-600" />
                  </div>
                ) : isFailed ? (
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                    <Xmark className="w-10 h-10 text-red-600" />
                  </div>
                ) : isTimeout ? (
                  <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                    <WarningCircle className="w-10 h-10 text-yellow-600" />
                  </div>
                ) : (
                  <LoadingPanel />
                )}
              </div>

              {/* Status Message */}
              <div className="mb-6">
                {isSuccess ? (
                  <>
                    <h1 className="text-3xl font-bold text-[#171717] mb-2">
                      {tPayment('paymentSuccessful')}
                    </h1>
                    <p className="text-gray-600">{t('readyToDownload')}</p>
                  </>
                ) : isFailed ? (
                  <>
                    <h1 className="text-3xl font-bold text-[#171717] mb-2">
                      {tPayment('paymentFailed')}
                    </h1>
                    <p className="text-gray-600">{pollingError || tPayment('youWereNotCharged')}</p>
                  </>
                ) : isTimeout ? (
                  <>
                    <h1 className="text-3xl font-bold text-[#171717] mb-2">
                      {tPayment('takingLongerThanUsual')}
                    </h1>
                    <p className="text-gray-600">{tPayment('didntReceivePrompt')}</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-[#171717] mb-2">
                      {tPayment('checkYourPhone')}
                    </h1>
                    <p className="text-gray-600">{tPayment('confirmPaymentOn')}</p>
                  </>
                )}
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 rounded-lg p-5 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">{tPayment('payWith')}</span>
                  <span className="font-medium text-[#171717]">{getProviderName(selectedProvider || '')}</span>
                </div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600">{tPayment('phoneNumber')}</span>
                  <span className="font-medium text-[#171717]">{phoneNumber}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-gray-600">{tPayment('amount')}</span>
                  <span className="font-bold text-lg text-[#171717]">
                    {paymentAmount ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === 'XOF' ? 'Fr CFA' : transfer?.currency || ''}` : ''}
                  </span>
                </div>
              </div>

              {/* Polling Status */}
              {isPolling && (
                <p className="text-sm text-gray-500 mb-6">{tPayment('waitingForConfirmation')}</p>
              )}

              {/* Actions */}
              <div className="space-y-3">
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
                    className="w-full px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
                  >
                    {tPayment('useDifferentMethod')}
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Transfer Summary */}
            {transfer && (
              <div className="w-full lg:w-[340px] flex-shrink-0 order-first lg:order-last">
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
      </div>
    );
  }

  // Ready to download state (free transfer or paid)
  if (pageState === 'ready' && transfer) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Download Ready */}
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <div className="w-20 h-20 bg-[#87E64B]/20 rounded-full flex items-center justify-center mb-6">
                  <Download className="w-10 h-10 text-[#87E64B]" />
                </div>
                <h1 className="text-3xl font-bold text-[#171717] mb-2">
                  {t('filesReadyToDownload')}
                </h1>
                <p className="text-gray-600">
                  {t('clickToDownloadAll')}
                </p>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full px-6 py-4 bg-[#87E64B] text-[#171717] font-medium text-lg rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Download className="w-6 h-6" />
                {isDownloading ? t('preparingDownload') : t('downloadAllFiles')}
              </button>

              {/* Transfer info */}
              {transfer.message && (
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{transfer.message}</p>
                </div>
              )}
            </div>

            {/* Right Column - Transfer Summary */}
            <div className="w-full lg:w-[340px] flex-shrink-0 order-first lg:order-last">
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
          </div>
        </div>
      </div>
    );
  }

  return null;
}
