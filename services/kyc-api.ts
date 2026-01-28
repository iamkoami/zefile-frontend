/**
 * KYC API Service
 * Handles KYC status and verification operations
 */

import { ApiResponse, apiClient } from './api-client';

// ============================================
// TYPES
// ============================================

export type KycStatus = 'not_required' | 'required' | 'pending' | 'verified' | 'rejected';

export interface KycStatusResponse {
  status: KycStatus;
  requiredAt?: string;
  gracePeriodEnds?: string;
  daysRemaining?: number;
  isGracePeriodExpired?: boolean;
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
};
