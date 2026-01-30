/**
 * Payouts/Withdrawals API Service
 * Handles payout history API calls for user-facing features
 * Story 1-8: Payout Status Visibility
 * Story 14-9: Seller Payouts Panel UI
 *
 * Note: This is a compatibility layer that uses the /withdrawals endpoint
 * but maintains the legacy interface expected by PayoutsPanel.tsx
 */

import { apiClient, ApiResponse } from './api-client';

/**
 * Payout status enum (maps to backend WithdrawalStatus)
 */
export enum PayoutStatus {
  PENDING = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
  // Legacy alias for display compatibility
  SENT = 'processing',
}

/**
 * Payout method enum (matches backend PayoutMethod)
 */
export enum PayoutMethod {
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_account',
}

/**
 * Payout DTO - represents a withdrawal record
 * Maintains compatibility with PayoutsPanel.tsx
 */
export interface PayoutDto {
  id: string;
  reference?: string;
  status: PayoutStatus;
  previousStatus?: PayoutStatus;
  method?: PayoutMethod;
  amountMinorUnits: number;
  currency: string;
  platformFeeMinorUnits?: number;
  feePercentage?: number;
  feeMinorUnits?: number;
  netAmountMinorUnits?: number;
  accountDetailsMasked?: string;
  provider?: string;
  estimatedArrival?: string;
  completedAt?: string;
  approvedAt?: string;
  failureReason?: string;
  rejectionReason?: string;
  failureCode?: string;
  retryCount: number;
  lastRetryAt?: string;
  gatewayTransactionId?: string;
  createdAt: string;
  updatedAt?: string;
  payoutMethod?: {
    type: string;
    bankName?: string;
    accountNumber?: string;
    provider?: string;
    phoneNumber?: string;
  };
  // Legacy nested structure for PayoutsPanel compatibility
  senderId?: {
    id: string;
    email: string;
    name?: string;
  };
  paymentId?: {
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
 * Backend withdrawal response structure
 */
interface BackendWithdrawalResponse {
  withdrawals: PayoutDto[];
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
   * Uses /withdrawals endpoint but maps response to legacy format
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
    const url = `/withdrawals${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<BackendWithdrawalResponse>(url);

    // Map backend response to legacy format
    if (response.data) {
      return {
        ...response,
        data: {
          payouts: response.data.withdrawals,
          total: response.data.total,
          page: response.data.page,
          limit: response.data.limit,
          totalPages: response.data.totalPages,
        },
      };
    }

    return response as unknown as ApiResponse<SenderPayoutsResponse>;
  }

  /**
   * Get payout by ID
   */
  async getPayoutById(id: string): Promise<ApiResponse<PayoutDto>> {
    return apiClient.get<PayoutDto>(`/withdrawals/${id}`);
  }

  /**
   * Retry a failed payout
   */
  async retryPayout(payoutId: string): Promise<ApiResponse<PayoutDto>> {
    return apiClient.post<PayoutDto>(`/withdrawals/${payoutId}/retry`);
  }
}

export const payoutsApi = new PayoutsApi();
