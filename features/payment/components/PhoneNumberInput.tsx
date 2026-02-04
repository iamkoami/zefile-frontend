'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { NavArrowDown, Phone, WarningCircle } from 'iconoir-react';
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
  AsYouType,
} from 'libphonenumber-js';

/**
 * Country configuration for phone number input
 */
interface CountryConfig {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

/**
 * Supported countries for Paystack payments
 * Includes all Paystack-covered countries (GH, KE, CI, NG)
 */
const SUPPORTED_COUNTRIES: CountryConfig[] = [
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
];

/**
 * PhoneNumberInput component props
 */
interface PhoneNumberInputProps {
  value: string;
  onChange: (phoneNumber: string, isValid: boolean, countryCode: CountryCode) => void;
  defaultCountry?: CountryCode;
  /** Controlled country code - when set, syncs phone input country with parent */
  countryCode?: CountryCode;
  /** Hide the country selector dropdown (when country is controlled externally) */
  hideCountrySelector?: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * PhoneNumberInput - Phone number input with country selector and validation
 *
 * Features:
 * - Country prefix dropdown for Ghana, Kenya, Côte d'Ivoire
 * - Real-time phone number validation using libphonenumber-js
 * - Auto-format phone number as user types
 * - Visual validation feedback
 */
export function PhoneNumberInput({
  value,
  onChange,
  defaultCountry = 'GH',
  countryCode,
  hideCountrySelector = false,
  error,
  disabled = false,
}: PhoneNumberInputProps) {
  const t = useTranslations('payment');
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(
    SUPPORTED_COUNTRIES.find((c) => c.code === defaultCountry) || SUPPORTED_COUNTRIES[0]
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync with controlled countryCode prop from parent
  useEffect(() => {
    if (countryCode) {
      const country = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);
      if (country && country.code !== selectedCountry.code) {
        setSelectedCountry(country);
      }
    }
  }, [countryCode, selectedCountry.code]);

  // Get detected country from localStorage and set as default (only when not controlled)
  useEffect(() => {
    // Skip if countryCode is controlled by parent
    if (countryCode) return;

    const cachedCountry = localStorage.getItem('zefile_detected_country');
    if (cachedCountry) {
      const country = SUPPORTED_COUNTRIES.find((c) => c.code === cachedCountry);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, [countryCode]);

  /**
   * Format phone number as user types
   */
  const formatPhoneNumber = useCallback(
    (input: string, countryCode: CountryCode): string => {
      // Remove all non-digit characters except +
      const cleaned = input.replace(/[^\d+]/g, '');

      // If the number starts with the country dial code, don't add it again
      const dialCode = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode)?.dialCode || '';
      if (cleaned.startsWith(dialCode)) {
        // Format the full number
        const formatter = new AsYouType(countryCode);
        return formatter.input(cleaned);
      }

      // Otherwise, just format the local number
      if (cleaned.length > 0) {
        const formatter = new AsYouType(countryCode);
        return formatter.input(cleaned);
      }

      return cleaned;
    },
    []
  );

  /**
   * Validate phone number
   */
  const validatePhoneNumber = useCallback(
    (phoneNumber: string, countryCode: CountryCode): { isValid: boolean; fullNumber: string } => {
      if (!phoneNumber || phoneNumber.length < 5) {
        return { isValid: false, fullNumber: '' };
      }

      try {
        // Add country dial code if not present
        const dialCode = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode)?.dialCode || '';
        let fullNumber = phoneNumber;

        if (!phoneNumber.startsWith('+')) {
          // If starts with 0, remove it
          if (phoneNumber.startsWith('0')) {
            fullNumber = dialCode + phoneNumber.slice(1);
          } else {
            fullNumber = dialCode + phoneNumber;
          }
        }

        const isValid = isValidPhoneNumber(fullNumber, countryCode);

        if (isValid) {
          const parsed = parsePhoneNumber(fullNumber, countryCode);
          return { isValid: true, fullNumber: parsed.format('E.164') };
        }

        return { isValid: false, fullNumber };
      } catch {
        return { isValid: false, fullNumber: '' };
      }
    },
    []
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatPhoneNumber(rawValue, selectedCountry.code);
      setLocalValue(formatted);

      // Validate and notify parent
      const { isValid, fullNumber } = validatePhoneNumber(rawValue, selectedCountry.code);

      if (rawValue.length > 0 && !isValid) {
        setValidationError(t('invalidPhoneNumber'));
      } else {
        setValidationError(null);
      }

      onChange(fullNumber || rawValue, isValid, selectedCountry.code);
    },
    [formatPhoneNumber, validatePhoneNumber, selectedCountry.code, onChange, t]
  );

  /**
   * Handle country change
   */
  const handleCountryChange = useCallback(
    (country: CountryConfig) => {
      setSelectedCountry(country);
      setIsDropdownOpen(false);

      // Re-validate with new country
      const { isValid, fullNumber } = validatePhoneNumber(localValue, country.code);
      if (localValue.length > 0 && !isValid) {
        setValidationError(t('invalidPhoneNumber'));
      } else {
        setValidationError(null);
      }
      onChange(fullNumber || localValue, isValid, country.code);
    },
    [localValue, validatePhoneNumber, onChange, t]
  );

  // Display error from props or local validation
  const displayError = error || validationError;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {t('phoneNumber')}
      </label>

      <div className="relative flex">
        {/* Country Selector - disabled when hideCountrySelector is true */}
        <div className="relative">
          {hideCountrySelector ? (
            // Static display when country is controlled externally
            <div className="flex items-center gap-2 px-3 py-3 border border-r-0 border-gray-300 rounded-l bg-gray-100 min-w-[110px]">
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-3 border border-r-0 border-gray-300 rounded-l bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed min-w-[110px]"
            >
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
              <NavArrowDown className="w-4 h-4 text-gray-500" />
            </button>
          )}

          {/* Dropdown - only show when not hidden and open */}
          {!hideCountrySelector && isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-50">
              {SUPPORTED_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountryChange(country)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-left ${
                    country.code === selectedCountry.code ? 'bg-gray-50' : ''
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <span className="flex-1 text-sm text-gray-700">{country.name}</span>
                  <span className="text-sm text-gray-500">{country.dialCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <div className="relative flex-1">
          <input
            type="tel"
            value={localValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder={t('enterPhoneNumber')}
            className={`w-full px-4 py-3 border rounded-r text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] disabled:opacity-50 disabled:cursor-not-allowed ${
              displayError
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300'
            }`}
          />
          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Error Message */}
      {displayError && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
          <WarningCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Helper Text */}
      {!displayError && (
        <p className="mt-2 text-sm text-gray-500">
          {t('phoneNumberHelper')}
        </p>
      )}
    </div>
  );
}

export default PhoneNumberInput;
