/**
 * API Client Service
 * Handles all HTTP requests to the ZeFile backend
 * Uses HttpOnly cookies for authentication (set by backend)
 * Includes CSRF token for state-changing requests
 *
 * Authentication is cookie-only (HttpOnly, Secure, SameSite).
 * No tokens are stored in localStorage to prevent XSS-based token theft.
 */
import { captureException as sentryCaptureException } from '@/lib/sentry';
import type { DeviceFingerprintPayload } from '@/utils/fingerprint';

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
  /**
   * Seconds the caller must wait before retrying, when the backend knows the number.
   *
   * Story 135.2 code review. A cooldown refusal is the one refusal whose LOCALISED copy needs a
   * value, and the value only existed inside the English message ("Give it 12s, then try
   * again."). Parsing it back out of that prose would make the copy a contract — so it travels
   * as a field beside `code`, and a client that wants "réessayez dans 12 s" can build it.
   *
   * Only `auth.requestOTP`'s cooldown sets it today. Absent everywhere else, which callers must
   * tolerate: fall back to copy that names no number.
   */
  retryAfterSeconds?: number;
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
  private csrfToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private csrfRefreshPromise: Promise<void> | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '600000'); // 10 minutes default for file uploads
  }

  /**
   * Set CSRF token for state-changing requests (in-memory only)
   */
  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  /**
   * Get CSRF token
   */
  getCsrfToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Initialize CSRF token from server (call on app init when user is authenticated)
   */
  async initCsrfToken(): Promise<void> {
    await this.refreshCsrfToken();
  }

  /**
   * Check if method is state-changing (requires CSRF protection)
   */
  private isStateChangingMethod(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  /**
   * Attempt to refresh the access token using the refresh token cookie
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
   * Uses HttpOnly cookie (automatically included by the browser)
   */
  private async doTokenRefresh(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include HttpOnly cookies
        body: JSON.stringify({}),
      });

      if (response.ok) {
        // Refresh CSRF token after successful token refresh
        await this.refreshCsrfToken();
        return true;
      }

      // Only logout on definitive auth rejection (server explicitly says refresh token is invalid).
      // Don't logout on 403 (could be CSRF/permission issue), 5xx, or 429 — those are transient.
      if (response.status === 401) {
        this.handleLogout();
      }
      return false;
    } catch {
      // Network error (server down/restarting) — don't logout, just fail silently.
      // The user's session cookies are still valid and will work when the server is back.
      return false;
    }
  }

  /**
   * Refresh CSRF token from server.
   * If the access token is expired (401), attempts a full token refresh first.
   */
  private async refreshCsrfToken(): Promise<void> {
    // Deduplicate concurrent CSRF refresh calls (e.g., multiple components
    // firing state-changing requests simultaneously on page load)
    if (this.csrfRefreshPromise) {
      return this.csrfRefreshPromise;
    }

    this.csrfRefreshPromise = this.doRefreshCsrfToken();
    try {
      await this.csrfRefreshPromise;
    } finally {
      this.csrfRefreshPromise = null;
    }
  }

  private async doRefreshCsrfToken(): Promise<void> {
    // Skip if user was never logged in — no point fetching CSRF or refreshing tokens
    if (typeof window !== 'undefined' && !localStorage.getItem('user')) {
      return;
    }

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
        return;
      }

      // If 401, the access token may be expired — try a full token refresh.
      // doTokenRefresh() will call refreshCsrfToken() again after getting
      // a new access token, but we guard against infinite recursion via
      // the isRefreshing flag in attemptTokenRefresh().
      if (response.status === 401 && !this.isRefreshing) {
        const refreshed = await this.attemptTokenRefresh();
        // attemptTokenRefresh → doTokenRefresh already calls refreshCsrfToken
        // so csrfToken should now be set if refresh succeeded
        if (!refreshed) {
          // Refresh failed — session truly expired
          this.handleLogout();
        }
      }
    } catch {
      // Silently fail - CSRF refresh is best effort
    }
  }

  /**
   * Handle logout when refresh fails
   */
  handleLogout(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('user');
    this.csrfToken = null;

    // Dispatch event to notify UI about auth state change
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { isAuthenticated: false, reason: 'session_expired' }
    }));

    // Dispatch event to clear all Zustand stores (F-2.2: prevent stale state after logout)
    window.dispatchEvent(new CustomEvent('clear-all-stores'));
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

    // Proactively fetch CSRF token if missing for state-changing requests.
    // initCsrfToken() is fire-and-forget on page load, so the token may not
    // be ready yet if the user acts quickly. Fetching here avoids a guaranteed
    // 403 → retry round-trip on the first state-changing request.
    if (this.isStateChangingMethod(method) && !this.csrfToken) {
      await this.refreshCsrfToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add CSRF token for state-changing requests
    if (this.isStateChangingMethod(method) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken;
    }

    // Add captcha token if set (single-use, consumed immediately)
    const captchaToken = consumeCaptchaToken();
    if (captchaToken) {
      headers['X-Captcha-Token'] = captchaToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Destructure headers out — they're already merged above (line 242-244).
    // Spreading the full options would overwrite the merged headers object.
    const { headers: _optHeaders, ...restOptions } = options;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        credentials: 'include', // Always include HttpOnly cookies
        ...restOptions,
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
            // Retry with refreshed cookies — preserve captcha token for retry
            return this.request<T>(method, endpoint, data, {
              ...options,
              headers: {
                ...(headersObj || {}),
                'X-No-Retry': 'true',
                ...(captchaToken ? { 'X-Captcha-Token': captchaToken } : {}),
              },
            });
          }
        }

        // Handle CSRF token errors
        if (response.status === 403 && responseData?.message?.includes('CSRF')) {
          // Try to get a new CSRF token
          await this.refreshCsrfToken();
          // Retry the request once — preserve captcha token for retry
          if (!isRetry) {
            return this.request<T>(method, endpoint, data, {
              ...options,
              headers: {
                ...(headersObj || {}),
                'X-No-Retry': 'true',
                ...(captchaToken ? { 'X-Captcha-Token': captchaToken } : {}),
              },
            });
          }
        }

        // Report 5xx server errors to Sentry
        if (response.status >= 500) {
          sentryCaptureException(
            new Error(`API ${response.status}: ${method} ${endpoint}`),
            { status: response.status, endpoint, method, responseMessage: responseData?.message }
          );
        }

        return {
          error: {
            message: Array.isArray(responseData?.message)
              ? responseData.message.join('. ')
              : responseData?.message || 'An error occurred',
            statusCode: response.status,
            error: responseData?.error,
            code: responseData?.code,
            retryAfterSeconds:
              typeof responseData?.retryAfterSeconds === "number"
                ? responseData.retryAfterSeconds
                : undefined,
            errorKey: getErrorKey(response.status, Array.isArray(responseData?.message) ? responseData.message[0] : responseData?.message),
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

      // Report network errors to Sentry (indicates real connectivity issues)
      sentryCaptureException(error, { endpoint, method, errorType: 'network' });

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

    // Proactively fetch CSRF token if missing (same rationale as request())
    if (!this.csrfToken) {
      await this.refreshCsrfToken();
    }

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
                // Retry the upload with refreshed cookies
                resolve(await this.upload<T>(endpoint, formData, onProgress, true));
                return;
              }
            }

            // Handle 403 CSRF errors - refresh CSRF token and retry
            if (xhr.status === 403 && responseData?.message?.includes('CSRF') && !isRetry) {
              await this.refreshCsrfToken();
              if (this.csrfToken) {
                resolve(await this.upload<T>(endpoint, formData, onProgress, true));
                return;
              }
            }

            resolve({
              error: {
                message: Array.isArray(responseData?.message)
                  ? responseData.message.join('. ')
                  : responseData?.message || 'Upload failed',
                statusCode: xhr.status,
                error: responseData?.error,
                errorKey: getErrorKey(xhr.status, Array.isArray(responseData?.message) ? responseData.message[0] : responseData?.message),
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

      // Add CSRF token for upload (POST request)
      if (this.csrfToken) {
        xhr.setRequestHeader('X-CSRF-Token', this.csrfToken);
      }

      // Add captcha token if set (single-use, consumed immediately)
      const uploadCaptchaToken = consumeCaptchaToken();
      if (uploadCaptchaToken) {
        xhr.setRequestHeader('X-Captcha-Token', uploadCaptchaToken);
      }

      xhr.send(formData);
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

/**
 * Module-level device fingerprint for persistent header injection.
 * Unlike captcha tokens, fingerprints are NOT consumed after use --
 * they persist for the entire page session.
 */
let deviceFingerprint: string | null = null;

export function setDeviceFingerprint(payload: DeviceFingerprintPayload): void {
  deviceFingerprint = JSON.stringify(payload);
}

export function getStoredDeviceFingerprint(): string | null {
  return deviceFingerprint;
}

/**
 * Module-level captcha token for single-use header injection.
 * Set before a protected API call; the interceptor adds X-Captcha-Token
 * and clears it immediately (one-shot).
 */
let pendingCaptchaToken: string | null = null;

export function setCaptchaToken(token: string | null): void {
  pendingCaptchaToken = token;
}

/**
 * Consume the pending captcha token (returns it and clears).
 * Used internally by the request method.
 */
export function consumeCaptchaToken(): string | null {
  const token = pendingCaptchaToken;
  pendingCaptchaToken = null;
  return token;
}
