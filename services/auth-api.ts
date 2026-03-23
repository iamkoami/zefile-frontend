/**
 * Authentication API Service
 * Handles all authentication-related API calls
 *
 * Authentication uses HttpOnly cookies (set by backend).
 * No tokens are stored in localStorage to prevent XSS-based token theft.
 * Only non-sensitive user profile data is stored in localStorage.
 */

import { apiClient, ApiResponse } from './api-client';

export interface RequestOtpDto {
  email?: string;
  identifier?: string;
  captchaToken?: string | null;
}

export interface OtpResponseDto {
  message: string;
  isNewUser: boolean;
  email?: string;
}

export interface VerifyOtpDto {
  email: string;
  otp: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  csrfToken?: string; // CSRF token for state-changing requests
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    accountType: 'sender' | 'recipient' | 'both';
    state: string;
    needsLegalConsent: boolean;
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
   * Tokens are set as HttpOnly cookies by the backend
   */
  async verifyOTP(data: VerifyOtpDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await apiClient.post<AuthResponseDto>('/auth/verify-otp', data);

    if (response.data) {
      // Store CSRF token in memory for state-changing requests
      if (response.data.csrfToken) {
        apiClient.setCsrfToken(response.data.csrfToken);
      }

      if (typeof window !== 'undefined') {
        // Store non-sensitive user profile data only
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // Dispatch custom event to notify components (e.g., Header) about auth state change
        window.dispatchEvent(new CustomEvent('auth-state-change', {
          detail: { isAuthenticated: true, user: response.data.user }
        }));
      }
    }

    return response;
  }

  /**
   * Refresh access token using HttpOnly cookie
   */
  async refreshToken(): Promise<ApiResponse<{ accessToken: string; expiresIn: number }>> {
    const response = await apiClient.post('/auth/refresh-token', {});

    // Refresh CSRF token after successful token refresh
    if (response.data) {
      await apiClient.initCsrfToken();
    }

    return response;
  }

  /**
   * Logout and revoke refresh token
   * Backend clears HttpOnly cookies
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    // Send logout request (backend reads refresh token from cookie and clears cookies)
    const response = await apiClient.post('/auth/logout', {});

    // Clear non-sensitive local data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
    apiClient.setCsrfToken(null);

    // Notify all stores to clear their state
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('clear-all-stores'));
    }

    return response;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<ApiResponse<AuthResponseDto['user']>> {
    return apiClient.get('/auth/me');
  }

  /**
   * Check if user appears to be authenticated
   * Uses presence of stored user data as a hint (actual auth is server-side via cookies)
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return this.getStoredUser() !== null;
  }

  /**
   * Verify authentication with the server
   * Returns true if the user's cookies are valid
   */
  async verifyAuth(): Promise<boolean> {
    const response = await this.getCurrentUser();
    if (response.data) {
      // Update stored user data
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      return true;
    }
    // Rate-limited or server error — don't invalidate a valid session,
    // trust cached user data instead of forcing logout
    if (response.status === 429 || response.status >= 500 || response.status === 0) {
      return this.getStoredUser() !== null;
    }
    return false;
  }

  /**
   * Get stored user data
   */
  getStoredUser(): AuthResponseDto['user'] | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      // Clear corrupted user data
      localStorage.removeItem('user');
      return null;
    }
  }
}

// Export singleton instance
export const authApi = new AuthApi();
