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
}

// Export singleton instance
export const usersApi = new UsersApi();
