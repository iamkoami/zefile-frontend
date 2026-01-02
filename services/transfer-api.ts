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
  senderId: string;
  recipientEmails: string[]; // Changed to array
  price?: number;
  currency?: string;
  currencyName?: string; // Localized currency name from backend
  message?: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  expiryDate: string;
  downloadCount: number;
  maxDownloads?: number;
  downloadPageViews: number;
  hasPassword: boolean;
  senderNotifiedDownload: boolean;
  senderNotifiedExpiry: boolean;
  lastDownloadedAt?: string;
  createdDate: string;
  files?: Array<{
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }>;
}

export interface UpdateTransferDto {
  status?: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  currency?: string;
  message?: string;
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
}

// Export singleton instance
export const transferApi = new TransferApi();
