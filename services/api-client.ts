/**
 * API Client Service
 * Handles all HTTP requests to the ZeFile backend
 */

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
  status: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  code?: string;
}

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private accessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '600000'); // 10 minutes default for file uploads
  }

  /**
   * Attempt to refresh the access token using the refresh token
   * Returns true if refresh succeeded, false otherwise
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doTokenRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async doTokenRefresh(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.handleLogout();
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          this.setAccessToken(data.accessToken);
          return true;
        }
      }

      // Refresh failed - logout user
      this.handleLogout();
      return false;
    } catch {
      this.handleLogout();
      return false;
    }
  }

  /**
   * Handle logout when refresh fails
   */
  private handleLogout(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.accessToken = null;

    // Dispatch event to notify UI about auth state change
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { isAuthenticated: false, reason: 'session_expired' }
    }));
  }

  /**
   * Set access token for authenticated requests
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
    }
  }

  /**
   * Get access token from memory or localStorage
   */
  getAccessToken(): string | null {
    if (this.accessToken) {
      return this.accessToken;
    }
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  /**
   * Make HTTP request
   */
  private async request<T = any>(
    method: string,
    endpoint: string,
    data?: any,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle 401 - attempt token refresh and retry
        const headersObj = options.headers as Record<string, string> | undefined;
        const isRetry = headersObj?.['X-No-Retry'] === 'true';

        if (response.status === 401 && token && !isRetry) {
          const refreshed = await this.attemptTokenRefresh();
          if (refreshed) {
            // Retry the original request with new token
            return this.request<T>(method, endpoint, data, {
              ...options,
              headers: { ...(headersObj || {}), 'X-No-Retry': 'true' },
            });
          }
        }

        return {
          error: {
            message: responseData?.message || 'An error occurred',
            statusCode: response.status,
            error: responseData?.error,
            code: responseData?.code,
          },
          status: response.status,
        };
      }

      return {
        data: responseData,
        status: response.status,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return {
          error: {
            message: 'Request timeout. Please try again.',
            statusCode: 408,
          },
          status: 408,
        };
      }

      // Network error - likely backend is down or unreachable
      const isConnectionError = error.message?.includes('fetch') ||
                               error.message?.includes('Failed to fetch') ||
                               !error.message;

      return {
        error: {
          message: isConnectionError
            ? 'Unable to connect to the server. Please check your connection and try again.'
            : error.message || 'Network error',
          statusCode: 0,
        },
        status: 0,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Upload file with FormData
   */
  async upload<T = any>(endpoint: string, formData: FormData, onProgress?: (progress: number) => void, isRetry: boolean = false): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAccessToken();

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', async () => {
        try {
          const responseData = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              data: responseData,
              status: xhr.status,
            });
          } else {
            // Handle 401 - attempt token refresh and retry
            if (xhr.status === 401 && token && !isRetry) {
              const refreshed = await this.attemptTokenRefresh();
              if (refreshed) {
                // Retry the upload with new token
                resolve(await this.upload<T>(endpoint, formData, onProgress, true));
                return;
              }
            }

            resolve({
              error: {
                message: responseData?.message || 'Upload failed',
                statusCode: xhr.status,
                error: responseData?.error,
              },
              status: xhr.status,
            });
          }
        } catch (error) {
          resolve({
            error: {
              message: 'Failed to parse response',
              statusCode: xhr.status,
            },
            status: xhr.status,
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        resolve({
          error: {
            message: 'Unable to connect to the server. Please check your connection and try again.',
            statusCode: 0,
          },
          status: 0,
        });
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        resolve({
          error: {
            message: 'Request timeout',
            statusCode: 408,
          },
          status: 408,
        });
      });

      xhr.open('POST', url);
      // For file uploads, use a very long timeout (60 minutes) to account for:
      // 1. Upload to backend
      // 2. Backend processing and upload to S3
      // 3. Large files or slow connections
      xhr.timeout = 3600000; // 60 minutes

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
