/**
 * Transfer API Service
 * Handles transfer creation, management, and status operations
 */

import { apiClient, ApiResponse } from './api-client';

export interface CreateTransferDto {
  senderId: string;
  recipientEmails: string[]; // Changed to array (1-10 emails)
  title: string; // Required by backend
  price?: number;
  currency?: string;
  message?: string;
  password?: string;
  expiryDate?: string;
  maxDownloads?: number;
}

export interface CreateTransferWithFilesDto extends CreateTransferDto {
  files: File[];
}

export interface TransferDto {
  id: string;
  shortCode: string;
  senderId: string | { id: string; email: string };
  recipientEmails: string[]; // Changed to array
  title?: string;
  price?: number;
  currency?: string;
  currencyName?: string; // Localized currency name from backend
  message?: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  // Backend uses expireAt, frontend may expect expiryDate
  expiryDate?: string;
  expireAt?: string;
  downloadCount: number;
  maxDownloads?: number;
  downloadPageViews: number;
  hasPassword?: boolean;
  password?: string;
  senderNotifiedDownload: boolean;
  senderNotifiedExpiry: boolean;
  lastDownloadedAt?: string;
  // Backend uses createdAt, frontend may expect createdDate
  createdDate?: string;
  createdAt?: string;
  files?: Array<{
    id: string;
    filename?: string;
    fileName?: string; // Backend uses fileName
    size?: number | string;
    fileSize?: string | number; // Backend uses fileSize as string
    mimeType?: string;
    fileType?: string; // Backend uses fileType
    thumbnailUrl?: string;
  }>;
}

export interface UpdateTransferDto {
  status?: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  currency?: string;
  message?: string;
}

export interface UpdateTitleDto {
  senderId: string;
  title: string;
}

export interface UpdatePasswordDto {
  senderId: string;
  password?: string; // Empty or undefined to remove password protection
}

export interface SecureDeleteDto {
  senderId: string;
}

export interface BatchDeleteDto {
  senderId: string;
  ids: string[];
}

export interface SecureOperationResponse {
  success: boolean;
  message: string;
}

export interface BatchDeleteResponse {
  success: boolean;
  message: string;
  deleted: number;
  failed: number;
}

export interface ReuseTransferDto {
  senderId: string;
  recipientEmails: string[];
  title?: string;
  message?: string;
}

export interface ReuseTransferResponse {
  success: boolean;
  message: string;
  transfer?: TransferDto;
}

export interface RequestTransferOtpDto {
  senderEmail: string;
  recipientEmail: string;
  title?: string;
  price: number;
  message?: string;
}

export interface RequestTransferOtpResponse {
  message: string;
  expiresIn: number;
  chargeInfo: {
    price: number;
    receivedAmount: number;
    serviceCharge: number;
    serviceChargePercentage: number;
  };
}

export interface VerifyTransferOtpDto {
  senderEmail: string;
  otp: string;
  recipientEmail: string;
  title?: string;
  price: number;
  message?: string;
  fileNames: string[];
}

export interface VerifyTransferOtpResponse {
  message: string;
  verified: boolean;
  transferData: {
    senderEmail: string;
    recipientEmail: string;
    title?: string;
    price: number;
    message?: string;
    fileNames: string[];
  };
}

export class TransferApi {
  /**
   * Create a new transfer
   */
  async createTransfer(data: CreateTransferDto): Promise<ApiResponse<TransferDto>> {
    return apiClient.post<TransferDto>('/transfers', data);
  }

  /**
   * Create transfer with file uploads
   */
  async createTransferWithFiles(
    data: CreateTransferWithFilesDto,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<TransferDto>> {
    const formData = new FormData();

    // Add transfer data
    formData.append('senderId', data.senderId);
    // Send recipientEmails as JSON string for FormData
    formData.append('recipientEmails', JSON.stringify(data.recipientEmails));
    // Title is required by backend - ensure it's always present
    formData.append('title', data.title || 'Untitled Transfer');
    if (data.price) formData.append('price', data.price.toString());
    if (data.currency) formData.append('currency', data.currency);
    if (data.message) formData.append('message', data.message);
    if (data.password) formData.append('password', data.password);
    if (data.expiryDate) formData.append('expiryDate', data.expiryDate);
    if (data.maxDownloads) formData.append('maxDownloads', data.maxDownloads.toString());

    // Add files
    data.files.forEach((file) => {
      formData.append('files', file);
    });

    return apiClient.upload<TransferDto>('/transfers/with-files', formData, onProgress);
  }

  /**
   * Get all transfers
   */
  async getAllTransfers(): Promise<ApiResponse<TransferDto[]>> {
    return apiClient.get<TransferDto[]>('/transfers');
  }

  /**
   * Get transfer by ID
   */
  async getTransferById(id: string): Promise<ApiResponse<TransferDto>> {
    return apiClient.get<TransferDto>(`/transfers/${id}`);
  }

  /**
   * Get transfers by sender
   */
  async getTransfersBySender(senderId: string): Promise<ApiResponse<TransferDto[]>> {
    return apiClient.get<TransferDto[]>(`/transfers/user/${senderId}`);
  }

  /**
   * Get transfers by recipient email
   */
  async getTransfersByRecipient(recipientEmail: string): Promise<ApiResponse<TransferDto[]>> {
    return apiClient.get<TransferDto[]>(`/transfers/recipient/${recipientEmail}`);
  }

  /**
   * Get transfers by status
   */
  async getTransfersByStatus(status: TransferDto['status']): Promise<ApiResponse<TransferDto[]>> {
    return apiClient.get<TransferDto[]>(`/transfers/status/${status}`);
  }

  /**
   * Update transfer
   */
  async updateTransfer(id: string, data: UpdateTransferDto): Promise<ApiResponse<TransferDto>> {
    return apiClient.patch<TransferDto>(`/transfers/${id}`, data);
  }

  /**
   * Update transfer status
   */
  async updateTransferStatus(id: string, status: TransferDto['status']): Promise<ApiResponse<TransferDto>> {
    return apiClient.patch<TransferDto>(`/transfers/${id}/status/${status}`);
  }

  /**
   * Delete transfer
   */
  async deleteTransfer(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/transfers/${id}`);
  }

  /**
   * Get transfer by short code (public endpoint)
   */
  async getTransferByShortCode(shortCode: string): Promise<ApiResponse<TransferDto>> {
    return apiClient.get<TransferDto>(`/transfers/code/${shortCode}`);
  }

  /**
   * Request OTP for transfer creation
   */
  async requestTransferOTP(data: RequestTransferOtpDto): Promise<ApiResponse<RequestTransferOtpResponse>> {
    return apiClient.post<RequestTransferOtpResponse>('/transfers/request-otp', data);
  }

  /**
   * Verify OTP for transfer creation
   */
  async verifyTransferOTP(data: VerifyTransferOtpDto): Promise<ApiResponse<VerifyTransferOtpResponse>> {
    return apiClient.post<VerifyTransferOtpResponse>('/transfers/verify-otp', data);
  }

  /**
   * Finalize transfer and send notification emails
   * Call this after all files have been uploaded
   */
  async finalizeTransfer(transferId: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.post<{ success: boolean; message: string }>(`/transfers/${transferId}/finalize`, {});
  }

  /**
   * Update transfer title (with ownership validation)
   * @param transferId The transfer ID
   * @param data Title update data with senderId for ownership validation
   */
  async updateTransferTitle(transferId: string, data: UpdateTitleDto): Promise<ApiResponse<SecureOperationResponse>> {
    return apiClient.patch<SecureOperationResponse>(`/transfers/${transferId}/title`, data);
  }

  /**
   * Update transfer password (with ownership validation)
   * Empty or undefined password removes password protection
   * @param transferId The transfer ID
   * @param data Password update data with senderId for ownership validation
   */
  async updateTransferPassword(transferId: string, data: UpdatePasswordDto): Promise<ApiResponse<SecureOperationResponse>> {
    return apiClient.patch<SecureOperationResponse>(`/transfers/${transferId}/password`, data);
  }

  /**
   * Delete transfer securely (with ownership validation)
   * Uses POST to allow body data for ownership validation
   * @param transferId The transfer ID
   * @param data Delete data with senderId for ownership validation
   */
  async deleteTransferSecure(transferId: string, data: SecureDeleteDto): Promise<ApiResponse<SecureOperationResponse>> {
    return apiClient.post<SecureOperationResponse>(`/transfers/${transferId}/delete`, data);
  }

  /**
   * Batch delete multiple transfers (with ownership validation)
   * Uses POST to allow body data for ownership validation
   * @param data Batch delete data with senderId and array of transfer IDs
   */
  async batchDeleteTransfers(data: BatchDeleteDto): Promise<ApiResponse<BatchDeleteResponse>> {
    return apiClient.post<BatchDeleteResponse>('/transfers/batch-delete', data);
  }

  /**
   * Reuse/forward a transfer to new recipients
   * Creates a new transfer with the same files sent to new recipients
   * @param sourceTransferId The ID of the source transfer to reuse
   * @param data Reuse data with senderId, recipientEmails, and optional title/message
   */
  async reuseTransfer(sourceTransferId: string, data: ReuseTransferDto): Promise<ApiResponse<ReuseTransferResponse>> {
    return apiClient.post<ReuseTransferResponse>(`/transfers/${sourceTransferId}/reuse`, data);
  }
}

// Export singleton instance
export const transferApi = new TransferApi();
