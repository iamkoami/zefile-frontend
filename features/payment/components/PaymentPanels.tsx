'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { CreditCard, SmartphoneDevice, CheckCircle, XmarkCircle, WarningCircle, Lock, NavArrowDown, Clock } from 'iconoir-react';
import LoadingPanel from '@/components/LoadingPanel';
import { useTranslations } from 'next-intl';
import { useDrawerStore } from '@/stores/drawer-store';
import { PhoneNumberInput } from '@/features/payment/components/PhoneNumberInput';
import { paymentApi } from '@/services/payment-api';
import { toast } from '@/components/shared/Toast';
import { TransferSummaryCard } from '@/components/shared/TransferSummaryCard';
import type { MobileMoneyProvider } from '@/features/payment/components/PaymentMethodSelector';
import type { CountryCode } from 'libphonenumber-js';
import usePaymentStatus from '@/hooks/usePaymentStatus';

// Country data with flags
const COUNTRIES = [
  { code: 'TG', name: 'Togo', flag: '🇹🇬', phoneCode: '+228' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', phoneCode: '+233' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneCode: '+234' },
  { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', phoneCode: '+225' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', phoneCode: '+221' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', phoneCode: '+229' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', phoneCode: '+226' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', phoneCode: '+223' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', phoneCode: '+254' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', phoneCode: '+27' },
];

// Provider icon mapping
const getProviderIcon = (provider: string): string => {
  const iconMap: Record<string, string> = {
    mtn_momo: '/icons/payment/mtn.svg',
    vodafone_cash: '/icons/payment/vodafone.svg',
    airtel_tigo: '/icons/payment/airtel.svg',
    mpesa: '/icons/payment/mpesa.svg',
    airtel_money: '/icons/payment/airtel.svg',
    orange_money: '/icons/payment/orange.svg',
    wave: '/icons/payment/wave.svg',
    flooz: '/icons/payment/orange.svg',
    tmoney: '/icons/payment/mtn.svg',
  };
  return iconMap[provider] || '/icons/payment/mtn.svg';
};

// ============================================
// PaymentMethodPanel - Step 1: Select payment method
// ============================================

export function PaymentMethodPanel() {
  const t = useTranslations('payment');
  const {
    selectedTransfer,
    payload,
    pushView,
    setPaymentMethod,
    setPaymentFlowData,
    closeDrawer,
  } = useDrawerStore();

  const [selectedMethodType, setSelectedMethodType] = useState<'mobile_money' | 'card' | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(payload?.paymentFlowData?.senderEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [providers, setProviders] = useState<Array<{ provider: MobileMoneyProvider; name: string; icon: string }>>([]);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>('TG');

  const transfer = selectedTransfer;

  // Pre-fill email from flow data
  useEffect(() => {
    if (payload?.paymentFlowData?.senderEmail) {
      setCustomerEmail(payload.paymentFlowData.senderEmail);
    }
  }, [payload?.paymentFlowData?.senderEmail]);

  // Fetch mobile money providers when country changes or mobile money is selected
  useEffect(() => {
    const fetchProviders = async () => {
      if (selectedMethodType !== 'mobile_money') return;

      setLoadingProviders(true);
      try {
        const cachedCountry = localStorage.getItem('zefile_detected_country');
        let url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods`;
        if (cachedCountry) {
          url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${cachedCountry}`;
        } else if (selectedCountry.code) {
          url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${selectedCountry.code}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        if (data.countryCode && data.countryCode !== 'UNKNOWN') {
          localStorage.setItem('zefile_detected_country', data.countryCode);
          // Update selected country based on detected country
          const detected = COUNTRIES.find(c => c.code === data.countryCode);
          if (detected) {
            setSelectedCountry(detected);
            setPhoneCountryCode(detected.code as CountryCode);
          }
        }
        setProviders(data.mobileMoney || []);
        // Auto-select first provider
        if (data.mobileMoney?.length > 0) {
          setSelectedProvider(data.mobileMoney[0].provider);
        }
      } catch {
        // Fallback providers
        const fallback = [
          { provider: 'mtn_momo' as MobileMoneyProvider, name: 'MTN Mobile Money', icon: 'mtn' },
          { provider: 'orange_money' as MobileMoneyProvider, name: 'Orange Money', icon: 'orange' },
        ];
        setProviders(fallback);
        setSelectedProvider('mtn_momo');
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, [selectedMethodType, selectedCountry.code]);

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    []
  );

  const handleContinue = async () => {
    if (!selectedMethodType || !transfer) return;

    // Validate email
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(t('invalidEmail'));
      return;
    }

    // Update flow data with email
    setPaymentFlowData({ senderEmail: customerEmail });

    if (selectedMethodType === 'mobile_money') {
      // Validate phone number for mobile money
      if (!isPhoneValid || !selectedProvider) {
        toast.error(t('invalidPhoneNumber'));
        return;
      }

      setIsLoading(true);
      try {
        // Update payment method with selected provider
        setPaymentMethod({ type: 'mobile_money', provider: selectedProvider });

        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: 'mobile_money',
          mobileMoneyProvider: selectedProvider,
          phoneNumber: phoneNumber,
        });

        if (response.error) {
          toast.error(response.error.message || t('paymentInitFailed'));
          setIsLoading(false);
          return;
        }

        if (response.data) {
          // Store payment data and go to prompt step
          setPaymentFlowData({
            senderEmail: customerEmail,
            phoneNumber,
            phoneCountryCode,
            isPhoneValid: true,
            paymentReference: response.data.reference,
            paymentAmount: response.data.pricingAmountMinorUnits,
          });
          pushView('payment-prompt');
        }
      } catch {
        toast.error(t('paymentInitFailed'));
      } finally {
        setIsLoading(false);
      }
    } else {
      // For card payments, initialize and redirect
      setIsLoading(true);
      try {
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: 'card',
        });

        if (response.error) {
          toast.error(response.error.message || t('paymentInitFailed'));
          return;
        }

        if (response.data?.authorizationUrl) {
          window.location.href = response.data.authorizationUrl;
        }
      } catch {
        toast.error(t('paymentInitFailed'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => acc + (Number(file.size) || 0), 0);
  };

  const formatPrice = (price: number, currency?: string): string => {
    const majorUnits = price / 100;
    if (currency === 'XOF') {
      return `${majorUnits.toLocaleString()} XOF`;
    }
    return `${majorUnits.toLocaleString()} ${currency || ''}`;
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const isFormValid = selectedMethodType === 'card'
    ? selectedMethodType && customerEmail
    : selectedMethodType && customerEmail && isPhoneValid && selectedProvider;

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto">
      {/* Left Column - Payment Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#171717]">
            {t('securePayment')}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('makePaymentToDownload')}
          </p>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t('yourName')}
            className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
          />
        </div>

        {/* Email Input */}
        <div className="mb-6">
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder={t('yourEmail')}
            className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
          />
        </div>

        {/* Payment Method Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[#171717] mb-4">
            {t('paymentMethodTitle')}
          </h3>

          {/* Country Selector */}
          <div className="relative mb-4">
            <button
              type="button"
              onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded text-[#171717] bg-white hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </div>
              <NavArrowDown className={`w-5 h-5 text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCountryDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(country);
                      setPhoneCountryCode(country.code as CountryCode);
                      setIsCountryDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      selectedCountry.code === country.code ? 'bg-[#5E53E0]/5' : ''
                    }`}
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <span>{country.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-4">
            {/* Mobile Money Button */}
            <button
              onClick={() => setSelectedMethodType('mobile_money')}
              className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 border-2 rounded transition-all ${
                selectedMethodType === 'mobile_money'
                  ? 'border-[#87E64B] bg-[#87E64B]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <SmartphoneDevice className={`w-8 h-8 ${selectedMethodType === 'mobile_money' ? 'text-[#171717]' : 'text-gray-400'}`} />
              <span className="font-medium text-[#171717]">{t('mobileMoney')}</span>
            </button>

            {/* Card Button */}
            <button
              onClick={() => setSelectedMethodType('card')}
              className={`flex-1 flex flex-col items-center justify-center gap-3 p-6 border-2 rounded transition-all ${
                selectedMethodType === 'card'
                  ? 'border-[#87E64B] bg-[#87E64B]/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className={`w-8 h-8 ${selectedMethodType === 'card' ? 'text-[#171717]' : 'text-gray-400'}`} />
              <span className="font-medium text-[#171717]">{t('bankCard')}</span>
            </button>
          </div>

          {/* Provider Selection - Show when Mobile Money is selected */}
          {selectedMethodType === 'mobile_money' && (
            <>
              {loadingProviders ? (
                <div className="flex items-center justify-center py-6">
                  <LoadingPanel />
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 mb-4">
                  {providers.map((provider) => (
                    <button
                      key={provider.provider}
                      onClick={() => setSelectedProvider(provider.provider)}
                      className={`flex items-center gap-3 px-4 py-3 border-2 rounded transition-all min-w-[160px] ${
                        selectedProvider === provider.provider
                          ? 'border-[#87E64B] bg-[#87E64B]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-10 h-10 rounded overflow-hidden bg-white flex items-center justify-center">
                        <Image
                          src={getProviderIcon(provider.provider)}
                          alt={provider.name}
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <div className="text-left">
                        <span className="block font-medium text-[#171717] text-sm">{provider.name}</span>
                        <span className="block text-xs text-gray-500">
                          {formatPrice(transfer.price || 0, transfer.currency)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Phone Input */}
              <div className="mb-4">
                <PhoneNumberInput
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  defaultCountry={phoneCountryCode}
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={closeDrawer}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleContinue}
            disabled={!isFormValid || isLoading}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? t('processing') : t('payAndDownload')}
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 text-sm text-gray-500">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{t('securityGuarantee')}</p>
        </div>
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
        />
      </div>
    </div>
  );
}

// ============================================
// PaymentPhonePanel - Step 2: Enter phone number
// ============================================

export function PaymentPhonePanel() {
  const t = useTranslations('payment');
  const {
    selectedTransfer,
    payload,
    pushView,
    popView,
    setPaymentFlowData,
    setPaymentMethod,
  } = useDrawerStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>('GH');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider | null>(null);
  const [providers, setProviders] = useState<Array<{ provider: MobileMoneyProvider; name: string; icon: string }>>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const transfer = selectedTransfer;
  const senderEmail = payload?.paymentFlowData?.senderEmail || '';

  // Fetch mobile money providers
  useEffect(() => {
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
        // Auto-select first provider
        if (data.mobileMoney?.length > 0) {
          setSelectedProvider(data.mobileMoney[0].provider);
        }
      } catch {
        // Fallback providers
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
    fetchProviders();
  }, []);

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    []
  );

  const handleSubmit = async () => {
    if (!isPhoneValid || !transfer || !selectedProvider) {
      return;
    }

    setIsLoading(true);

    try {
      // Update payment method with selected provider
      setPaymentMethod({ type: 'mobile_money', provider: selectedProvider });

      const response = await paymentApi.initializePaymentV2({
        transferId: transfer.id,
        customerEmail: senderEmail,
        requestedCurrency: transfer.currency,
        paymentMethod: 'mobile_money',
        mobileMoneyProvider: selectedProvider,
        phoneNumber: phoneNumber,
      });

      if (response.error) {
        toast.error(response.error.message || t('paymentInitFailed'));
        setIsLoading(false);
        return;
      }

      if (response.data) {
        // Store payment data and go to prompt step
        setPaymentFlowData({
          phoneNumber,
          phoneCountryCode,
          isPhoneValid: true,
          paymentReference: response.data.reference,
          paymentAmount: response.data.pricingAmountMinorUnits,
        });
        pushView('payment-prompt');
      }
    } catch {
      toast.error(t('paymentInitFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => acc + (Number(file.size) || 0), 0);
  };

  if (!transfer) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  return (
    <div className="flex gap-8 max-w-5xl mx-auto">
      {/* Left Column - Phone Input Form */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#171717]">
            {t('enterPhoneNumber')}
          </h2>
          <p className="text-gray-600 mt-2">
            {t('enterPhoneForMobileMoney')}
          </p>
        </div>

        {/* Provider Selection */}
        {loadingProviders ? (
          <div className="flex items-center justify-center py-8">
            <LoadingPanel />
          </div>
        ) : (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#171717] mb-3">
              {t('selectProvider')}
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
            onClick={popView}
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isPhoneValid || !selectedProvider || isLoading}
            className="flex-1 px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? t('processing') : t('payAndDownload')}
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-3 text-sm text-gray-500">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>{t('securityGuarantee')}</p>
        </div>
      </div>

      {/* Right Column - Transfer Summary */}
      <div className="w-[340px] flex-shrink-0">
        <TransferSummaryCard
          title={transfer.title || 'Untitled'}
          fileCount={transfer.files?.length || 0}
          totalSize={calculateTotalSize()}
          price={transfer.price || 0}
          currency={transfer.currency || 'XOF'}
          message={transfer.message}
          createdAt={transfer.createdAt}
        />
      </div>
    </div>
  );
}

// ============================================
// PaymentPromptPanel - Step 3: STK Push waiting
// ============================================

export function PaymentPromptPanel() {
  const t = useTranslations('payment');
  const {
    selectedTransfer,
    payload,
    popView,
    closeDrawer,
    resetPaymentFlow,
  } = useDrawerStore();

  const transfer = selectedTransfer;
  const paymentMethod = payload?.paymentMethod;
  const flowData = payload?.paymentFlowData;

  const {
    pollingStatus,
    error,
    startPolling,
    stopPolling,
    reset: resetPolling,
  } = usePaymentStatus({
    interval: 3000,
    timeout: 120000, // 2 minutes
    onSuccess: () => {
      toast.success(t('paymentSuccessful'));
      // Reload to refresh transfer state
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    },
    onFailed: (payment) => {
      toast.error(payment.failureReason || t('paymentFailed'));
    },
    onTimeout: () => {
      // Keep showing the prompt, user can retry
    },
  });

  // Start polling when component mounts
  useEffect(() => {
    if (flowData?.paymentReference) {
      startPolling(flowData.paymentReference);
    }

    return () => {
      stopPolling();
    };
  }, [flowData?.paymentReference, startPolling, stopPolling]);

  const handleRetry = () => {
    resetPolling();
    popView(); // Go back to phone input
  };

  const handleChangeMethod = () => {
    resetPolling();
    resetPaymentFlow();
    // Go back to payment method selection (pop twice)
    popView();
    popView();
  };

  const handleCancel = () => {
    resetPolling();
    resetPaymentFlow();
    closeDrawer();
  };

  const getCurrencySymbol = (currency?: string): string => {
    const symbols: Record<string, string> = {
      XOF: 'Fr CFA',
      NGN: '₦',
      GHS: '₵',
      KES: 'KSh',
      ZAR: 'R',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    return symbols[currency || 'XOF'] || currency || '';
  };

  const formatAmount = (amount: number, currency?: string): string => {
    const majorUnits = amount / 100;
    const symbol = getCurrencySymbol(currency);
    if (currency === 'XOF') {
      return `${majorUnits.toLocaleString()} ${symbol}`;
    }
    return `${symbol}${majorUnits.toLocaleString()}`;
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

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => acc + (Number(file.size) || 0), 0);
  };

  if (!transfer || !paymentMethod || !flowData) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingPanel />
      </div>
    );
  }

  const isSuccess = pollingStatus === 'success';
  const isFailed = pollingStatus === 'failed';
  const isTimeout = pollingStatus === 'timeout';
  const isPolling = pollingStatus === 'polling';

  return (
    <div className="flex gap-8 max-w-5xl mx-auto">
      {/* Left Column - Status */}
      <div className="flex-1 min-w-0">
        {/* Status Icon */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          ) : isFailed ? (
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XmarkCircle className="w-10 h-10 text-red-600" />
            </div>
          ) : isTimeout ? (
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <WarningCircle className="w-10 h-10 text-yellow-600" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-[#5E53E0]/10 rounded-full flex items-center justify-center animate-pulse">
              <Clock className="w-10 h-10 text-[#5E53E0]" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="mb-6">
          {isSuccess ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t('paymentSuccessful')}
              </h2>
              <p className="text-gray-600">{t('redirectingToDownload')}</p>
            </>
          ) : isFailed ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t('paymentFailed')}
              </h2>
              <p className="text-gray-600">{error || t('youWereNotCharged')}</p>
            </>
          ) : isTimeout ? (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t('takingLongerThanUsual')}
              </h2>
              <p className="text-gray-600">{t('didntReceivePrompt')}</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-[#171717] mb-2">
                {t('checkYourPhone')}
              </h2>
              <p className="text-gray-600">{t('confirmPaymentOn')}</p>
            </>
          )}
        </div>

        {/* Payment Details */}
        <div className="bg-gray-50 rounded-lg p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t('payWith')}</span>
            <span className="font-medium text-[#171717]">{getProviderName(paymentMethod.provider)}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">{t('phoneNumber')}</span>
            <span className="font-medium text-[#171717]">{flowData.phoneNumber}</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="text-gray-600">{t('amount')}</span>
            <span className="font-bold text-lg text-[#171717]">
              {formatAmount(flowData.paymentAmount || transfer.price || 0, transfer.currency)}
            </span>
          </div>
        </div>

        {/* Polling Status */}
        {isPolling && (
          <p className="text-sm text-gray-500 mb-6">{t('waitingForConfirmation')}</p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {(isFailed || isTimeout) && (
            <button
              onClick={handleRetry}
              className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
            >
              {t('resend')}
            </button>
          )}

          {!isSuccess && (
            <button
              onClick={handleChangeMethod}
              className="w-full px-6 py-3 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors"
            >
              {t('useDifferentMethod')}
            </button>
          )}

          {!isSuccess && (
            <button
              onClick={handleCancel}
              className="w-full px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              {t('cancel')}
            </button>
          )}
        </div>
      </div>

      {/* Right Column - Transfer Summary */}
      <div className="w-[340px] flex-shrink-0">
        <TransferSummaryCard
          title={transfer.title || 'Untitled'}
          fileCount={transfer.files?.length || 0}
          totalSize={calculateTotalSize()}
          price={transfer.price || 0}
          currency={transfer.currency || 'XOF'}
          message={transfer.message}
          createdAt={transfer.createdAt}
        />
      </div>
    </div>
  );
}
