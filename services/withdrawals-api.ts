/**
 * Withdrawals API Service
 * Handles withdrawal requests and balance management
 * Stories 14-6, 14-7: Withdrawal Request Flow
 */

import { apiClient, ApiResponse } from './api-client';

/**
 * Withdrawal status enum (matches backend WithdrawalStatus)
 */
export enum WithdrawalStatus {
  PENDING = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * Balance response
 */
export interface BalanceResponse {
  availableMinorUnits: number;
  pendingMinorUnits: number;
  /** Earnings still inside the buyer refund window, held out of the withdrawable balance (Story 133-2) */
  reservedMinorUnits: number;
  /**
   * Lifetime net earnings gross of withdrawals (settled + reserved). Use this rather
   * than summing available + pending + reserved, which under-reports by every
   * completed payout. Optional until every deployed API version returns it.
   */
  totalEarnedMinorUnits?: number;
  /** Days buyer-funded earnings stay on hold before becoming withdrawable */
  payoutHoldDays?: number;
  currency: string;
  availableFormatted: string;
  pendingFormatted: string;
  reservedFormatted: string;
  totalEarnedFormatted?: string;

  // --- Payout gate status (Story 137.3) ---
  // Advisory only. The backend refuses payouts server-side at every entry point regardless of
  // what the UI does with these; they exist so a creator learns about a block on the screen
  // showing their money rather than from a 403 after filling in an amount.
  // All optional: the frontend and backend deploy independently.

  /** True when a payout request would currently be refused pending identity verification. */
  payoutsBlocked?: boolean;
  /** The creator's identity verification status as the payout gate resolved it. */
  kycStatus?: "not_required" | "required" | "pending" | "verified" | "rejected";
  /** Machine-readable block reason. Branch on this, never on a message string. */
  payoutBlockCode?: "PAYOUT_KYC_REQUIRED" | "PAYOUT_KYC_PENDING" | "PAYOUT_KYC_REJECTED";
  /** Verification deadline, when one is recorded. Present before and after it expires. */
  gracePeriodEnds?: string;
}

/**
 * Fee calculation response
 */
export interface FeeCalculationResponse {
  amount: number;
  fee: number;
  netAmount: number;
  feePercent: number;
  feeFlat: number;
  feeCap: number;
}

/**
 * Payout method info in withdrawal
 */
export interface WithdrawalPayoutMethod {
  type: string;
  bankName?: string;
  accountNumber?: string; // Masked
  provider?: string;
  phoneNumber?: string; // Masked
}

/**
 * Withdrawal response DTO
 */
export interface Withdrawal {
  id: string;
  amountMinorUnits: number;
  currency: string;
  feeMinorUnits: number;
  netAmountMinorUnits: number;
  status: WithdrawalStatus;
  failureReason?: string;
  rejectionReason?: string;
  retryCount: number;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  payoutMethod?: WithdrawalPayoutMethod;
}

/**
 * Create withdrawal request
 */
export interface CreateWithdrawalRequest {
  amountMinorUnits: number;
  payoutMethodId: string;
}

/**
 * Calculate fee request
 */
export interface CalculateFeeRequest {
  amountMinorUnits: number;
}

/**
 * List withdrawals query params
 */
export interface ListWithdrawalsQuery {
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
}

/**
 * Paginated withdrawals response
 */
export interface PaginatedWithdrawalsResponse {
  withdrawals: Withdrawal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Status display config
 */
export const WITHDRAWAL_STATUS_CONFIG: Record<
  WithdrawalStatus,
  { label: string; color: string; bgColor: string }
> = {
  [WithdrawalStatus.PENDING]: {
    label: 'Pending',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  [WithdrawalStatus.APPROVED]: {
    label: 'Approved',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  [WithdrawalStatus.PROCESSING]: {
    label: 'Processing',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  [WithdrawalStatus.COMPLETED]: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  [WithdrawalStatus.REJECTED]: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  [WithdrawalStatus.FAILED]: {
    label: 'Failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

class WithdrawalsApi {
  /**
   * Get available balance for withdrawal
   */
  async getBalance(): Promise<ApiResponse<BalanceResponse>> {
    return apiClient.get<BalanceResponse>('/withdrawals/balance');
  }

  /**
   * Calculate withdrawal fee for an amount
   */
  async calculateFee(
    amountMinorUnits: number,
    countryCode?: string,
    payoutMethod?: 'mobile_money' | 'bank',
  ): Promise<ApiResponse<FeeCalculationResponse>> {
    return apiClient.post<FeeCalculationResponse>('/withdrawals/calculate-fee', {
      amountMinorUnits,
      ...(countryCode && { countryCode }),
      ...(payoutMethod && { payoutMethod }),
    });
  }

  /**
   * Create a withdrawal request
   */
  async createWithdrawal(data: CreateWithdrawalRequest): Promise<ApiResponse<Withdrawal>> {
    return apiClient.post<Withdrawal>('/withdrawals', data);
  }

  /**
   * List user's withdrawal history
   */
  async listWithdrawals(
    params?: ListWithdrawalsQuery
  ): Promise<ApiResponse<PaginatedWithdrawalsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/withdrawals${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<PaginatedWithdrawalsResponse>(url);
  }

  /**
   * Get withdrawal details
   */
  async getWithdrawal(id: string): Promise<ApiResponse<Withdrawal>> {
    return apiClient.get<Withdrawal>(`/withdrawals/${id}`);
  }

  /**
   * Retry a failed withdrawal
   */
  async retryWithdrawal(id: string): Promise<ApiResponse<Withdrawal>> {
    return apiClient.post<Withdrawal>(`/withdrawals/${id}/retry`);
  }

  /**
   * Get status display config
   */
  getStatusConfig(status: WithdrawalStatus) {
    return WITHDRAWAL_STATUS_CONFIG[status];
  }

  /**
   * Check if withdrawal can be retried
   */
  canRetry(withdrawal: Withdrawal): boolean {
    return withdrawal.status === WithdrawalStatus.FAILED && withdrawal.retryCount < 3;
  }
}

export const withdrawalsApi = new WithdrawalsApi();
