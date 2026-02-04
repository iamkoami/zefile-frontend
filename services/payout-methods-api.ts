/**
 * Payout Methods API Service
 * Handles payout method CRUD operations (bank accounts, mobile money)
 * Stories 14-2, 14-3: Payout Methods Management
 */

import { apiClient, ApiResponse } from './api-client';

/**
 * Payout method type enum (matches backend PayoutMethodType)
 */
export enum PayoutMethodType {
  BANK_TRANSFER = 'bank_transfer',
  MOBILE_MONEY = 'mobile_money',
}

/**
 * Bank information from Paystack
 */
export interface Bank {
  id: number;
  name: string;
  code: string;
  country: string;
  currency: string;
  type: string;
}

/**
 * Account verification response
 */
export interface VerifyAccountResponse {
  accountNumber: string;
  accountName: string;
  bankId: number;
}

/**
 * Payout method DTO
 */
export interface PayoutMethod {
  id: string;
  type: PayoutMethodType;
  country: string;
  currency: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string; // Masked (****1234)
  accountName?: string;
  provider?: string;
  phoneNumber?: string; // Masked (****1234)
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

/**
 * Create payout method request
 */
export interface CreatePayoutMethodRequest {
  type: PayoutMethodType;
  country: string;
  currency: string;
  // Bank transfer fields
  bankCode?: string;
  accountNumber?: string;
  // Mobile money fields
  provider?: string;
  phoneNumber?: string;
  // Optional
  isDefault?: boolean;
}

/**
 * Verify account request
 */
export interface VerifyAccountRequest {
  accountNumber: string;
  bankCode: string;
}

/**
 * Supported countries with their currencies and mobile money providers
 * Only includes countries supported by Paystack for transfers/payouts
 */
export const SUPPORTED_COUNTRIES = [
  {
    code: 'NG',
    name: 'Nigeria',
    currency: 'NGN',
    supportsBankTransfer: true,
    supportsMobileMoney: false,
    mobileProviders: [],
  },
  {
    code: 'GH',
    name: 'Ghana',
    currency: 'GHS',
    supportsBankTransfer: true,
    supportsMobileMoney: true,
    mobileProviders: ['mtn', 'vodafone', 'tigo'],
  },
  {
    code: 'ZA',
    name: 'South Africa',
    currency: 'ZAR',
    supportsBankTransfer: true,
    supportsMobileMoney: false,
    mobileProviders: [],
  },
  {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    supportsBankTransfer: false,
    supportsMobileMoney: true,
    mobileProviders: ['mpesa'],
  },
  {
    code: 'CI',
    name: "Côte d'Ivoire",
    currency: 'XOF',
    supportsBankTransfer: false,
    supportsMobileMoney: true,
    mobileProviders: ['mtn', 'orange', 'wave'],
  },
];

/**
 * Mobile money provider display names
 */
export const MOBILE_PROVIDER_NAMES: Record<string, string> = {
  mtn: 'MTN Mobile Money',
  vodafone: 'Vodafone Cash',
  tigo: 'Tigo Cash',
  mpesa: 'M-Pesa',
  tigopesa: 'Tigo Pesa',
  airtel: 'Airtel Money',
  orange: 'Orange Money',
  moov: 'Moov Money',
  wave: 'Wave',
  free: 'Free Money',
};

class PayoutMethodsApi {
  /**
   * Create a new payout method
   */
  async createPayoutMethod(data: CreatePayoutMethodRequest): Promise<ApiResponse<PayoutMethod>> {
    return apiClient.post<PayoutMethod>('/payout-methods', data);
  }

  /**
   * Get all payout methods for the current user
   */
  async getPayoutMethods(): Promise<ApiResponse<PayoutMethod[]>> {
    return apiClient.get<PayoutMethod[]>('/payout-methods');
  }

  /**
   * Get a specific payout method
   */
  async getPayoutMethod(id: string): Promise<ApiResponse<PayoutMethod>> {
    return apiClient.get<PayoutMethod>(`/payout-methods/${id}`);
  }

  /**
   * Set a payout method as default
   */
  async setDefaultPayoutMethod(id: string): Promise<ApiResponse<PayoutMethod>> {
    return apiClient.post<PayoutMethod>(`/payout-methods/${id}/default`);
  }

  /**
   * Delete a payout method
   */
  async deletePayoutMethod(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/payout-methods/${id}`);
  }

  /**
   * Verify a bank account number
   */
  async verifyAccount(data: VerifyAccountRequest): Promise<ApiResponse<VerifyAccountResponse>> {
    return apiClient.post<VerifyAccountResponse>('/payout-methods/verify-account', data);
  }

  /**
   * Get list of supported banks for a country
   */
  async listBanks(country: string, currency?: string): Promise<ApiResponse<Bank[]>> {
    const params = new URLSearchParams();
    if (currency) params.append('currency', currency);
    const queryString = params.toString();
    const url = `/payout-methods/banks/${country}${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<Bank[]>(url);
  }

  /**
   * Get country info by code
   */
  getCountryInfo(countryCode: string) {
    return SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);
  }

  /**
   * Get mobile provider display name
   */
  getProviderName(provider: string): string {
    return MOBILE_PROVIDER_NAMES[provider.toLowerCase()] || provider;
  }
}

export const payoutMethodsApi = new PayoutMethodsApi();
