/**
 * Currency Store - Zustand global state for currency selection
 * Manages the user's preferred currency across the entire frontend
 * Persists to localStorage and syncs across tabs
 */

import { create } from 'zustand';
import {
  SUPPORTED_COUNTRIES,
  REGIONAL_PRICING,
  getStoredCountryCode,
  setStoredCountryCode,
  hasStoredCountryCode,
  type SupportedCountry,
  type RegionalPricing,
} from '@/services/subscription-api';
import { initializeExchangeRates } from '@/lib/currency';

// Country display names and ISO codes for flags (rendered via react-flagpack)
// `flagCode` is an ISO 3166-1 alpha-2 code used by <Flag code={...} />
// DEFAULT has no flag code — components render a globe emoji fallback
export const COUNTRY_CONFIG: Record<string, { name: string; nameFr: string; flagCode: string | null }> = {
  NG: { name: 'Nigeria (NGN)', nameFr: 'Nigeria (NGN)', flagCode: 'NG' },
  GH: { name: 'Ghana (GHS)', nameFr: 'Ghana (GHS)', flagCode: 'GH' },
  KE: { name: 'Kenya (KES)', nameFr: 'Kenya (KES)', flagCode: 'KE' },
  CI: { name: "Côte d'Ivoire (XOF)", nameFr: "Côte d'Ivoire (XOF)", flagCode: 'CI' },
  TG: { name: 'Togo (XOF)', nameFr: 'Togo (XOF)', flagCode: 'TG' },
  BJ: { name: 'Benin (XOF)', nameFr: 'Benin (XOF)', flagCode: 'BJ' },
  DEFAULT: { name: 'International (USD)', nameFr: 'International (USD)', flagCode: null },
};

// All available country codes (including DEFAULT)
export const ALL_COUNTRY_CODES = [...SUPPORTED_COUNTRIES, 'DEFAULT'] as const;

/**
 * Country detected at the Cloudflare edge and written by middleware.ts.
 * Absent in local dev and anywhere not behind Cloudflare — treat that as
 * "no signal", not as International.
 */
const GEO_COUNTRY_COOKIE = 'zefile_geo_country';

function readGeoCountryCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${GEO_COUNTRY_COOKIE}=([^;]*)`),
  );
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  return ALL_COUNTRY_CODES.includes(value as SupportedCountry) ? value : null;
}

interface CurrencyState {
  // Current selected country code
  countryCode: SupportedCountry;

  // Derived pricing for the selected country
  pricing: RegionalPricing;

  // Whether the store has been hydrated from localStorage
  isHydrated: boolean;

  // Actions
  setCountryCode: (code: string) => void;
  hydrate: () => void;
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  countryCode: 'DEFAULT',
  pricing: REGIONAL_PRICING.DEFAULT,
  isHydrated: false,

  setCountryCode: (code: string) => {
    const validCode = (ALL_COUNTRY_CODES.includes(code as SupportedCountry)
      ? code
      : 'DEFAULT') as SupportedCountry;

    const pricing = REGIONAL_PRICING[validCode] || REGIONAL_PRICING.DEFAULT;

    // Persist to localStorage
    setStoredCountryCode(validCode);

    set({ countryCode: validCode, pricing });

    // Dispatch event for other components that might need to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('currency-changed', {
        detail: { countryCode: validCode, currency: pricing.currency }
      }));
    }
  },

  hydrate: () => {
    if (get().isHydrated) return;

    /*
     * Resolution order, highest first:
     *   1. localStorage — the visitor picked a country in the CurrencySwitcher.
     *      Checked with hasStoredCountryCode(), not the value, so an explicit
     *      "International" is respected instead of being re-detected every load.
     *   2. Geo cookie from CF-IPCountry, set by middleware.ts.
     *   3. DEFAULT (International / USD).
     *
     * Geo is deliberately NOT written back to localStorage: that would freeze a
     * guess into a stated preference and stop it re-detecting after travel.
     */
    const resolvedCode = hasStoredCountryCode()
      ? getStoredCountryCode()
      : (readGeoCountryCookie() ?? 'DEFAULT');

    const validCode = (
      ALL_COUNTRY_CODES.includes(resolvedCode as SupportedCountry) ? resolvedCode : 'DEFAULT'
    ) as SupportedCountry;
    const pricing = REGIONAL_PRICING[validCode] || REGIONAL_PRICING.DEFAULT;

    set({
      countryCode: validCode,
      pricing,
      isHydrated: true
    });

    // Pre-fetch exchange rates for currency conversion
    initializeExchangeRates().catch(() => {
      // Silently fail - will use fallback rates
    });
  },
}));

// Helper hook to get current currency info
export function useCurrentCurrency() {
  const { countryCode, pricing, isHydrated } = useCurrencyStore();
  return {
    countryCode,
    currency: pricing.currency,
    currencySymbol: pricing.currencySymbol,
    currencyName: pricing.currencyName,
    pricing,
    isHydrated,
  };
}
