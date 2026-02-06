/**
 * API Client Service
 * Handles all HTTP requests to the ZeFile backend
 * Uses HttpOnly cookies for authentication (set by backend)
 * Includes CSRF token for state-changing requests
 *
 * TODO: [SECURITY] Complete migration from localStorage JWT tokens to HttpOnly cookies.
 * Currently maintains backward compatibility with localStorage tokens while the backend
 * transitions to cookie-based auth. Once migration is complete, remove all
 * localStorage token operations (getAccessToken, setAccessToken, etc.).
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
  /** Translation key for known error types (e.g. "errors.tooManyRequests"). Use with t() in components. */
  errorKey?: string;
}

/**
 * Detect known technical errors and return a translation key.
 * Components use: t(error.errorKey) || error.message
 */
function getErrorKey(statusCode: number, rawMessage?: string): string | undefined {
  switch (statusCode) {
    case 429: return "errors.tooManyRequests";
    case 500: return "errors.serverError";
    case 502:
    case 503:
    case 504: return "errors.serviceUnavailable";
    case 408: return "errors.timeout";
  }

  if (!rawMessage) return undefined;

  if (/ThrottlerException|too many requests/i.test(rawMessage)) return "errors.tooManyRequests";
  if (/internal server error/i.test(rawMessage)) return "errors.serverError";
  if (/ECONNREFUSED/i.test(rawMessage)) return "errors.connectionFailed";
  if (/ETIMEDOUT/i.test(rawMessage)) return "errors.timeout";

  return undefined;
}

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private accessToken: string | null = null; // Kept for backward compatibility
  private csrfToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '600000'); // 10 minutes default for file uploads

    // Load tokens from localStorage if available (backward compatibility)
    if (typeof window !== 'undefined') {
      this.csrfToken = localStorage.getItem('csrf_token');
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  /**
   * Set CSRF token for state-changing requests
   */
  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('csrf_token', token);
      } else {
        localStorage.removeItem('csrf_token');
      }
    }
  }

  /**
   * Get CSRF token
   */
  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Check if method is state-changing (requires CSRF protection)
   */
  private isStateChangingMethod(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
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
   * Uses HttpOnly cookie (automatically included) or falls back to localStorage token
   */
  private async doTokenRefresh(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Get refresh token from localStorage (backward compatibility)
    const refreshToken = localStorage.getItem('refresh_token');

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include HttpOnly cookies
        // Send refresh token in body for backward compatibility
        body: JSON.stringify({ refreshToken: refreshToken || undefined }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          this.setAccessToken(data.accessToken);
          return true;
        }
        // Even without accessToken in body, cookies may have been updated
        return true;
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
   * Refresh CSRF token from server
   */
  private async refreshCsrfToken(): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/auth/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.csrfToken) {
          this.setCsrfToken(data.csrfToken);
        }
      }
    } catch {
      // Silently fail - CSRF refresh is best effort
    }
  }

  /**
   * Handle logout when refresh fails
   */
  private handleLogout(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('csrf_token');
    localStorage.removeItem('user');
    this.accessToken = null;
    this.csrfToken = null;

    // Dispatch event to notify UI about auth state change
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { isAuthenticated: false, reason: 'session_expired' }
    }));

    // Dispatch event to clear all Zustand stores (F-2.2: prevent stale state after logout)
    window.dispatchEvent(new CustomEvent('clear-all-stores'));
  }

  /**
   * Set access token for authenticated requests (backward compatibility)
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
   * Get access token from memory or localStorage (backward compatibility)
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

    // Add Authorization header for backward compatibility
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token for state-changing requests
    if (this.isStateChangingMethod(method) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        credentials: 'include', // Always include HttpOnly cookies
        ...options,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        // Handle 401 - attempt token refresh and retry
        // Skip retry for auth endpoints (login, refresh) to avoid loops
        const headersObj = options.headers as Record<string, string> | undefined;
        const isRetry = headersObj?.['X-No-Retry'] === 'true';
        const isAuthEndpoint = endpoint.includes('/auth/') && (endpoint.includes('/login') || endpoint.includes('/refresh') || endpoint.includes('/verify'));

        if (response.status === 401 && !isRetry && !isAuthEndpoint) {
          const refreshed = await this.attemptTokenRefresh();
          if (refreshed) {
            // Retry the original request with new token
            return this.request<T>(method, endpoint, data, {
              ...options,
              headers: { ...(headersObj || {}), 'X-No-Retry': 'true' },
            });
          }
        }

        // Handle CSRF token errors
        if (response.status === 403 && responseData?.message?.includes('CSRF')) {
          // Try to get a new CSRF token
          await this.refreshCsrfToken();
          // Retry the request once
          if (!isRetry) {
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
            errorKey: getErrorKey(response.status, responseData?.message),
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
            message: 'Request timeout',
            statusCode: 408,
            errorKey: 'errors.timeout',
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
          message: error.message || 'Network error',
          statusCode: 0,
          errorKey: isConnectionError ? 'errors.connectionFailed' : undefined,
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
            if (xhr.status === 401 && !isRetry) {
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
                errorKey: getErrorKey(xhr.status, responseData?.message),
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
            message: 'Connection error',
            statusCode: 0,
            errorKey: 'errors.connectionFailed',
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
            errorKey: 'errors.timeout',
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

      // Include cookies for authentication
      xhr.withCredentials = true;

      // Add Authorization header for backward compatibility
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Add CSRF token for upload (POST request)
      if (this.csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', this.csrfToken);
      }

      xhr.send(formData);
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
