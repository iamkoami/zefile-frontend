/**
 * Disputes API Service
 * Handles user-facing dispute operations
 */

import { apiClient, ApiResponse } from './api-client';

export type DisputeType =
  | 'payment_no_download'
  | 'corrupted_files'
  | 'wrong_files'
  | 'transfer_expired'
  | 'content_mismatch'
  | 'double_charged'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'refund_requested'
  | 'account_action'
  | 'closed';

export interface Dispute {
  id: string;
  reference: string;
  subject: string;
  type: DisputeType;
  status: DisputeStatus;
  transferTitle?: string;
  transferShortCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDisputeDto {
  transferId: string;
  type: DisputeType;
  description: string;
  email?: string;
  role?: 'sender' | 'recipient';
  screenshotUrl?: string;
}

export interface CreateDisputeResponse {
  reference: string;
  message: string;
}

export interface DisputeForTransferResponse {
  dispute: Dispute | null;
}

export interface UserDisputesResponse {
  disputes: Dispute[];
}

export interface UploadScreenshotResponse {
  url: string;
}

export class DisputesApi {
  /**
   * Create a new dispute
   */
  async createDispute(
    data: CreateDisputeDto
  ): Promise<ApiResponse<CreateDisputeResponse>> {
    return apiClient.post<CreateDisputeResponse>('/disputes', data);
  }

  /**
   * Check if user has existing dispute for a transfer
   */
  async getDisputeForTransfer(
    transferId: string,
    email?: string
  ): Promise<ApiResponse<DisputeForTransferResponse>> {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    return apiClient.get<DisputeForTransferResponse>(
      `/disputes/transfer/${transferId}${params}`
    );
  }

  /**
   * Get dispute status by ID
   */
  async getDisputeById(
    disputeId: string,
    email?: string
  ): Promise<ApiResponse<DisputeForTransferResponse>> {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    return apiClient.get<DisputeForTransferResponse>(
      `/disputes/${disputeId}${params}`
    );
  }

  /**
   * Get all disputes for authenticated user
   */
  async getMyDisputes(): Promise<ApiResponse<UserDisputesResponse>> {
    return apiClient.get<UserDisputesResponse>('/disputes/my');
  }

  /**
   * Add a comment to an existing dispute
   */
  async addComment(
    disputeId: string,
    comment: string,
    email?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>(
      `/disputes/${disputeId}/comments`,
      { comment, email }
    );
  }

  /**
   * Upload a screenshot for dispute evidence
   * Returns the S3 URL to use in dispute creation
   */
  async uploadScreenshot(
    file: File
  ): Promise<ApiResponse<UploadScreenshotResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.upload<UploadScreenshotResponse>(
      '/disputes/upload-screenshot',
      formData
    );
  }
}

export const disputesApi = new DisputesApi();
