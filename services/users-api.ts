/**
 * Users API Service
 * Handles user profile, data consent, and account management API calls
 * Story 17.5, 17.6, 17.7: Account Settings & Privacy Controls
 */

import { apiClient, ApiResponse } from './api-client';

// Profile Types
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  profession?: string;
  dateOfBirth?: Date | string;
  address?: string;
  kycVerified: boolean;
  verifiedName?: string;
  verifiedDob?: Date | string;
  updatedAt: Date;
}

export interface UpdateProfileDto {
  name?: string;
  phoneNumber?: string;
  profession?: string;
  dateOfBirth?: string; // ISO format YYYY-MM-DD
  address?: string;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  profession?: string;
  dateOfBirth?: Date | string;
  address?: string;
  kycVerified: boolean;
  verifiedName?: string;
  verifiedDob?: Date | string;
  updatedAt: Date;
}

// Data Consent Types
export interface DataConsentResponse {
  consent: boolean;
  consentDate?: Date;
  message: string;
}

export interface UpdateDataConsentDto {
  consent: boolean;
}

// Legal Consent Types
export interface LegalConsentStatus {
  termsAccepted: boolean;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  privacyAccepted: boolean;
  privacyVersion: string | null;
  privacyAcceptedAt: string | null;
  cookieConsentAnalytics: boolean;
  cookieConsentAt: string | null;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  needsReAcceptance: boolean;
  currentTermsVersion: string;
  currentPrivacyVersion: string;
}

export interface AcceptLegalTermsDto {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  cookieConsentAnalytics?: boolean;
  marketingConsent?: boolean;
}

export interface UpdateCookieConsentDto {
  analytics: boolean;
}

// Logout All Devices Types
export interface LogoutAllDevicesResponse {
  count: number;
  message: string;
}

// Account Deletion Types
export interface DeletionStatusResponse {
  hasPendingDeletion: boolean;
  deletionRequestedAt?: Date;
  scheduledDeletionAt?: Date;
  daysRemaining?: number;
  cancelUrl?: string;
}

export interface DeletionRequestResponse {
  success: boolean;
  message: string;
  scheduledDeletionAt: Date;
  cancelUrl: string;
}

// Onboarding Status Types
export interface OnboardingStatus {
  milestones: {
    firstTransfer: boolean;
    firstDownload: boolean;
    addedContact: boolean;
    firstPaidTransfer: boolean;
  };
  completedCount: number;
  totalCount: number;
}

export class UsersApi {
  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<UserProfile>('/users/me');
  }

  /**
   * Update user profile (name and/or phone number)
   * Email is immutable and cannot be changed
   */
  async updateProfile(data: UpdateProfileDto): Promise<ApiResponse<UpdateProfileResponse>> {
    return apiClient.patch<UpdateProfileResponse>('/users/me/profile', data);
  }

  /**
   * Get data processing consent status
   * GDPR-compliant endpoint for consent management
   */
  async getDataConsent(): Promise<ApiResponse<DataConsentResponse>> {
    return apiClient.get<DataConsentResponse>('/users/me/data-consent');
  }

  /**
   * Update data processing consent
   * GDPR-compliant endpoint for consent management
   */
  async updateDataConsent(consent: boolean): Promise<ApiResponse<DataConsentResponse>> {
    return apiClient.patch<DataConsentResponse>('/users/me/data-consent', { consent });
  }

  /**
   * Get legal consent status (terms, privacy, cookies, marketing)
   */
  async getLegalConsent(): Promise<ApiResponse<LegalConsentStatus>> {
    return apiClient.get<LegalConsentStatus>('/users/me/legal-consent');
  }

  /**
   * Accept legal terms and privacy policy
   */
  async acceptLegalTerms(data: AcceptLegalTermsDto): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>('/users/me/legal-consent', data);
  }

  /**
   * Update cookie consent preference
   */
  async updateCookieConsent(data: UpdateCookieConsentDto): Promise<ApiResponse<{ message: string }>> {
    return apiClient.patch<{ message: string }>('/users/me/cookie-consent', data);
  }

  /**
   * Logout from all devices
   * Revokes all refresh tokens for the user
   */
  async logoutAllDevices(): Promise<ApiResponse<LogoutAllDevicesResponse>> {
    return apiClient.post<LogoutAllDevicesResponse>('/auth/logout-all', {});
  }

  /**
   * Get account deletion status
   */
  async getDeletionStatus(): Promise<ApiResponse<DeletionStatusResponse>> {
    return apiClient.get<DeletionStatusResponse>('/users/me/deletion-status');
  }

  /**
   * Request account deletion
   * Starts a 7-day grace period before permanent deletion
   * @param confirmation - Must be "DELETE" to confirm
   */
  async requestDeletion(confirmation: string = 'DELETE'): Promise<ApiResponse<DeletionRequestResponse>> {
    return apiClient.post<DeletionRequestResponse>('/users/me/request-deletion', { confirmation });
  }

  /**
   * Cancel account deletion
   * Can only be done during the grace period
   */
  async cancelDeletion(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.post<{ success: boolean; message: string }>('/users/me/cancel-deletion', {});
  }

  /**
   * Upload user avatar/profile picture
   * @param file - The image file to upload (JPEG, PNG, or WebP, max 5MB)
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ profilePictureUrl: string; message: string }>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.upload<{ profilePictureUrl: string; message: string }>(
      '/users/me/avatar',
      formData
    );
  }

  /**
   * Delete user avatar/profile picture
   */
  async deleteAvatar(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return apiClient.delete<{ success: boolean; message: string }>('/users/me/avatar');
  }

  /**
   * Get onboarding checklist milestone status
   */
  async getOnboardingStatus(): Promise<ApiResponse<OnboardingStatus>> {
    return apiClient.get<OnboardingStatus>('/users/me/onboarding-status');
  }

  /**
   * Claim or update the user's ZeFile handle (e.g. "amara" → amara.zefile.io).
   * Requires STARTER or PRO tier.
   */
  async updateHandle(handle: string): Promise<ApiResponse<{ handle: string }>> {
    return apiClient.put<{ handle: string }>('/users/me/handle', { handle });
  }

  /**
   * Check if a handle is available (debounce before calling).
   */
  async checkHandle(handle: string): Promise<ApiResponse<{ available: boolean; reason?: string }>> {
    return apiClient.get<{ available: boolean; reason?: string }>(
      `/users/me/handle/check?handle=${encodeURIComponent(handle)}`,
    );
  }
}

// Export singleton instance
export const usersApi = new UsersApi();
