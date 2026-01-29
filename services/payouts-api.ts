/**
 * Payouts API Service
 * Handles all payout-related API calls
 * Story 1-8: Payout Status Visibility
 */

import { apiClient, ApiResponse } from './api-client';

/**
 * Payout status enum (matches backend PayoutStatus)
 */
export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Payout method enum (matches backend PayoutMethod)
 */
export enum PayoutMethod {
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

/**
 * Payout DTO - represents a payout record
 */
export interface PayoutDto {
  id: string;
  reference: string;
  status: PayoutStatus;
  previousStatus?: PayoutStatus;
  method: PayoutMethod;
  amountMinorUnits: number;
  currency: string;
  platformFeeMinorUnits: number;
  feePercentage: number;
  accountDetailsMasked?: string;
  provider?: string;
  estimatedArrival?: string;
  completedAt?: string;
  failureReason?: string;
  failureCode?: string;
  retryCount: number;
  lastRetryAt?: string;
  gatewayTransactionId?: string;
  createdAt: string;
  updatedAt?: string;
  senderId: {
    id: string;
    email: string;
    name?: string;
  };
  paymentId: {
    id: string;
    reference?: string;
    transferId?: {
      id: string;
      title?: string;
      shortCode?: string;
    };
  };
}

/**
 * Sender payouts response with pagination
 */
export interface SenderPayoutsResponse {
  payouts: PayoutDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Update payout method request
 */
export interface UpdatePayoutMethodRequest {
  method: PayoutMethod;
  accountDetails: string;
  provider?: string;
}

class PayoutsApi {
  /**
   * Get sender's payouts with pagination and filtering
   */
  async getSenderPayouts(params?: {
    status?: PayoutStatus;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<SenderPayoutsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/v2/payouts${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<SenderPayoutsResponse>(url);
  }

  /**
   * Get payout by ID
   */
  async getPayoutById(id: string): Promise<ApiResponse<PayoutDto>> {
    return apiClient.get<PayoutDto>(`/v2/payouts/${id}`);
  }

  /**
   * Get payout for a specific payment
   */
  async getPayoutByPayment(paymentId: string): Promise<ApiResponse<PayoutDto>> {
    return apiClient.get<PayoutDto>(`/v2/payouts/payment/${paymentId}`);
  }

  /**
   * Retry a failed payout
   */
  async retryPayout(payoutId: string): Promise<ApiResponse<PayoutDto>> {
    return apiClient.post<PayoutDto>(`/v2/payouts/${payoutId}/retry`);
  }

  /**
   * Update payout method (for failed payouts)
   */
  async updatePayoutMethod(
    payoutId: string,
    data: UpdatePayoutMethodRequest
  ): Promise<ApiResponse<PayoutDto>> {
    return apiClient.post<PayoutDto>(`/v2/payouts/${payoutId}/update-method`, data);
  }
}

export const payoutsApi = new PayoutsApi();
