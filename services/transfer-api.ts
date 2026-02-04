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
  senderId: string | { id: string; email: string; kycStatus?: 'none' | 'pending' | 'under_review' | 'verified' | 'rejected' };
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
    previewClipUrl?: string; // Video preview clip
    waveformUrl?: string; // Audio waveform
    // Version info for filtering by default version
    version?: {
      id: string;
      versionNumber: number;
      isDefault: boolean;
    };
  }>;
  // Versioning
  versionCount?: number;
  // Payment status - true if a successful payment exists
  isPaid?: boolean;
  // Payment requirement - true if payment is required for this transfer
  paymentRequired?: boolean;
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
  senderId?: string; // For sender (unpaid transfers)
  receiverEmail?: string; // For receiver (paid transfers)
  password?: string; // Empty or undefined to remove password protection
}

export interface SecureDeleteDto {
  senderId?: string; // For sender (unpaid transfers)
  receiverEmail?: string; // For receiver (paid transfers)
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
  senderId?: string; // For sender (unpaid transfers)
  receiverEmail?: string; // For receiver (paid transfers)
  recipientEmails: string[];
  title?: string;
  message?: string;
}

export interface ReuseTransferResponse {
  success: boolean;
  message: string;
  transfer?: TransferDto;
}

export interface CreateVersionDto {
  senderId: string;
  changelog?: string;
  versionLabel?: string;
  notifyRecipients?: boolean;
}

export interface CreateVersionResponse {
  versionId: string;
  versionNumber: number;
  versionLabel: string;
  transferId: string;
}

export interface TransferVersionDto {
  id: string;
  versionNumber: number;
  versionLabel: string;
  isDefault: boolean;
  changelog?: string;
  createdAt: string;
  fileCount: number;
  downloadCount: number;
}

export interface SetDefaultVersionDto {
  senderId: string;
}

export interface VersionLimitDto {
  currentVersionCount: number;
  maxVersions: number;
  remainingVersions: number;
  tier: string;
  canCreateNewVersion: boolean;
}

export interface DeleteVersionResponse {
  success: boolean;
  message: string;
  deletedFiles: number;
  freedBytes: number;
}

// Link tracking types
export interface LogAccessDto {
  sessionId: string;
  source?: 'link' | 'email' | 'qr';
  network?: 'direct' | 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'telegram' | 'email' | 'other';
  referrer?: string;
}

export interface NetworkBreakdownDto {
  network: string;
  count: number;
}

export interface SourceBreakdownDto {
  source: string;
  count: number;
}

export interface RecentAccessDto {
  sessionId: string;
  network: string;
  source: string;
  accessedAt: string;
  converted: boolean;
}

export interface TransferAnalyticsDto {
  totalAccesses: number;
  uniqueSessions: number;
  byNetwork: NetworkBreakdownDto[];
  bySource: SourceBreakdownDto[];
  converted: boolean;
  conversionNetwork: string | null;
  recentAccesses: RecentAccessDto[];
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
   * Returns isFirstTransfer flag for celebration modal
   */
  async finalizeTransfer(transferId: string): Promise<ApiResponse<{ success: boolean; message: string; isFirstTransfer?: boolean }>> {
    return apiClient.post<{ success: boolean; message: string; isFirstTransfer?: boolean }>(`/transfers/${transferId}/finalize`, {});
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
   * Add recipients to an existing transfer
   * Sends email notifications to newly added recipients
   * @param transferId The transfer ID
   * @param data Data with senderId OR receiverEmail and array of new recipient emails
   */
  async addRecipientsToTransfer(
    transferId: string,
    data: { senderId?: string; receiverEmail?: string; emails: string[] }
  ): Promise<ApiResponse<{
    success: boolean;
    message: string;
    addedRecipients?: string[];
    totalRecipients?: number;
  }>> {
    return apiClient.patch<{
      success: boolean;
      message: string;
      addedRecipients?: string[];
      totalRecipients?: number;
    }>(`/transfers/${transferId}/recipients`, data);
  }

  /**
   * Remove a recipient from an existing transfer
   * @param transferId The transfer ID
   * @param data Data with senderId OR receiverEmail and email to remove
   */
  async removeRecipientFromTransfer(
    transferId: string,
    data: { senderId?: string; receiverEmail?: string; email: string }
  ): Promise<ApiResponse<{
    success: boolean;
    message: string;
    remainingRecipients?: string[];
  }>> {
    return apiClient.post<{
      success: boolean;
      message: string;
      remainingRecipients?: string[];
    }>(`/transfers/${transferId}/recipients/remove`, data);
  }

  /**
   * Update a recipient email in an existing transfer
   * Sends notification to the new recipient
   * @param transferId The transfer ID
   * @param data Data with senderId OR receiverEmail, oldEmail, newEmail, and optional addToContacts flag
   */
  async updateRecipientInTransfer(
    transferId: string,
    data: { senderId?: string; receiverEmail?: string; oldEmail: string; newEmail: string; addToContacts?: boolean }
  ): Promise<ApiResponse<{
    success: boolean;
    message: string;
    updatedRecipients?: string[];
    addedToContacts?: boolean;
  }>> {
    return apiClient.post<{
      success: boolean;
      message: string;
      updatedRecipients?: string[];
      addedToContacts?: boolean;
    }>(`/transfers/${transferId}/recipients/update`, data);
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

  /**
   * Create a new version for a transfer
   * Used for uploading updated files without breaking existing links
   * @param transferId The transfer ID
   * @param data Version creation data with senderId for ownership validation
   */
  async createVersion(transferId: string, data: CreateVersionDto): Promise<ApiResponse<CreateVersionResponse>> {
    return apiClient.post<CreateVersionResponse>(`/transfers/${transferId}/versions`, data);
  }

  /**
   * Get version history for a transfer
   * Returns all versions ordered by version number descending
   * @param transferId The transfer ID
   */
  async getVersionHistory(transferId: string): Promise<ApiResponse<TransferVersionDto[]>> {
    return apiClient.get<TransferVersionDto[]>(`/transfers/${transferId}/versions`);
  }

  /**
   * Set a version as the default for a transfer
   * @param transferId The transfer ID
   * @param versionId The version ID to set as default
   * @param data Data with senderId for ownership validation
   */
  async setDefaultVersion(
    transferId: string,
    versionId: string,
    data: SetDefaultVersionDto
  ): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.put<{ success: boolean; message: string }>(
      `/transfers/${transferId}/versions/${versionId}/default`,
      data
    );
  }

  /**
   * Get version limit information for a transfer
   * Returns current version count, max allowed, and tier info
   * @param transferId The transfer ID
   * @param senderId The sender/owner user ID
   */
  async getVersionLimits(
    transferId: string,
    senderId: string
  ): Promise<ApiResponse<VersionLimitDto>> {
    return apiClient.get<VersionLimitDto>(
      `/transfers/${transferId}/version-limits?senderId=${senderId}`
    );
  }

  /**
   * Delete a version and its files
   * Cannot delete the only version
   * Uses POST to allow body data for ownership validation
   * @param transferId The transfer ID
   * @param versionId The version ID to delete
   * @param data Data with senderId for ownership validation
   */
  async deleteVersion(
    transferId: string,
    versionId: string,
    data: { senderId: string }
  ): Promise<ApiResponse<DeleteVersionResponse>> {
    return apiClient.post<DeleteVersionResponse>(
      `/transfers/${transferId}/versions/${versionId}/delete`,
      data
    );
  }

  /**
   * Log recipient access to a transfer
   * Registers the recipient email and adds to Brevo for tracking
   * @param shortCode The transfer short code
   * @param email The recipient email accessing the transfer
   */
  async logRecipientAccess(
    shortCode: string,
    email: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>(
      `/transfers/code/${shortCode}/access`,
      { email }
    );
  }

  /**
   * Log link access for tracking analytics
   * Called when someone visits a transfer link (before payment)
   * @param shortCode The transfer short code
   * @param data Access data including sessionId, source, network
   */
  async logLinkAccess(
    shortCode: string,
    data: LogAccessDto
  ): Promise<ApiResponse<{ success: boolean; accessId?: string }>> {
    return apiClient.post<{ success: boolean; accessId?: string }>(
      `/transfers/${shortCode}/access`,
      data
    );
  }

  /**
   * Get transfer link analytics for the sender
   * Returns access breakdown by network, source, and recent accesses
   * @param transferId The transfer ID (not shortCode)
   * @param senderId The sender user ID for ownership validation
   */
  async getTransferAnalytics(
    transferId: string,
    senderId: string
  ): Promise<ApiResponse<TransferAnalyticsDto>> {
    return apiClient.get<TransferAnalyticsDto>(
      `/transfers/${transferId}/analytics?senderId=${senderId}`
    );
  }
}

// Export singleton instance
export const transferApi = new TransferApi();
