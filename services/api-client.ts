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
}

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '600000'); // 10 minutes default for file uploads
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
        return {
          error: {
            message: responseData?.message || 'An error occurred',
            statusCode: response.status,
            error: responseData?.error,
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
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Upload file with FormData
   */
  async upload<T = any>(endpoint: string, formData: FormData, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAccessToken();

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            console.log('[XHR Progress Event]', {
              loaded: e.loaded,
              total: e.total,
              progress: progress.toFixed(2) + '%',
              timestamp: new Date().toISOString()
            });
            onProgress(progress);
          } else {
            console.warn('[XHR Progress Event] Not lengthComputable', e);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        console.log('[XHR Load Event]', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseLength: xhr.responseText?.length,
          timestamp: new Date().toISOString()
        });

        try {
          const responseData = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('[XHR Success]', { status: xhr.status, data: responseData });
            resolve({
              data: responseData,
              status: xhr.status,
            });
          } else {
            console.error('[XHR Error Response]', { status: xhr.status, error: responseData });
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
          console.error('[XHR Parse Error]', error);
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
        console.error('[XHR Error Event]', {
          status: xhr.status,
          readyState: xhr.readyState,
          timestamp: new Date().toISOString()
        });
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
        console.error('[XHR Timeout Event]', {
          timeout: xhr.timeout,
          timestamp: new Date().toISOString()
        });
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

      console.log('[XHR Send]', {
        url,
        timeout: xhr.timeout,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });

      xhr.send(formData);
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
