'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Xmark, CreditCard, SmartphoneDevice } from 'iconoir-react';
import LoadingPanel from '@/components/LoadingPanel';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

/**
 * Mobile Money Provider types
 */
export type MobileMoneyProvider =
  | 'mtn_momo'
  | 'vodafone_cash'
  | 'airtel_tigo'
  | 'mpesa'
  | 'airtel_money'
  | 'orange_money'
  | 'wave';

/**
 * Payment method selection
 */
export type PaymentMethod =
  | { type: 'mobile_money'; provider: MobileMoneyProvider }
  | { type: 'card' };

/**
 * Mobile money provider info from API
 */
interface MobileMoneyProviderInfo {
  provider: MobileMoneyProvider;
  name: string;
  icon: string;
}

/**
 * PaymentMethodSelector component props
 */
interface PaymentMethodSelectorProps {
  isOpen: boolean;
  amount: number;
  currency: string; // Used in Stories 1.2/1.3 for payment initialization
  currencySymbol: string;
  transferTitle: string;
  transferId: string; // Used in Stories 1.2/1.3 for payment initialization
  onMethodSelect: (method: PaymentMethod) => void;
  onCancel: () => void;
  isLoading?: boolean;
  /** When true, shows auto-renewal badges on payment methods (for subscription flows) */
  showAutoRenewalInfo?: boolean;
}

/**
 * PaymentMethodSelector - Modal for selecting payment method
 *
 * Displays Mobile Money options first (country-specific), then card option.
 * Following ZeFile design system with 4px border radius, correct colors.
 */
export function PaymentMethodSelector({
  isOpen,
  amount,
  currency,
  currencySymbol,
  transferTitle,
  transferId,
  onMethodSelect,
  onCancel,
  isLoading = false,
  showAutoRenewalInfo = false,
}: PaymentMethodSelectorProps) {
  const t = useTranslations('payment');
  const [mounted, setMounted] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [mobileMoneyProviders, setMobileMoneyProviders] = useState<MobileMoneyProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [countryCode, setCountryCode] = useState<string>('UNKNOWN');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());
  const [showMoreMethods, setShowMoreMethods] = useState(false);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const radioGroupRef = useRef<HTMLDivElement>(null);

  // Portal setup
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch payment methods on open
  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // fetchPaymentMethods is stable, no need to include

  // Total options count (mobile money + card)
  const totalOptions = mobileMoneyProviders.length + 1;

  // ESC key and Arrow navigation handling
  useEffect(() => {
    if (isOpen && !isLoading && !loadingProviders) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onCancel();
          return;
        }

        // Arrow key navigation within radio group
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < totalOptions - 1 ? prev + 1 : 0;
            focusOption(next);
            return next;
          });
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : totalOptions - 1;
            focusOption(next);
            return next;
          });
        }

        // Select on Enter or Space when focused on a radio option
        if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
          e.preventDefault();
          selectOptionAtIndex(focusedIndex);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isLoading, loadingProviders, onCancel, focusedIndex, totalOptions]);

  // Focus on the option button at given index
  const focusOption = (index: number) => {
    if (!radioGroupRef.current) return;
    const buttons = radioGroupRef.current.querySelectorAll('button[role="radio"]');
    if (buttons[index]) {
      (buttons[index] as HTMLButtonElement).focus();
    }
  };

  // Select option at index
  const selectOptionAtIndex = (index: number) => {
    if (index < mobileMoneyProviders.length) {
      // Mobile money option
      handleSelectMethod({
        type: 'mobile_money',
        provider: mobileMoneyProviders[index].provider,
      });
    } else {
      // Card option
      handleSelectMethod({ type: 'card' });
    }
  };

  // Body scroll prevention
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Fetch payment methods from API
   */
  const fetchPaymentMethods = async () => {
    setLoadingProviders(true);
    try {
      // Try to get country from localStorage cache first
      const cachedCountry = localStorage.getItem('zefile_detected_country');
      let url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods`;

      if (cachedCountry) {
        url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${cachedCountry}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.countryCode && data.countryCode !== 'UNKNOWN') {
        localStorage.setItem('zefile_detected_country', data.countryCode);
        setCountryCode(data.countryCode);
      }

      setMobileMoneyProviders(data.mobileMoney || []);
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      // Fallback: show all providers (must match backend getAllMobileMoneyProviders)
      setMobileMoneyProviders([
        { provider: 'mtn_momo', name: 'MTN Mobile Money', icon: 'mtn' },
        { provider: 'vodafone_cash', name: 'Vodafone Cash', icon: 'vodafone' },
        { provider: 'airtel_tigo', name: 'AirtelTigo Money', icon: 'airtel' },
        { provider: 'mpesa', name: 'M-Pesa', icon: 'mpesa' },
        { provider: 'airtel_money', name: 'Airtel Money', icon: 'airtel' },
        { provider: 'orange_money', name: 'Orange Money', icon: 'orange' },
        { provider: 'wave', name: 'Wave', icon: 'wave' },
      ]);
    } finally {
      setLoadingProviders(false);
    }
  };

  /**
   * Handle method selection
   */
  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
  };

  /**
   * Handle continue button click
   */
  const handleContinue = () => {
    if (selectedMethod) {
      onMethodSelect(selectedMethod);
    }
  };

  /**
   * Format amount for display
   */
  const formatAmount = (amountValue: number, symbol: string): string => {
    // Amount is in minor units, convert to major units
    const majorUnits = amountValue / 100;
    return `${symbol}${majorUnits.toLocaleString()}`;
  };

  /**
   * Check if a method is selected
   */
  const isMethodSelected = (method: PaymentMethod): boolean => {
    if (!selectedMethod) return false;

    if (method.type === 'card' && selectedMethod.type === 'card') {
      return true;
    }

    if (
      method.type === 'mobile_money' &&
      selectedMethod.type === 'mobile_money' &&
      method.provider === selectedMethod.provider
    ) {
      return true;
    }

    return false;
  };

  /**
   * Get icon path for provider
   */
  const getProviderIconPath = (icon: string): string => {
    return `/icons/payment/${icon}.svg`;
  };

  // Country-to-primary-provider mapping for simplified view
  const PRIMARY_PROVIDER_MAP: Record<string, MobileMoneyProvider> = {
    GH: 'mtn_momo',
    CI: 'wave',
    KE: 'mpesa',
    SN: 'wave',
    BF: 'orange_money',
    ML: 'orange_money',
    CM: 'mtn_momo',
    BJ: 'mtn_momo',
    TG: 'mtn_momo',
  };

  const primaryProviderKey = PRIMARY_PROVIDER_MAP[countryCode];
  const primaryProviders = primaryProviderKey
    ? mobileMoneyProviders.filter((p) => p.provider === primaryProviderKey)
    : mobileMoneyProviders.slice(0, 1); // Fallback: show first provider
  const secondaryProviders = mobileMoneyProviders.filter(
    (p) => !primaryProviders.some((pp) => pp.provider === p.provider)
  );
  const hasMoreMethods = secondaryProviders.length > 0;

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[10000]"
        onClick={() => !isLoading && onCancel()}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
        <div
          className="bg-white rounded shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h2
                id="payment-modal-title"
                className="text-lg font-semibold text-[#171717]"
              >
                {t('payFor')} &quot;{transferTitle}&quot;
              </h2>
              <p className="text-2xl font-bold text-[#171717] mt-1">
                {formatAmount(amount, currencySymbol)}
              </p>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              aria-label={t('cancel')}
            >
              <Xmark className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-sm font-medium text-gray-700 mb-4">
              {t('choosePaymentMethod')}
            </p>

            {loadingProviders ? (
              <div className="flex items-center justify-center py-8">
                <LoadingPanel />
              </div>
            ) : (
              <div
                ref={radioGroupRef}
                className="space-y-3"
                role="radiogroup"
                aria-label={t('paymentMethods')}
              >
                {/* Primary Mobile Money Provider(s) */}
                {primaryProviders.map((provider) => {
                  const method: PaymentMethod = {
                    type: 'mobile_money',
                    provider: provider.provider,
                  };
                  const isSelected = isMethodSelected(method);

                  return (
                    <button
                      key={provider.provider}
                      onClick={() => handleSelectMethod(method)}
                      onFocus={() => setFocusedIndex(mobileMoneyProviders.indexOf(provider))}
                      className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#171717] focus:ring-offset-2 ${
                        isSelected
                          ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={provider.name}
                      tabIndex={0}
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                        {failedIcons.has(provider.icon) ? (
                          <SmartphoneDevice className="w-6 h-6 text-gray-500" />
                        ) : (
                          <Image
                            src={getProviderIconPath(provider.icon)}
                            alt={provider.name}
                            width={24}
                            height={24}
                            onError={() => {
                              setFailedIcons((prev) => new Set(prev).add(provider.icon));
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="font-medium text-[#171717]">
                          {provider.name}
                        </span>
                        {showAutoRenewalInfo && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            {t('manualRenewal')}
                          </span>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-[#5E53E0]' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* Card Option */}
                <button
                  onClick={() => handleSelectMethod({ type: 'card' })}
                  onFocus={() => setFocusedIndex(mobileMoneyProviders.length)}
                  className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#171717] focus:ring-offset-2 ${
                    selectedMethod?.type === 'card'
                      ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  role="radio"
                  aria-checked={selectedMethod?.type === 'card'}
                  aria-label={t('payWithCard')}
                  tabIndex={0}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                    <CreditCard className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-[#171717]">
                      {t('payWithCard')}
                    </span>
                    {showAutoRenewalInfo && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        {t('autoRenews')}
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod?.type === 'card' ? 'border-[#5E53E0]' : 'border-gray-300'
                    }`}
                  >
                    {selectedMethod?.type === 'card' && (
                      <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                    )}
                  </div>
                </button>

                {/* More Payment Options (collapsed) */}
                {hasMoreMethods && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowMoreMethods(!showMoreMethods)}
                      className="w-full text-sm text-[#171717] underline font-medium text-center py-2"
                    >
                      {showMoreMethods ? t('lessPaymentOptions') : t('morePaymentOptions')}
                    </button>

                    {showMoreMethods && secondaryProviders.map((provider) => {
                      const method: PaymentMethod = {
                        type: 'mobile_money',
                        provider: provider.provider,
                      };
                      const isSelected = isMethodSelected(method);

                      return (
                        <button
                          key={provider.provider}
                          onClick={() => handleSelectMethod(method)}
                          onFocus={() => setFocusedIndex(mobileMoneyProviders.indexOf(provider))}
                          className={`w-full flex items-center gap-4 p-4 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#171717] focus:ring-offset-2 ${
                            isSelected
                              ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={provider.name}
                          tabIndex={0}
                        >
                          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                            {failedIcons.has(provider.icon) ? (
                              <SmartphoneDevice className="w-6 h-6 text-gray-500" />
                            ) : (
                              <Image
                                src={getProviderIconPath(provider.icon)}
                                alt={provider.name}
                                width={24}
                                height={24}
                                onError={() => {
                                  setFailedIcons((prev) => new Set(prev).add(provider.icon));
                                }}
                              />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <span className="font-medium text-[#171717]">
                              {provider.name}
                            </span>
                            {showAutoRenewalInfo && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                {t('manualRenewal')}
                              </span>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#5E53E0]' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <div className="w-3 h-3 rounded-full bg-[#5E53E0]" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Auto-Renewal Info Box (shown when subscription context) */}
            {showAutoRenewalInfo && selectedMethod && (
              <div className={`mt-4 p-4 rounded text-sm ${
                selectedMethod.type === 'card'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {selectedMethod.type === 'card' ? (
                  <p className="text-green-800">
                    {t('autoRenewalCardInfo')}
                  </p>
                ) : (
                  <p className="text-yellow-800">
                    {t('manualRenewalMobileInfo')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <button
              ref={continueButtonRef}
              onClick={handleContinue}
              disabled={!selectedMethod || isLoading}
              className="w-full px-5 py-3 text-sm font-medium text-[#171717] bg-[#87E64B] rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? t('processing') : t('continue')}
            </button>

            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full mt-3 px-5 py-2 text-sm font-medium text-[#171717] underline disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default PaymentMethodSelector;
