/**
 * Transfer API Service
 * Handles transfer creation, management, and status operations
 */

import { apiClient, ApiResponse } from './api-client';
import type { TransferRecipient } from '@/types/recipient';

export interface CreateTransferDto {
  senderId: string;
  recipientEmails: string[]; // Always passed; empty array when isPublicSales is true
  recipients?: TransferRecipient[]; // Unified recipients (email + whatsapp) — Epic 124
  title: string; // Required by backend
  /**
   * LEGACY — MINOR units. Do not use for new code; send `priceMajorUnits` instead.
   * Sending both is rejected by the backend: they are different scales (story 144.7).
   */
  price?: number;
  /**
   * MAJOR units, as typed by a person — 3000 means 3,000 CFA.
   * The backend owns the exponent and scales this to minor units. The frontend never needs a
   * currency-exponent list for input, which is deliberate (story 144.8).
   */
  priceMajorUnits?: number;
  currency?: string;
  message?: string;
  /** Access control mode: private (default), password, or public */
  accessControl?: 'private' | 'password' | 'public';
  password?: string;
  /** ISO date string for transfer expiry (calculated from validityDuration) */
  expireAt?: string;
  expiryDate?: string; // Legacy field
  maxDownloads?: number;
  wallpaperKey?: string;
  coverKey?: string;
  paymentRequired?: boolean;
  /** Public sales mode — transfer is available for purchase by anyone */
  isPublicSales?: boolean;
  /**
   * Story 134.4 — delivery mode. 'stream' means buyers watch the film and never receive the
   * file. Requires public sales mode, a tier with the streamDelivery feature, and video-only
   * files; the backend refuses any other combination. Set at creation and never flipped.
   */
  deliveryMode?: 'download' | 'stream';
}

export interface CreateTransferWithFilesDto extends CreateTransferDto {
  files: File[];
}

export interface SenderBrandingDto {
  companyName: string | null;
  primaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  buttonTextColor: string | null;
  showPoweredByZefile: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
}

export interface TransferDto {
  id: string;
  shortCode: string;
  senderId: string | { id: string; email: string; kycStatus?: 'none' | 'pending' | 'under_review' | 'verified' | 'rejected' };
  recipientEmails?: string[]; // Present in authenticated endpoints, stripped from public
  recipientCount?: number; // Present in public endpoints instead of recipientEmails
  title?: string;
  price?: number;
  currency?: string;
  currencyName?: string; // Localized currency name from backend
  message?: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled' | 'test';
  // Backend uses expireAt, frontend may expect expiryDate
  expiryDate?: string;
  expireAt?: string;
  downloadCount: number;
  maxDownloads?: number;
  downloadPageViews: number;
  hasPassword?: boolean;
  password?: string;
  // Access control mode for the transfer
  accessControl?: 'private' | 'password' | 'public';
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
    previewStatus?: 'pending' | 'ready' | 'failed' | 'skipped'; // Story 132.2
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
  wallpaperUrl?: string;
  coverUrl?: string;
  // Custom domain URL when sender has an active custom domain
  customDomainUrl?: string;
  // Sender branding from BrandingProfile (STARTER+ only, story 57.3)
  senderBranding?: SenderBrandingDto | null;
  // Sender's public creator profile (for creator strip on download page)
  senderProfile?: {
    handle: string;
    name: string | null;
    specialtyEn: string | null;
    specialtyFr: string | null;
    location: string | null;
    profilePictureUrl: string | null;
  } | null;
  // Unique recipient channel types (e.g., ['email'], ['whatsapp'], or ['email', 'whatsapp'])
  recipientTypes?: ('email' | 'whatsapp')[];
  // Public sales mode — transfer is available for purchase by anyone
  isPublicSales?: boolean;
  // Sales analytics (populated for public sales transfers viewed by sender)
  salesStats?: {
    totalSales: number;
    totalRevenueMinor: number;
    currency: string;
  };
  /**
   * How the files reach the recipient (Story 134.2). 'stream' transfers refuse every
   * download route and play encrypted segments instead.
   *
   * Story 134.7: both this and `streamStatus` have been on the wire since 134.2 — the
   * backend returns them to the OWNER deliberately unstripped — and were simply not
   * declared here, so TypeScript hid data the browser already had.
   */
  deliveryMode?: 'download' | 'stream';
  /**
   * Packaging lifecycle of a stream transfer's media (Story 134.2, rendered by 134.7).
   *
   * Null/absent on every download transfer — they never await packaging, so 'pending'
   * would be a lie. Always test `deliveryMode === 'stream'` alongside this; a bare
   * `streamStatus !== 'ready'` is true for every download transfer in the system.
   */
  streamStatus?: 'pending' | 'processing' | 'ready' | 'failed' | null;
}

export interface UpdateTransferDto {
  status?: 'pending' | 'active' | 'completed' | 'expired' | 'cancelled';
  currency?: string;
  message?: string;
  coverKey?: string;
  wallpaperKey?: string;
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
  recipients?: TransferRecipient[]; // Unified recipients — Epic 124
  title?: string;
  message?: string;
  isPublicSales?: boolean;
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
   * Create a test transfer (10MB cap, 1-hour TTL)
   */
  async createTestTransfer(title?: string): Promise<ApiResponse<{
    id: string;
    shortCode: string;
    isTestTransfer: boolean;
    expireAt: string;
    title: string;
  }>> {
    return apiClient.post('/transfers/test', { title });
  }

  /**
   * Get rendered email preview for a test transfer (no email is sent)
   */
  async getTestTransferEmailPreview(
    transferId: string,
    template: 'transfer-sender' | 'transfer-recipient',
  ): Promise<ApiResponse<{ html: string; subject: string }>> {
    return apiClient.get(`/transfers/test/${transferId}/email-preview/${template}`);
  }

  /**
   * Claim a test upload session after authentication.
   * Creates a test transfer from the anonymously uploaded file.
   */
  async claimTestTransfer(sessionId: string): Promise<
    ApiResponse<{
      id: string;
      shortCode: string;
      isTestTransfer: boolean;
      expireAt: string;
      title: string;
    }>
  > {
    return apiClient.post('/transfers/test/claim', { sessionId });
  }

  /**
   * Get anonymous preview data for a test upload session (no auth).
   */
  async getTestPreview(sessionId: string): Promise<
    ApiResponse<{
      sessionId: string;
      filename: string;
      fileSize: number;
      mimeType: string;
      title: string;
      isTestTransfer: boolean;
    }>
  > {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/transfers/test/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await response.json();
    if (response.ok) {
      return { data, status: response.status };
    }
    return { error: data.message || 'Failed to get preview', status: response.status };
  }

  /**
   * Create a test transfer session with form metadata (anonymous, no auth).
   * Called after the anonymous file upload completes.
   */
  async createTestSession(data: {
    sessionId: string;
    senderEmail: string;
    recipientEmails: string[];
    title: string;
    price: number;
    currency: string;
  }): Promise<
    ApiResponse<{
      sessionId: string;
      shortCode: string;
      senderEmail: string;
      recipientEmails: string[];
      title: string;
      price: number;
      currency: string;
      filename: string;
      fileSize: number;
      mimeType: string;
      isTestTransfer: boolean;
      previewBase64: string | null;
      previewMimeType: string | null;
    }>
  > {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/transfers/test/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (response.ok) {
      return { data: responseData, status: response.status };
    }
    return {
      error: { message: responseData.message || 'Failed to create test session', statusCode: response.status },
      status: response.status,
    };
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
    // Epic 124 dual-write: send unified recipients alongside legacy recipientEmails
    if (data.recipients) {
      formData.append('recipients', JSON.stringify(data.recipients));
    }
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
    return apiClient.patch<TransferDto>(`/transfers/${id}?id=${id}`, { ...data, id });
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
   * Initiate a public sale purchase (returns Paystack authorization URL)
   */
  async initiatePurchase(shortCode: string, buyerEmail: string): Promise<ApiResponse<{ authorizationUrl: string; reference: string }>> {
    return apiClient.post<{ authorizationUrl: string; reference: string }>(
      `/transfers/${shortCode}/buy`,
      { buyerEmail },
    );
  }

  /**
   * Verify a public sale purchase and get download token
   */
  async verifyPurchase(shortCode: string, reference: string): Promise<ApiResponse<{ downloadToken: string; expiresAt: string }>> {
    return apiClient.get<{ downloadToken: string; expiresAt: string }>(
      `/transfers/${shortCode}/buy/verify?reference=${encodeURIComponent(reference)}`,
    );
  }

  /**
   * Check whether the signed-in user has already purchased a public sale transfer.
   *
   * Requires authentication and answers only for the caller's own email, which the
   * backend reads from the JWT — it no longer accepts an email, so it cannot be used
   * to probe whether someone else bought a transfer. Signed-out buyers should use
   * recoverPurchase() instead, which proves ownership by OTP.
   */
  async checkPurchase(shortCode: string): Promise<ApiResponse<{ hasPurchase: boolean }>> {
    return apiClient.post<{ hasPurchase: boolean }>(
      `/transfers/${shortCode}/buy/check`,
      {},
    );
  }

  /**
   * Recover a previous purchase by sending OTP to buyer's email.
   *
   * Always reports otpSent: true — a code only actually arrives if the email has a
   * purchase, so the response cannot be used to test whether it does.
   */
  async recoverPurchase(shortCode: string, email: string): Promise<ApiResponse<{ otpSent: boolean }>> {
    return apiClient.post<{ otpSent: boolean }>(
      `/transfers/${shortCode}/buy/recover`,
      { email },
    );
  }

  /**
   * Verify OTP for purchase recovery and get download token
   */
  async verifyRecovery(shortCode: string, email: string, otp: string): Promise<ApiResponse<{ downloadToken: string; expiresAt: string }>> {
    return apiClient.post<{ downloadToken: string; expiresAt: string }>(
      `/transfers/${shortCode}/buy/recover/verify`,
      { email, otp },
    );
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
   * Ownership validated via JWT on the backend
   * @param transferId The transfer ID
   */
  async getVersionLimits(
    transferId: string,
  ): Promise<ApiResponse<VersionLimitDto>> {
    return apiClient.get<VersionLimitDto>(
      `/transfers/${transferId}/version-limits`
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

  async removeCover(
    transferId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(
      `/transfers/${transferId}/cover`
    );
  }

  async removeWallpaper(
    transferId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>(
      `/transfers/${transferId}/wallpaper`
    );
  }

  /**
   * Send a T5 WhatsApp manual payment reminder for a transfer.
   * Rate-limited to 1 per transfer per 24 hours (configurable). Starter/Pro only.
   * @param transferId The transfer ID
   */
  async sendWhatsAppReminder(
    transferId: string
  ): Promise<ApiResponse<{ success: boolean; message: string; nextReminderAt?: string }>> {
    return apiClient.post<{ success: boolean; message: string; nextReminderAt?: string }>(
      `/transfers/${transferId}/whatsapp-reminder`
    );
  }

  /**
   * Ask the sender to resend the password for a protected transfer.
   *
   * Public endpoint — no auth. Returns 429 with `code: PASSWORD_HELP_RATE_LIMITED`
   * when the same recipient already requested help within 30 minutes.
   */
  async requestPasswordHelp(
    shortCode: string,
    recipientEmail: string,
    failedAttemptsCount?: number
  ): Promise<ApiResponse<{ success: boolean; sentAt: string }>> {
    return apiClient.post<{ success: boolean; sentAt: string }>(
      `/transfers/code/${shortCode}/password-help-request`,
      { recipientEmail, failedAttemptsCount }
    );
  }

  /**
   * Report a failed download to the sender (story 132.3).
   *
   * Public endpoint — no auth. Returns 429 with `code: DOWNLOAD_FAILED_REPORT_RATE_LIMITED`
   * when the same recipient already reported within the last 60 minutes.
   * errorContext carries diagnostic-only fields (never raw paths or s3 keys).
   */
  async reportDownloadFailure(
    shortCode: string,
    payload: {
      recipientEmail: string;
      errorCode: "network" | "server" | "zip" | "generic";
      errorContext?: {
        httpStatus?: number;
        jsErrorMessage?: string;
        fileCount?: number;
        transferSizeBytes?: number;
      };
    }
  ): Promise<ApiResponse<{ success: boolean; sentAt: string }>> {
    return apiClient.post<{ success: boolean; sentAt: string }>(
      `/transfers/code/${shortCode}/download-failed-report`,
      payload
    );
  }

  /**
   * Get WhatsApp reminder status (rate limit info) for a transfer.
   * @param transferId The transfer ID
   */
  async getWhatsAppReminderStatus(
    transferId: string
  ): Promise<ApiResponse<{ lastSentAt: string | null; nextReminderAt: string | null; canSend: boolean; hasEligibleContacts: boolean }>> {
    return apiClient.get<{ lastSentAt: string | null; nextReminderAt: string | null; canSend: boolean; hasEligibleContacts: boolean }>(
      `/transfers/${transferId}/whatsapp-reminder/status`
    );
  }
}

// Export singleton instance
export const transferApi = new TransferApi();
