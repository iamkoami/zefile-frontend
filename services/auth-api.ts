/**
 * Authentication API Service
 * Handles all authentication-related API calls
 *
 * TODO: [SECURITY] Migrate token storage from localStorage to HttpOnly cookies.
 * localStorage tokens are vulnerable to XSS attacks. The backend should set
 * HttpOnly, Secure, SameSite=Strict cookies for access and refresh tokens.
 * Migration is in progress - maintain backward compatibility with localStorage
 * until the backend fully supports cookie-based auth.
 */

import { apiClient, ApiResponse } from './api-client';

export interface RequestOtpDto {
  email: string;
  captchaToken?: string | null;
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
  csrfToken?: string; // CSRF token for state-changing requests
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
   * Tokens are also set as HttpOnly cookies by the backend
   */
  async verifyOTP(data: VerifyOtpDto): Promise<ApiResponse<AuthResponseDto>> {
    const response = await apiClient.post<AuthResponseDto>('/auth/verify-otp', data);

    // Store tokens if successful
    if (response.data) {
      // Store access token for backward compatibility (also in HttpOnly cookie)
      apiClient.setAccessToken(response.data.accessToken);

      // Store CSRF token for state-changing requests
      if (response.data.csrfToken) {
        apiClient.setCsrfToken(response.data.csrfToken);
      }

      if (typeof window !== 'undefined') {
        // Store refresh token for backward compatibility (also in HttpOnly cookie)
        localStorage.setItem('refresh_token', response.data.refreshToken);
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
   * Also clears HttpOnly cookies on the server side
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

    // Send logout request (will clear HttpOnly cookies and optionally revoke refresh token)
    const response = await apiClient.post('/auth/logout', { refreshToken: refreshToken || undefined });

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('csrf_token');
      localStorage.removeItem('user');
    }
    apiClient.setAccessToken(null);
    apiClient.setCsrfToken(null);

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
   * Validates token presence and checks JWT expiry claim
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = apiClient.getAccessToken();
    if (!token) return false;

    // Decode JWT payload to check expiry (no signature verification needed client-side)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && typeof payload.exp === 'number') {
        // exp is in seconds, Date.now() is in milliseconds
        if (Date.now() >= payload.exp * 1000) {
          return false;
        }
      }
    } catch {
      // If token cannot be decoded, treat as invalid
      return false;
    }

    return true;
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      return null;
    }
  }
}

// Export singleton instance
export const authApi = new AuthApi();
