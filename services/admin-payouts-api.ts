/**
 * Admin Payouts API Service
 * Handles admin operations for withdrawals, refunds, and payout settings
 * Stories 14-15, 14-16, 14-18: Admin Dashboard
 */

import { apiClient, ApiResponse } from './api-client';
import { WithdrawalStatus, Withdrawal } from './withdrawals-api';
import { RefundRequestStatus, RefundReason, RefundRequest } from './refunds-api';

// ============================================
// ADMIN WITHDRAWALS
// ============================================

/**
 * Admin withdrawal with user info
 */
export interface AdminWithdrawal extends Withdrawal {
  userEmail: string;
  userName?: string;
  approvedBy?: string;
  kycStatus?: string;
}

/**
 * Admin list withdrawals query
 */
export interface AdminListWithdrawalsQuery {
  status?: WithdrawalStatus;
  userEmail?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
}

/**
 * Admin paginated withdrawals response
 */
export interface AdminPaginatedWithdrawalsResponse {
  withdrawals: AdminWithdrawal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    pendingCount: number;
    pendingAmount: number;
    approvedToday: number;
    rejectedToday: number;
  };
}

/**
 * Bulk approve response
 */
export interface BulkApproveResponse {
  approved: number;
  skipped: number;
  approvedIds: string[];
  skippedIds: string[];
}

/**
 * Withdrawal stats
 */
export interface WithdrawalStats {
  pendingCount: number;
  pendingAmount: number;
  approvedToday: number;
  rejectedToday: number;
  completedThisMonth: number;
  totalPayoutThisMonth: number;
}

// ============================================
// ADMIN REFUNDS
// ============================================

/**
 * Admin refund request with full details
 */
export interface AdminRefundRequest {
  id: string;
  reference: string;
  userId?: string;
  email: string;
  transferId: string;
  transferTitle?: string;
  paymentId: string;
  paymentReference?: string;
  reason: RefundReason;
  description: string;
  screenshotUrl?: string;
  amountMinorUnits: number;
  currency: string;
  status: RefundRequestStatus;
  reviewedBy?: string;
  reviewedByEmail?: string;
  reviewedAt?: string;
  adminNotes?: string;
  rejectionReason?: string;
  paystackRefundReference?: string;
  refundedAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Admin list refunds query
 */
export interface AdminListRefundsQuery {
  status?: RefundRequestStatus;
  reason?: RefundReason;
  search?: string;
  sortBy?: 'createdAt' | 'amountMinorUnits' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Admin paginated refunds response
 */
export interface AdminPaginatedRefundsResponse {
  refunds: AdminRefundRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Refund stats
 */
export interface RefundStats {
  pendingCount: number;
  pendingAmountMinorUnits: number;
  underReviewCount: number;
  approvedCount: number;
  refundedThisMonthCount: number;
  refundedThisMonthAmountMinorUnits: number;
  rejectedThisMonthCount: number;
  averageProcessingTimeHours: number;
}

/**
 * Approve refund request
 */
export interface ApproveRefundRequest {
  adminNotes?: string;
}

/**
 * Reject refund request
 */
export interface RejectRefundRequest {
  reason: string;
  adminNotes?: string;
}

/**
 * Mark under review request
 */
export interface MarkUnderReviewRequest {
  adminNotes?: string;
}

// ============================================
// PAYOUT/REFUND SETTINGS
// ============================================

/**
 * Payout settings
 * All amounts are in minor units (kobo, pesewas, centimes)
 */
export interface PayoutSettings {
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  dailyWithdrawalLimit: number;
  withdrawalFeePercent: number;
  withdrawalFeeFlat: number;
  withdrawalFeeCap: number;
  autoApproveThreshold: number;
}

/**
 * Refund settings
 */
export interface RefundSettings {
  refundWindowDays: number;
  autoRefundReasons: RefundReason[];
  requireScreenshot: boolean;
}

/**
 * Combined settings response
 */
export interface PayoutRefundSettings {
  payouts: PayoutSettings;
  refunds: RefundSettings;
}

class AdminPayoutsApi {
  // ============================================
  // WITHDRAWALS
  // ============================================

  /**
   * List all withdrawals with filters
   */
  async listWithdrawals(
    params?: AdminListWithdrawalsQuery
  ): Promise<ApiResponse<AdminPaginatedWithdrawalsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.userEmail) queryParams.append('userEmail', params.userEmail);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.minAmount) queryParams.append('minAmount', params.minAmount.toString());
    if (params?.maxAmount) queryParams.append('maxAmount', params.maxAmount.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/admin/withdrawals${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<AdminPaginatedWithdrawalsResponse>(url);
  }

  /**
   * Get withdrawal details
   */
  async getWithdrawal(id: string): Promise<ApiResponse<AdminWithdrawal>> {
    return apiClient.get<AdminWithdrawal>(`/admin/withdrawals/${id}`);
  }

  /**
   * Approve a withdrawal
   */
  async approveWithdrawal(id: string): Promise<ApiResponse<AdminWithdrawal>> {
    return apiClient.post<AdminWithdrawal>(`/admin/withdrawals/${id}/approve`);
  }

  /**
   * Reject a withdrawal
   */
  async rejectWithdrawal(id: string, reason: string): Promise<ApiResponse<AdminWithdrawal>> {
    return apiClient.post<AdminWithdrawal>(`/admin/withdrawals/${id}/reject`, { reason });
  }

  /**
   * Bulk approve withdrawals
   */
  async bulkApproveWithdrawals(ids: string[]): Promise<ApiResponse<BulkApproveResponse>> {
    return apiClient.post<BulkApproveResponse>('/admin/withdrawals/bulk-approve', { ids });
  }

  /**
   * Get withdrawal stats
   */
  async getWithdrawalStats(): Promise<ApiResponse<WithdrawalStats>> {
    return apiClient.get<WithdrawalStats>('/admin/withdrawals/stats/overview');
  }

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * List all refund requests with filters
   */
  async listRefunds(
    params?: AdminListRefundsQuery
  ): Promise<ApiResponse<AdminPaginatedRefundsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.reason) queryParams.append('reason', params.reason);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `/admin/refunds${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<AdminPaginatedRefundsResponse>(url);
  }

  /**
   * Get refund request details
   */
  async getRefund(id: string): Promise<ApiResponse<AdminRefundRequest>> {
    return apiClient.get<AdminRefundRequest>(`/admin/refunds/${id}`);
  }

  /**
   * Get refund stats
   */
  async getRefundStats(): Promise<ApiResponse<RefundStats>> {
    return apiClient.get<RefundStats>('/admin/refunds/stats');
  }

  /**
   * Mark refund as under review
   */
  async markUnderReview(
    id: string,
    data?: MarkUnderReviewRequest
  ): Promise<ApiResponse<AdminRefundRequest>> {
    return apiClient.post<AdminRefundRequest>(`/admin/refunds/${id}/under-review`, data || {});
  }

  /**
   * Approve refund request
   */
  async approveRefund(
    id: string,
    data?: ApproveRefundRequest
  ): Promise<ApiResponse<AdminRefundRequest>> {
    return apiClient.post<AdminRefundRequest>(`/admin/refunds/${id}/approve`, data || {});
  }

  /**
   * Reject refund request
   */
  async rejectRefund(id: string, data: RejectRefundRequest): Promise<ApiResponse<AdminRefundRequest>> {
    return apiClient.post<AdminRefundRequest>(`/admin/refunds/${id}/reject`, data);
  }

  /**
   * Retry failed refund
   */
  async retryRefund(id: string): Promise<ApiResponse<AdminRefundRequest>> {
    return apiClient.post<AdminRefundRequest>(`/admin/refunds/${id}/retry`);
  }

  // ============================================
  // SETTINGS
  // ============================================

  /**
   * Get all payout and refund settings
   */
  async getSettings(): Promise<ApiResponse<PayoutRefundSettings>> {
    return apiClient.get<PayoutRefundSettings>('/admin/settings');
  }

  /**
   * Get payout settings only
   */
  async getPayoutSettings(): Promise<ApiResponse<PayoutSettings>> {
    return apiClient.get<PayoutSettings>('/admin/settings/payouts');
  }

  /**
   * Update payout settings
   */
  async updatePayoutSettings(settings: Partial<PayoutSettings>): Promise<ApiResponse<PayoutSettings>> {
    return apiClient.patch<PayoutSettings>('/admin/settings/payouts', settings);
  }

  /**
   * Reset payout settings to defaults
   */
  async resetPayoutSettings(): Promise<ApiResponse<PayoutSettings>> {
    return apiClient.post<PayoutSettings>('/admin/settings/payouts/reset');
  }

  /**
   * Get refund settings only
   */
  async getRefundSettings(): Promise<ApiResponse<RefundSettings>> {
    return apiClient.get<RefundSettings>('/admin/settings/refunds');
  }

  /**
   * Update refund settings
   */
  async updateRefundSettings(settings: Partial<RefundSettings>): Promise<ApiResponse<RefundSettings>> {
    return apiClient.patch<RefundSettings>('/admin/settings/refunds', settings);
  }

  /**
   * Reset refund settings to defaults
   */
  async resetRefundSettings(): Promise<ApiResponse<RefundSettings>> {
    return apiClient.post<RefundSettings>('/admin/settings/refunds/reset');
  }

  /**
   * Get default settings values
   */
  async getDefaultSettings(): Promise<ApiResponse<PayoutRefundSettings>> {
    return apiClient.get<PayoutRefundSettings>('/admin/settings/defaults');
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Format amount from minor units
   */
  formatAmount(minorUnits: number, currency: string): string {
    const amount = minorUnits / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export const adminPayoutsApi = new AdminPayoutsApi();
