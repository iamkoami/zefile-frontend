/**
 * Authentication API Service
 * Handles all authentication-related API calls
 */

import { apiClient, ApiResponse } from './api-client';

export interface RequestOtpDto {
  email: string;
}

export interface OtpResponseDto {
  message: string;
  isNewUser: boolean;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    accountType: 'sender' | 'recipient' | 'both';
    state: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export class AuthApi {
  /**
   * Request OTP for login or registration
   */
  async requestOTP(data: RequestOtpDto): Promise<ApiResponse<OtpResponseDto>> {
    return apiClient.post<OtpResponseDto>('/auth/request-otp', data);
  }

  /**
   * Verify OTP and get JWT tokens
   */
  async verifyOTP(data: VerifyOtpDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await apiClient.post<AuthResponseDto>('/auth/verify-otp', data);

    // Store tokens if successful
    if (response.data) {
      apiClient.setAccessToken(response.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('refresh_token', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }

    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; expiresIn: number }>> {
    const response = await apiClient.post('/auth/refresh-token', { refreshToken });

    // Update access token if successful
    if (response.data) {
      apiClient.setAccessToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * Logout and revoke refresh token
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

    if (!refreshToken) {
      return {
        error: {
          message: 'No refresh token found',
          statusCode: 400,
        },
        status: 400,
      };
    }

    const response = await apiClient.post('/auth/logout', { refreshToken });

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    apiClient.setAccessToken(null);

    return response;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<AuthResponseDto['user']>> {
    return apiClient.get('/auth/me');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = apiClient.getAccessToken();
    return token !== null;
  }

  /**
   * Get stored user data
   */
  getStoredUser(): AuthResponseDto['user'] | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
}

// Export singleton instance
export const authApi = new AuthApi();
