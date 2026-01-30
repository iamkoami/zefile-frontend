/**
 * KYC API Service
 * Handles KYC status and verification operations
 */

import { ApiResponse, apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export type KycStatus = 'not_required' | 'required' | 'pending' | 'verified' | 'rejected';

export type KycVerificationMethod = 'manual' | 'bvn' | 'nin' | 'pending';

export type IdentityCountry = 'NG' | 'GH' | 'KE' | 'SN' | 'CI' | 'BJ' | 'TG' | 'OTHER';

export interface KycStatusResponse {
  status: KycStatus;
  requiredAt?: string;
  gracePeriodEnds?: string;
  daysRemaining?: number;
  isGracePeriodExpired?: boolean;
  identityCountry?: IdentityCountry;
  verificationMethod?: KycVerificationMethod;
  kycVerifiedAt?: string;
  rejectionReason?: string;
}

// ============================================
// BVN VERIFICATION TYPES
// ============================================

export interface KycRoutingResponse {
  recommendedMethod: KycVerificationMethod;
  availableMethods: KycVerificationMethod[];
  identityCountry?: IdentityCountry;
  bvnAvailable: boolean;
  documentUploadAvailable: boolean;
}

export interface KycVerificationStatusResponse {
  kycStatus: KycStatus;
  verificationMethod: KycVerificationMethod;
  identityCountry?: IdentityCountry;
  maskedBvn?: string;
  bvnVerifiedAt?: string;
  verifiedFirstName?: string;
  verifiedLastName?: string;
  kycVerifiedAt?: string;
  rejectionReason?: string;
  gracePeriodEnds?: string;
}

export interface BvnInitiateResponse {
  success: boolean;
  message: string;
  sessionId?: string;
  phoneMasked?: string;
  expiresIn?: number;
  errorCode?: string;
}

export interface BvnVerificationResponse {
  success: boolean;
  message: string;
  kycStatus?: KycStatus;
  verifiedName?: string;
  maskedBvn?: string;
  requiresReview?: boolean;
  matchScore?: number;
  errorCode?: string;
  remainingAttempts?: number;
}

export interface BvnSessionStatusResponse {
  active: boolean;
  sessionId?: string;
  phoneMasked?: string;
  expiresIn?: number;
  remainingAttempts?: number;
  remainingResends?: number;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
  remainingResends?: number;
  expiresIn?: number;
  errorCode?: string;
}

export interface KycThresholdsResponse {
  cumulativeAmountEur: number;
  paidTransferCount: number;
  gracePeriodDays: number;
}

export type DocumentType = 'id_front' | 'id_back' | 'selfie';

export type IdDocumentType = 'national_id' | 'passport' | 'drivers_license' | 'residence_permit';

export interface KycDocumentResponse {
  id: string;
  type: DocumentType;
  idDocumentType?: IdDocumentType;
  originalFilename: string;
  fileSize: number;
  uploadedAt: string;
}

export interface PendingDocumentsResponse {
  documents: KycDocumentResponse[];
  hasIdFront: boolean;
  hasIdBack: boolean;
  hasSelfie: boolean;
  isComplete: boolean;
}

export interface KycSubmissionResponse {
  submissionId: string;
  status: string;
  documentCount: number;
  submittedAt: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get current user's KYC status
 */
export async function getKycStatus(): Promise<ApiResponse<KycStatusResponse>> {
  return apiClient.get<KycStatusResponse>('/kyc/status');
}

/**
 * Get KYC threshold configuration
 */
export async function getKycThresholds(): Promise<ApiResponse<KycThresholdsResponse>> {
  return apiClient.get<KycThresholdsResponse>('/kyc/thresholds');
}

/**
 * Get pending KYC documents
 */
export async function getPendingDocuments(): Promise<ApiResponse<PendingDocumentsResponse>> {
  return apiClient.get<PendingDocumentsResponse>('/kyc/documents');
}

/**
 * Upload a KYC document
 */
export async function uploadDocument(
  file: File,
  type: DocumentType,
  idDocumentType?: IdDocumentType,
  country?: string,
  idNumber?: string,
): Promise<ApiResponse<KycDocumentResponse>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  if (idDocumentType) {
    formData.append('idDocumentType', idDocumentType);
  }
  if (country) {
    formData.append('country', country);
  }
  if (idNumber) {
    formData.append('idNumber', idNumber);
  }

  // Use upload method which properly handles FormData with XMLHttpRequest
  return apiClient.upload<KycDocumentResponse>('/kyc/documents', formData);
}

/**
 * Delete a pending KYC document
 */
export async function deleteDocument(documentId: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.delete<{ success: boolean }>(`/kyc/documents/${documentId}`);
}

/**
 * Submit KYC documents for review
 */
export async function submitForReview(): Promise<ApiResponse<KycSubmissionResponse>> {
  return apiClient.post<KycSubmissionResponse>('/kyc/submit', {});
}

// ============================================
// BVN VERIFICATION API FUNCTIONS
// ============================================

/**
 * Get KYC routing information (which verification methods are available)
 */
export async function getKycRouting(): Promise<ApiResponse<KycRoutingResponse>> {
  return apiClient.get<KycRoutingResponse>('/kyc/routing');
}

/**
 * Set user's identity country
 */
export async function setIdentityCountry(
  country: IdentityCountry,
): Promise<ApiResponse<{ success: boolean; country: IdentityCountry }>> {
  return apiClient.post<{ success: boolean; country: IdentityCountry }>('/kyc/country', { country });
}

/**
 * Get detailed KYC verification status
 */
export async function getVerificationStatus(): Promise<ApiResponse<KycVerificationStatusResponse>> {
  return apiClient.get<KycVerificationStatusResponse>('/kyc/verification-status');
}

/**
 * Initiate BVN verification - sends OTP to BVN phone
 */
export async function initiateBvnVerification(bvn: string): Promise<ApiResponse<BvnInitiateResponse>> {
  return apiClient.post<BvnInitiateResponse>('/kyc/bvn/initiate', { bvn });
}

/**
 * Complete BVN verification with OTP
 */
export async function completeBvnVerification(
  sessionId: string,
  otp: string,
): Promise<ApiResponse<BvnVerificationResponse>> {
  return apiClient.post<BvnVerificationResponse>('/kyc/bvn/complete', { sessionId, otp });
}

/**
 * Resend OTP for BVN verification
 */
export async function resendBvnOtp(sessionId: string): Promise<ApiResponse<ResendOtpResponse>> {
  return apiClient.post<ResendOtpResponse>('/kyc/bvn/resend-otp', { sessionId });
}

/**
 * Get active BVN OTP session status
 */
export async function getBvnSessionStatus(): Promise<ApiResponse<BvnSessionStatusResponse>> {
  return apiClient.get<BvnSessionStatusResponse>('/kyc/bvn/session');
}

/**
 * Direct BVN verification (without OTP)
 */
export async function verifyBvn(bvn: string): Promise<ApiResponse<BvnVerificationResponse>> {
  return apiClient.post<BvnVerificationResponse>('/kyc/bvn/verify', { bvn });
}

/**
 * Get BVN verification status
 */
export async function getBvnStatus(): Promise<
  ApiResponse<{
    hasVerifiedBvn: boolean;
    maskedBvn?: string;
    verifiedAt?: string;
    verifiedName?: string;
  }>
> {
  return apiClient.get('/kyc/bvn/status');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if KYC verification is required
 */
export function isKycRequired(status: KycStatus): boolean {
  return status === 'required' || status === 'rejected';
}

/**
 * Check if KYC is pending review
 */
export function isKycPending(status: KycStatus): boolean {
  return status === 'pending';
}

/**
 * Check if user is verified
 */
export function isKycVerified(status: KycStatus): boolean {
  return status === 'verified';
}

/**
 * Get human-readable status label
 */
export function getKycStatusLabel(status: KycStatus, locale: 'en' | 'fr' = 'en'): string {
  const labels: Record<KycStatus, { en: string; fr: string }> = {
    not_required: { en: 'Not Required', fr: 'Non requis' },
    required: { en: 'Required', fr: 'Requis' },
    pending: { en: 'Under Review', fr: 'En cours de vérification' },
    verified: { en: 'Verified', fr: 'Vérifié' },
    rejected: { en: 'Rejected', fr: 'Rejeté' },
  };

  return labels[status]?.[locale] || status;
}

export const kycApi = {
  getKycStatus,
  getKycThresholds,
  getPendingDocuments,
  uploadDocument,
  deleteDocument,
  submitForReview,
  // BVN verification
  getKycRouting,
  setIdentityCountry,
  getVerificationStatus,
  initiateBvnVerification,
  completeBvnVerification,
  resendBvnOtp,
  getBvnSessionStatus,
  verifyBvn,
  getBvnStatus,
};
