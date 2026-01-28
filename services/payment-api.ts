import axios from 'axios';
import { apiClient, ApiResponse } from './api-client';
import { TransferDto } from './transfer-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Transaction types
export interface Transaction {
  id: string;
  user: {
    id: string;
    email: string;
  };
  transferId: TransferDto | null;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  transactionStatus: 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentReference?: string;
  transactionDate: string;
  updatedAt?: string;
}

export interface InitializePaymentRequest {
  transferId: string;
  userId: string;
  amount: number; // Amount in kobo (XOF minor units)
  email: string;
  currency: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface InitializePaymentResponse {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  };
}

export interface VerifyPaymentRequest {
  reference: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  data: {
    transactionId: string;
    reference: string;
    status: 'success' | 'failed' | 'pending';
    amount: number;
    currency: string;
    paidAt: string;
    channel: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data: {
    transactionId: string;
    reference: string;
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface PublicKeyResponse {
  success: boolean;
  data: {
    publicKey: string;
  };
}

// ============================================
// V2 Payment API Types (Multi-Currency + Mobile Money)
// ============================================

/**
 * Payment method types
 */
export type PaymentMethodType = 'card' | 'mobile_money';

/**
 * Mobile Money provider codes
 */
export type MobileMoneyProviderCode =
  | 'mtn_momo'
  | 'vodafone_cash'
  | 'airtel_tigo'
  | 'mpesa'
  | 'airtel_money'
  | 'orange_money'
  | 'wave';

/**
 * V2 Initialize Payment Request
 * Supports both card and mobile money payments
 */
export interface InitializePaymentV2Request {
  transferId: string;
  customerEmail: string;
  requestedCurrency?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  /** Payment method type (defaults to 'card') */
  paymentMethod?: PaymentMethodType;
  /** Mobile Money provider (required for mobile_money) */
  mobileMoneyProvider?: MobileMoneyProviderCode;
  /** Phone number in E.164 format (required for mobile_money) */
  phoneNumber?: string;
}

/**
 * V2 Initialize Payment Response
 */
export interface InitializePaymentV2Response {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  status: PaymentStatusType;
  pricingCurrency: string;
  pricingAmountMinorUnits: number;
  displayAmount: string;
  currencySymbol: string;
  transferId: string;
  /** Payment method type */
  paymentMethod?: PaymentMethodType;
  /** Whether this is a mobile money payment (STK push) */
  isMobileMoney?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Payment status types
 */
export type PaymentStatusType =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

/**
 * V2 Payment Status Response
 */
export interface PaymentStatusV2Response {
  reference: string;
  status: PaymentStatusType;
  previousStatus?: PaymentStatusType;
  gateway: string;
  pricingCurrency: string;
  pricingAmountMinorUnits: number;
  displayAmount: string;
  settlementCurrency?: string;
  settlementAmountMinorUnits?: number;
  gatewayFeeMinorUnits?: number;
  paymentMethod?: string;
  paymentChannel?: string;
  initiatedAt: string;
  completedAt?: string;
  failureReason?: string;
  transferId: string;
  canRetry: boolean;
  isTerminal: boolean;
}

/**
 * Mobile Money Provider DTO
 */
export interface MobileMoneyProviderDto {
  provider: string;
  name: string;
  icon: string;
}

/**
 * Payment Methods Response
 */
export interface PaymentMethodsResponse {
  countryCode: string;
  mobileMoney: MobileMoneyProviderDto[];
  card: {
    enabled: boolean;
    providers: string[];
  };
}

export const paymentApi = {
  /**
   * Initialize a payment transaction
   */
  async initializePayment(data: InitializePaymentRequest): Promise<InitializePaymentResponse> {
    const response = await axios.post(`${API_URL}/payments/initialize`, data);
    return response.data;
  },

  /**
   * Verify a payment transaction
   */
  async verifyPayment(data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const response = await axios.post(`${API_URL}/payments/verify`, data);
    return response.data;
  },

  /**
   * Get payment status by reference
   */
  async getPaymentStatus(reference: string): Promise<PaymentStatusResponse> {
    const response = await axios.get(`${API_URL}/payments/status/${reference}`);
    return response.data;
  },

  /**
   * Get Paystack public key
   */
  async getPublicKey(): Promise<PublicKeyResponse> {
    const response = await axios.get(`${API_URL}/payments/public-key`);
    return response.data;
  },

  /**
   * Get all transactions for a user
   */
  async getTransactionsByUserId(userId: string): Promise<ApiResponse<Transaction[]>> {
    return apiClient.get<Transaction[]>(`/transactions/user/${userId}`);
  },

  /**
   * Get transactions by user ID and status (e.g., SUCCESS for paid transfers)
   */
  async getTransactionsByUserIdAndStatus(
    userId: string,
    status: string
  ): Promise<ApiResponse<Transaction[]>> {
    return apiClient.get<Transaction[]>(`/transactions/user/${userId}/status/${status}`);
  },

  // ============================================
  // V2 Payment API Methods (Multi-Currency + Mobile Money)
  // ============================================

  /**
   * Initialize a payment (V2 - supports mobile money)
   *
   * For card payments: Returns authorizationUrl for redirect
   * For mobile money: Sends STK push to phone, use getPaymentStatusV2 to poll
   */
  async initializePaymentV2(
    data: InitializePaymentV2Request
  ): Promise<ApiResponse<InitializePaymentV2Response>> {
    return apiClient.post<InitializePaymentV2Response>('/v2/payments/initialize', data);
  },

  /**
   * Get payment status (V2)
   *
   * Use this to poll for mobile money payment status
   */
  async getPaymentStatusV2(reference: string): Promise<ApiResponse<PaymentStatusV2Response>> {
    return apiClient.get<PaymentStatusV2Response>(`/v2/payments/${reference}/status`);
  },

  /**
   * Get available payment methods for a country
   */
  async getPaymentMethods(countryCode?: string): Promise<ApiResponse<PaymentMethodsResponse>> {
    const url = countryCode
      ? `/v2/payments/methods/${countryCode.toUpperCase()}`
      : '/v2/payments/methods';
    return apiClient.get<PaymentMethodsResponse>(url);
  },

  /**
   * Verify payment (V2 - callback handling)
   */
  async verifyPaymentV2(reference: string): Promise<ApiResponse<PaymentStatusV2Response>> {
    return apiClient.post<PaymentStatusV2Response>('/v2/payments/verify', { reference });
  },
};
