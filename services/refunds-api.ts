/**
 * Refunds API Service
 * Handles refund request operations for buyers
 * Story 14-11: Refund Request Form
 */

import { apiClient, ApiResponse } from './api-client';

/**
 * Refund reason enum (matches backend RefundReason)
 */
export enum RefundReason {
  FILES_NOT_RECEIVED = 'files_not_received',
  WRONG_FILES = 'wrong_files',
  FILES_CORRUPTED = 'files_corrupted',
  DOUBLE_CHARGED = 'double_charged',
  UNAUTHORIZED = 'unauthorized',
  OTHER = 'other',
}

/**
 * Refund request status enum (matches backend RefundRequestStatus)
 */
export enum RefundRequestStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  REFUNDED = 'refunded',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * Refund eligibility response
 */
export interface RefundEligibilityResponse {
  eligible: boolean;
  reason?: string;
  paymentId?: string;
  amountMinorUnits?: number;
  currency?: string;
  daysRemaining?: number;
}

/**
 * Create refund request
 */
export interface CreateRefundRequest {
  transferId: string;
  email: string;
  reason: RefundReason;
  description: string;
  screenshotUrl?: string;
}

/**
 * Check eligibility request
 */
export interface CheckEligibilityRequest {
  transferId: string;
  email: string;
}

/**
 * Refund request response (user-facing)
 */
export interface RefundRequest {
  id: string;
  reference: string;
  email: string;
  transferId: string;
  reason: RefundReason;
  status: RefundRequestStatus;
  amountMinorUnits: number;
  currency: string;
  screenshotUrl?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  refundedAt?: string;
}

/**
 * List refund requests query params
 */
export interface ListRefundRequestsQuery {
  page?: number;
  limit?: number;
  status?: RefundRequestStatus;
}

/**
 * Paginated refund requests response
 */
export interface PaginatedRefundRequestsResponse {
  refunds: RefundRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Refund reason display config
 */
export const REFUND_REASON_CONFIG: Record<
  RefundReason,
  { label: string; description: string }
> = {
  [RefundReason.FILES_NOT_RECEIVED]: {
    label: "Files not received",
    description: "I paid but never received the download link or files",
  },
  [RefundReason.WRONG_FILES]: {
    label: "Wrong files",
    description: "The files I received are different from what was advertised",
  },
  [RefundReason.FILES_CORRUPTED]: {
    label: "Corrupted files",
    description: "The files cannot be opened or are damaged",
  },
  [RefundReason.DOUBLE_CHARGED]: {
    label: "Double charged",
    description: "I was charged multiple times for the same purchase",
  },
  [RefundReason.UNAUTHORIZED]: {
    label: "Unauthorized transaction",
    description: "I did not authorize this transaction",
  },
  [RefundReason.OTHER]: {
    label: "Other",
    description: "Other reason not listed above",
  },
};

/**
 * Refund status display config
 */
export const REFUND_STATUS_CONFIG: Record<
  RefundRequestStatus,
  { label: string; color: string; bgColor: string }
> = {
  [RefundRequestStatus.PENDING]: {
    label: 'Pending Review',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  [RefundRequestStatus.UNDER_REVIEW]: {
    label: 'Under Review',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  [RefundRequestStatus.APPROVED]: {
    label: 'Approved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  [RefundRequestStatus.PROCESSING]: {
    label: 'Processing',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  [RefundRequestStatus.REFUNDED]: {
    label: 'Refunded',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  [RefundRequestStatus.REJECTED]: {
    label: 'Rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  [RefundRequestStatus.FAILED]: {
    label: 'Failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

class RefundsApi {
  /**
   * Check if a transfer is eligible for refund
   */
  async checkEligibility(
    data: CheckEligibilityRequest
  ): Promise<ApiResponse<RefundEligibilityResponse>> {
    return apiClient.post<RefundEligibilityResponse>('/refunds/eligibility', data);
  }

  /**
   * Create a refund request
   */
  async createRefundRequest(data: CreateRefundRequest): Promise<ApiResponse<RefundRequest>> {
    return apiClient.post<RefundRequest>('/refunds', data);
  }

  /**
   * Get refund requests by email
   */
  async getMyRefundRequests(
    email: string,
    params?: ListRefundRequestsQuery
  ): Promise<ApiResponse<PaginatedRefundRequestsResponse>> {
    const queryParams = new URLSearchParams();
    queryParams.append('email', email);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/refunds?${queryParams.toString()}`;
    return apiClient.get<PaginatedRefundRequestsResponse>(url);
  }

  /**
   * Get refund request by reference
   */
  async getByReference(reference: string, email: string): Promise<ApiResponse<RefundRequest>> {
    return apiClient.get<RefundRequest>(`/refunds/reference/${reference}?email=${encodeURIComponent(email)}`);
  }

  /**
   * Upload screenshot evidence
   */
  async uploadScreenshot(file: File): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload<{ url: string }>('/refunds/upload-screenshot', formData);
  }

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

  /**
   * Get reason display config
   */
  getReasonConfig(reason: RefundReason) {
    return REFUND_REASON_CONFIG[reason];
  }

  /**
   * Get status display config
   */
  getStatusConfig(status: RefundRequestStatus) {
    return REFUND_STATUS_CONFIG[status];
  }

  /**
   * Check if refund is in terminal state
   */
  isTerminal(status: RefundRequestStatus): boolean {
    return [
      RefundRequestStatus.REFUNDED,
      RefundRequestStatus.REJECTED,
      RefundRequestStatus.FAILED,
    ].includes(status);
  }
}

export const refundsApi = new RefundsApi();
