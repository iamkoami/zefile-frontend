/**
 * Currency utilities for ZeFile frontend
 * Provides live exchange rate fetching and currency conversion
 */

/**
 * Supported currency codes
 */
export type CurrencyCode = "XOF" | "XAF" | "NGN" | "GHS" | "ZAR" | "KES" | "USD" | "EUR";

/**
 * Currency symbols for display
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  XOF: "XOF",
  XAF: "XAF",
  NGN: "₦",
  GHS: "₵",
  ZAR: "R",
  KES: "KSh",
  USD: "$",
  EUR: "€",
};

/**
 * Fallback exchange rates to USD (used when API is unavailable)
 * These are approximate rates and should match Paystack's typical rates
 */
const FALLBACK_RATES_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  EUR: 1.08,
  XOF: 0.0016,
  XAF: 0.0016,
  NGN: 0.00063,
  GHS: 0.064,
  ZAR: 0.053,
  KES: 0.0077,
};

/**
 * Exchange rates cache
 */
interface ExchangeRatesCache {
  rates: Record<string, number>;
  timestamp: number;
  source: 'api' | 'fallback';
}

let ratesCache: ExchangeRatesCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (matches backend)
let fetchPromise: Promise<ExchangeRatesCache> | null = null;

/**
 * Get the API base URL
 */
function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

/**
 * Fetch exchange rates from backend API
 */
async function fetchExchangeRates(): Promise<ExchangeRatesCache> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/exchange-rates`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }

    const data = await response.json();

    // Convert rates from API format (rates are already USD-based from backend)
    const rates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(data.rates)) {
      // Backend returns rates where 1 USD = X currency
      // We need the inverse: 1 currency = X USD
      rates[currency] = 1 / (rate as number);
    }
    // USD is always 1
    rates['USD'] = 1;

    return {
      rates,
      timestamp: Date.now(),
      source: 'api',
    };
  } catch (error) {
    console.warn('Failed to fetch exchange rates, using fallback:', error);
    return {
      rates: FALLBACK_RATES_TO_USD,
      timestamp: Date.now(),
      source: 'fallback',
    };
  }
}

/**
 * Get exchange rates (from cache or fetch from API)
 * Uses deduplication to prevent multiple concurrent fetches
 */
export async function getExchangeRates(): Promise<ExchangeRatesCache> {
  const now = Date.now();

  // Return cached rates if still valid
  if (ratesCache && (now - ratesCache.timestamp) < CACHE_TTL_MS) {
    return ratesCache;
  }

  // Deduplicate concurrent fetch requests
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = fetchExchangeRates().then((result) => {
    ratesCache = result;
    fetchPromise = null;
    return result;
  }).catch(() => {
    fetchPromise = null;
    // Return fallback on error
    const fallback: ExchangeRatesCache = {
      rates: FALLBACK_RATES_TO_USD,
      timestamp: now,
      source: 'fallback',
    };
    ratesCache = fallback;
    return fallback;
  });

  return fetchPromise;
}

/**
 * Get current rates synchronously (uses cache or fallback)
 * For async usage, prefer getExchangeRates()
 */
function getCurrentRates(): Record<string, number> {
  if (ratesCache && (Date.now() - ratesCache.timestamp) < CACHE_TTL_MS) {
    return ratesCache.rates;
  }
  // Trigger async fetch for next time, but return fallback now
  getExchangeRates().catch(() => {});
  return ratesCache?.rates || FALLBACK_RATES_TO_USD;
}

/**
 * Initialize exchange rates (call on app startup)
 * This pre-fetches rates so they're available for synchronous usage
 */
export async function initializeExchangeRates(): Promise<void> {
  await getExchangeRates();
}

/**
 * Check if using live rates or fallback
 */
export function isUsingLiveRates(): boolean {
  return ratesCache?.source === 'api';
}

/**
 * Convert amount from one currency to another
 * Uses live exchange rates when available, falls back to approximate rates
 * @param amount - The amount to convert
 * @param fromCurrency - The source currency code
 * @param toCurrency - The target currency code
 * @returns The converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode | string,
  toCurrency: CurrencyCode | string
): number {
  if (fromCurrency === toCurrency) return amount;

  // Get current rates (from cache or fallback)
  const rates = getCurrentRates();

  // First convert to USD, then to target currency
  const fromRate = rates[fromCurrency] || rates['USD'] || 1;
  const toRate = rates[toCurrency] || 1;

  // Convert: amount -> USD -> target
  const amountInUsd = amount * fromRate;
  const convertedAmount = amountInUsd / toRate;

  return convertedAmount;
}

/**
 * How many decimals a money amount shows — **zero, or exactly two. Never one.**
 *
 * ── WHY THIS REPLACED A PER-CURRENCY LIST (story 144.12) ───────────────────────────────
 *
 * This function used to branch on `["XOF", "XAF", "NGN", "KES"]` and `Math.round` those four,
 * under a comment calling them "currencies with small unit values". **All four are two-decimal on
 * the path this platform charges through** — that is the same ISO 4217 intuition Epic 144 has
 * already been reversed once for trusting. `formatCurrencyFromMinor(515199, 'XOF')` rendered
 * "5,152 XOF" against a charge of 5,151.99, and the same branch hid kobo and Kenyan cents.
 *
 * The list is gone rather than corrected. A per-currency list in a repo with no test layer drifts:
 * the two copies of this function in `zefile-admin` had already lost XAF. One uniform rule cannot.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────────────────
 *
 * No fractional part -> no decimals, because a CFA price list reading "5,000.00 F CFA" throughout
 * is worse than the defect. Any fractional part -> BOTH digits, because "5,151.9" is a money
 * figure that invites being read as a rounded one, and roughly one charge in ten ends in a zero
 * minor digit. Rounded to two decimals before the decision, so 5151.999 reads "5,152" rather than
 * being dressed up as "5,152.00".
 *
 * This mirrors `currencyFractionDigits` in the backend's `string-formatting.util.ts`, which is the
 * function that renders the same amounts into emails and invoices. Keep them in step.
 */
export function currencyFractionDigits(amount: number): 0 | 2 {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? 0 : 2;
}

/**
 * Format amount with currency symbol
 * @param amount - The amount to format
 * @param currency - The currency code
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrencyAmount(
  amount: number,
  currency: CurrencyCode | string,
  locale: string = 'en-US'
): string {
  const symbol = CURRENCY_SYMBOLS[currency as CurrencyCode] || currency;

  const digits = currencyFractionDigits(amount);
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  // Position symbol based on currency convention
  if (["XOF", "XAF"].includes(currency)) {
    // CFA francs: amount then code (9,300 XOF)
    return `${formattedAmount} ${symbol}`;
  } else if (["USD", "GHS"].includes(currency)) {
    return `${symbol}${formattedAmount}`;
  } else if (["EUR"].includes(currency)) {
    return `${formattedAmount}${symbol}`;
  } else {
    // For others (NGN, ZAR, KES), symbol before with space
    return `${symbol} ${formattedAmount}`;
  }
}

/**
 * Convert a MINOR-unit amount (what the backend stores and the gateway charges) to MAJOR units
 * (what a person reads).
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
 *
 * `formatCurrencyAmount` and `formatPrice` above both take MAJOR units and neither divides.
 * Backend money fields — `Transfer.price`, `pricingAmountMinorUnits`, `serviceChargeAmount`,
 * `budgetMinorUnits` — are all MINOR units. Handing one to the other renders it 100x too large,
 * which is the defect story 144.7 was raised for: a creator's earnings preview promised
 * "2,790 XOF" on a sale that pays her 27.90.
 *
 * Four separate hand-rolled `/ 100` conversions already exist in this repo
 * (`downloads/page.tsx`, `SaleCheckoutPanel.tsx`, `PaymentPanels.tsx`, `TransferPreviewPanel.tsx`).
 * This is the one they should all become. **Do not add a fifth.**
 *
 * ── WHY A BARE 100 IS CORRECT HERE, AND WHERE THAT STOPS BEING TRUE ────────────────────
 *
 * The authority on minor-unit exponents is the BACKEND file
 * `src/shared/constants/currency-units.constant.ts`. Every currency in `CurrencyCode` above —
 * XOF, XAF, NGN, GHS, ZAR, KES, USD, EUR — is two-decimal on the gateway path this platform
 * charges through, so one divisor covers all of them.
 *
 * XOF and XAF are two-decimal **against ISO 4217**, which assigns them an exponent of 0. Paystack
 * does not follow ISO: a test charge of `{ amount: 515199, currency: "XOF" }` renders on its own
 * checkout page as "Pay XOF 5,151.99". Verified 2026-08-03. Do not "correct" this to ISO — that
 * exact correction was made once, propagated across three repos, and fully reverted.
 *
 * **This deliberately does NOT mirror the backend's exponent list.** A second list in a second
 * repo with no test layer to guard it is story 144.8's open problem, and duplicating it here
 * would make that worse. The day this platform supports a currency that is genuinely
 * zero-decimal at the gateway (JPY, KRW, XPF…), this function needs the real exponent — and that
 * is the moment to solve 144.8 properly rather than to paste a list.
 */
export function minorToMajorUnits(minorUnits: number, _currency?: CurrencyCode | string): number {
  if (!Number.isFinite(minorUnits)) return 0;
  return minorUnits / 100;
}

/**
 * Format a MINOR-unit amount for display. The pairing of {@link minorToMajorUnits} with
 * {@link formatCurrencyAmount}, so callers never have to remember which of the two takes which
 * scale.
 */
export function formatCurrencyFromMinor(
  minorUnits: number,
  currency: CurrencyCode | string,
  locale: string = "en-US"
): string {
  return formatCurrencyAmount(minorToMajorUnits(minorUnits, currency), currency, locale);
}

/**
 * {@link formatPrice} for a MINOR-unit amount — converts to the display currency and returns
 * "Free" for zero.
 *
 * `formatPrice` takes MAJOR units and does not divide. Every site that handed it a
 * `*MinorUnits` field was rendering 100x the real figure; this is the pairing that stops that.
 */
export function formatPriceFromMinor(
  minorUnits: number,
  originalCurrency: CurrencyCode | string,
  displayCurrency: CurrencyCode | string
): string {
  return formatPrice(minorToMajorUnits(minorUnits, originalCurrency), originalCurrency, displayCurrency);
}

/**
 * Convert and format amount from original currency to display currency
 * @param amount - The original amount
 * @param originalCurrency - The original currency code
 * @param displayCurrency - The currency to display in
 * @param options - Optional settings
 * @param options.showFreeForZero - If true, returns "Free" for zero amounts (default: true)
 * @returns Formatted string in display currency
 */
export function formatInDisplayCurrency(
  amount: number,
  originalCurrency: CurrencyCode | string,
  displayCurrency: CurrencyCode | string,
  options?: { showFreeForZero?: boolean }
): string {
  const showFreeForZero = options?.showFreeForZero ?? true;

  if (amount === 0) {
    if (showFreeForZero) return "Free";
    // Return formatted zero in display currency
    return formatCurrencyAmount(0, displayCurrency);
  }

  const convertedAmount = convertCurrency(amount, originalCurrency, displayCurrency);
  return formatCurrencyAmount(convertedAmount, displayCurrency);
}

/**
 * Format price for display (with "Free" for zero amounts)
 * Uses the selected display currency with conversion
 */
export function formatPrice(
  price: number,
  originalCurrency: CurrencyCode | string,
  displayCurrency: CurrencyCode | string
): string {
  if (price === 0) return "Free";
  return formatInDisplayCurrency(price, originalCurrency, displayCurrency);
}

/**
 * Format price with original currency shown in parentheses
 * Example: "$45.00 (30,000 XOF)"
 */
export function formatPriceWithOriginal(
  price: number,
  originalCurrency: CurrencyCode | string,
  displayCurrency: CurrencyCode | string
): string {
  if (price === 0) return "Free";

  const displayAmount = formatInDisplayCurrency(price, originalCurrency, displayCurrency);

  // If same currency, don't show original
  if (originalCurrency === displayCurrency) {
    return displayAmount;
  }

  // Show original in parentheses
  const originalAmount = formatCurrencyAmount(price, originalCurrency);

  return `${displayAmount} (${originalAmount})`;
}
