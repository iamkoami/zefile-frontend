/**
 * Admin API Service
 * Handles all admin-related API calls with separate authentication
 */

import { ApiResponse, ApiError } from './api-client';

// Admin Types
export interface Admin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export enum AdminRole {
  SUPPORT = 'SUPPORT',
  MODERATOR = 'MODERATOR',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum AdminStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: Admin;
  mustChangePassword: boolean;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// Transfer Types
export interface TransferSearchQuery {
  search?: string;
  status?: string;
  senderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface TransferListItem {
  id: string;
  shortCode: string;
  title: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  fileCount: number;
  totalSize: number;
  sender: {
    id: string;
    email: string;
  };
  payment?: {
    amount: number;
    currency: string;
    status: string;
  };
}

export interface TransferDetails {
  id: string;
  shortCode: string;
  title: string;
  message?: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  sender: {
    email: string;
    status: string;
    kycStatus: string;
  };
  recipients: Array<{
    email: string;
    hasDownloaded: boolean;
    downloadedAt?: string;
  }>;
  payment?: {
    amount: number;
    currency: string;
    status: string;
    paidAt?: string;
  };
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

// User Types
export interface UserSearchQuery {
  email?: string;
  phone?: string;
  status?: string;
  kycStatus?: string;
  page?: number;
  limit?: number;
}

export interface UserListItem {
  id: string;
  email: string;
  status: string;
  tier: string;
  kycStatus: string;
  createdAt: string;
  lastActiveAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  status: string;
  tier: string;
  kycStatus: string;
  createdAt: string;
  lastActiveAt?: string;
  stats: {
    transfersSent: number;
    transfersReceived: number;
    totalReceived: number;
    totalPaidOut: number;
  };
}

export interface SuspendUserDto {
  reason: string;
  note: string;
}

export interface UnsuspendUserDto {
  note: string;
}

// Dispute Types
export enum DisputeStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  REFUND_REQUESTED = 'refund_requested',
  ACCOUNT_ACTION = 'account_action',
}

export interface DisputeListQuery {
  status?: DisputeStatus;
  page?: number;
  limit?: number;
}

export interface DisputeListItem {
  id: string;
  status: DisputeStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
  transfer: {
    id: string;
    shortCode: string;
    title: string;
  };
  notesCount: number;
}

export interface DisputeDetails {
  id: string;
  status: DisputeStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
  transfer: TransferDetails;
  notes: DisputeNote[];
  timeline: TimelineEvent[];
}

export interface DisputeNote {
  id: string;
  content: string;
  createdAt: string;
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface TimelineEvent {
  type: string;
  timestamp: string;
  description: string;
  actor?: string;
}

export interface AddDisputeNoteDto {
  content: string;
}

export interface UpdateDisputeStatusDto {
  status: DisputeStatus;
  note?: string;
}

// Audit Log Types
export interface AuditLogQuery {
  startDate?: string;
  endDate?: string;
  adminId?: string;
  actionType?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogEntry {
  id: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

// Poll Types
export type PollType = 'single_choice' | 'multiple_choice';
export type PollStatus = 'draft' | 'active' | 'paused' | 'closed' | 'archived';
export type PollTriggerType =
  | 'manual'
  | 'after_transfer'
  | 'after_download'
  | 'after_payment'
  | 'on_login'
  | 'scheduled'
  | 'after_n_days_signup'
  | 'after_n_transfers'
  | 'after_subscription_upgrade';
export type DisplayFrequency = 'once' | 'daily' | 'weekly' | 'always';
export type AccountAgeTarget = 'new' | 'established';
export type ActivityLevelTarget = 'active' | 'inactive' | 'power_user' | 'dormant';

export interface PollOption {
  id?: string;
  text: string;
  emoji?: string;
  displayOrder: number;
  voteCount?: number;
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  type: PollType;
  status: PollStatus;
  options: PollOption[];
  allowOther: boolean;
  showAnonymousBadge: boolean;
  showVoteCounts: boolean;
  // Scheduling
  startAt?: string;
  endAt?: string;
  displayFrequency: DisplayFrequency;
  maxResponses?: number;
  // Triggers
  triggerType: PollTriggerType;
  triggerDelaySeconds: number;
  triggerValue?: number;
  // Targeting
  targetAllUsers: boolean;
  targetTiers?: string[];
  targetCountries?: string[];
  targetMinTransfers?: number;
  targetMaxTransfers?: number;
  targetAccountAge?: AccountAgeTarget;
  targetActivityLevel?: ActivityLevelTarget;
  // Stats
  totalResponses: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
}

export interface CreatePollDto {
  question: string;
  description?: string;
  type: PollType;
  options: Omit<PollOption, 'id' | 'voteCount'>[];
  allowOther?: boolean;
  showAnonymousBadge?: boolean;
  showVoteCounts?: boolean;
}

export interface UpdatePollDto {
  question?: string;
  description?: string;
  type?: PollType;
  options?: Omit<PollOption, 'id' | 'voteCount'>[];
  allowOther?: boolean;
  showAnonymousBadge?: boolean;
  showVoteCounts?: boolean;
}

export interface PollScheduleDto {
  startAt?: string;
  endAt?: string;
  displayFrequency?: DisplayFrequency;
  maxResponses?: number;
}

export interface PollTriggerDto {
  triggerType: PollTriggerType;
  triggerDelaySeconds?: number;
  triggerValue?: number;
}

export interface PollTargetingDto {
  targetAllUsers?: boolean;
  targetTiers?: string[];
  targetCountries?: string[];
  targetMinTransfers?: number;
  targetMaxTransfers?: number;
  targetAccountAge?: AccountAgeTarget;
  targetActivityLevel?: ActivityLevelTarget;
}

export interface PollResultsDto {
  pollId: string;
  question: string;
  totalResponses: number;
  optionResults: {
    optionId: string;
    text: string;
    emoji?: string;
    voteCount: number;
    percentage: number;
  }[];
  otherResponses?: string[];
  countryBreakdown?: { key: string; count: number; percentage: number }[];
  tierBreakdown?: { key: string; count: number; percentage: number }[];
  platformBreakdown?: { key: string; count: number; percentage: number }[];
}

export interface PollListQuery {
  status?: PollStatus;
  search?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

// Country list for targeting
export const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'CI', name: 'Côte d\'Ivoire' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'TG', name: 'Togo' },
  { code: 'BJ', name: 'Benin' },
  { code: 'ML', name: 'Mali' },
  { code: 'BF', name: 'Burkina Faso' },
];

// Activity level options with descriptions
export const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'active', label: 'Active', description: 'Transfer in last 7 days' },
  { value: 'inactive', label: 'Inactive', description: 'No transfer in last 7 days' },
  { value: 'power_user', label: 'Power User', description: '10+ transfers in last 30 days' },
  { value: 'dormant', label: 'Dormant', description: 'No transfer in last 30 days' },
];

// Dashboard Types
export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    suspended: number;
    pendingKyc: number;
  };
  transfers: {
    total: number;
    activeToday: number;
    completedToday: number;
    expiredToday: number;
  };
  payments: {
    totalRevenue: number;
    revenueToday: number;
    pendingPayouts: number;
  };
  disputes: {
    open: number;
    underReview: number;
    resolvedToday: number;
  };
}

// Paginated Response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class AdminApiClient {
  private baseURL: string;
  private timeout: number;
  private accessToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.timeout = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000');
  }

  /**
   * Set admin access token
   */
  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('admin_access_token', token);
      } else {
        localStorage.removeItem('admin_access_token');
      }
    }
  }

  /**
   * Get admin access token
   */
  getAccessToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_access_token');
    }
    return null;
  }

  /**
   * Clear admin session
   */
  clearSession() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
    }
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
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
        // Handle 401 - session expired
        if (response.status === 401) {
          this.clearSession();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('admin-session-expired'));
          }
        }

        return {
          error: {
            message: responseData?.message || 'An error occurred',
            statusCode: response.status,
            error: responseData?.error,
          } as ApiError,
          status: response.status,
        };
      }

      return {
        data: responseData,
        status: response.status,
      };
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const err = error as { name?: string; message?: string };
      if (err.name === 'AbortError') {
        return {
          error: {
            message: 'Request timeout. Please try again.',
            statusCode: 408,
          } as ApiError,
          status: 408,
        };
      }

      return {
        error: {
          message: err.message || 'Network error',
          statusCode: 0,
        } as ApiError,
        status: 0,
      };
    }
  }

  private async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  private async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  private async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data);
  }

  // ============ Authentication ============

  async login(data: AdminLoginDto): Promise<ApiResponse<AdminLoginResponse>> {
    const response = await this.post<AdminLoginResponse>('/admin/auth/login', data);

    if (response.data) {
      this.setAccessToken(response.data.accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_refresh_token', response.data.refreshToken);
        localStorage.setItem('admin_user', JSON.stringify(response.data.admin));
      }
    }

    return response;
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('admin_refresh_token')
      : null;

    const response = await this.post<{ message: string }>('/admin/auth/logout', { refreshToken });
    this.clearSession();
    return response;
  }

  async changePassword(data: ChangePasswordDto): Promise<ApiResponse<{ message: string }>> {
    return this.post('/admin/auth/change-password', data);
  }

  async getProfile(): Promise<ApiResponse<Admin>> {
    return this.get('/admin/auth/profile');
  }

  getStoredAdmin(): Admin | null {
    if (typeof window === 'undefined') return null;
    const adminStr = localStorage.getItem('admin_user');
    if (!adminStr) return null;
    try {
      return JSON.parse(adminStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // ============ Dashboard ============

  async getDashboardMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    return this.get('/admin/dashboard/metrics');
  }

  // ============ Transfers ============

  async searchTransfers(query: TransferSearchQuery): Promise<ApiResponse<PaginatedResponse<TransferListItem>>> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.status) params.append('status', query.status);
    if (query.senderId) params.append('senderId', query.senderId);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    return this.get(`/admin/transfers?${params.toString()}`);
  }

  async getTransferDetails(transferId: string): Promise<ApiResponse<TransferDetails>> {
    return this.get(`/admin/transfers/${transferId}`);
  }

  // ============ Users ============

  async searchUsers(query: UserSearchQuery): Promise<ApiResponse<PaginatedResponse<UserListItem>>> {
    const params = new URLSearchParams();
    if (query.email) params.append('email', query.email);
    if (query.phone) params.append('phone', query.phone);
    if (query.status) params.append('status', query.status);
    if (query.kycStatus) params.append('kycStatus', query.kycStatus);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    return this.get(`/admin/users?${params.toString()}`);
  }

  async getUserProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.get(`/admin/users/${userId}`);
  }

  async suspendUser(userId: string, data: SuspendUserDto): Promise<ApiResponse<{ message: string }>> {
    return this.post(`/admin/users/${userId}/suspend`, data);
  }

  async unsuspendUser(userId: string, data: UnsuspendUserDto): Promise<ApiResponse<{ message: string }>> {
    return this.post(`/admin/users/${userId}/unsuspend`, data);
  }

  // ============ Disputes ============

  async listDisputes(query: DisputeListQuery): Promise<ApiResponse<PaginatedResponse<DisputeListItem>>> {
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    return this.get(`/admin/disputes?${params.toString()}`);
  }

  async getDisputeDetails(disputeId: string): Promise<ApiResponse<DisputeDetails>> {
    return this.get(`/admin/disputes/${disputeId}`);
  }

  async addDisputeNote(disputeId: string, data: AddDisputeNoteDto): Promise<ApiResponse<DisputeNote>> {
    return this.post(`/admin/disputes/${disputeId}/notes`, data);
  }

  async updateDisputeStatus(disputeId: string, data: UpdateDisputeStatusDto): Promise<ApiResponse<{ message: string }>> {
    return this.patch(`/admin/disputes/${disputeId}/status`, data);
  }

  // ============ Audit Logs ============

  async getAuditLogs(query: AuditLogQuery): Promise<ApiResponse<PaginatedResponse<AuditLogEntry>>> {
    const params = new URLSearchParams();
    if (query.startDate) params.append('startDate', query.startDate);
    if (query.endDate) params.append('endDate', query.endDate);
    if (query.adminId) params.append('adminId', query.adminId);
    if (query.actionType) params.append('actionType', query.actionType);
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    return this.get(`/admin/audit-logs?${params.toString()}`);
  }

  // ============ Admin Management ============

  async listAdmins(): Promise<ApiResponse<Admin[]>> {
    return this.get('/admin/management');
  }

  async createAdmin(data: { email: string; firstName: string; lastName: string; role: AdminRole }): Promise<ApiResponse<Admin>> {
    return this.post('/admin/management', data);
  }

  // ============ Polls ============

  async listPolls(query: PollListQuery): Promise<ApiResponse<PaginatedResponse<Poll>>> {
    const params = new URLSearchParams();
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.includeArchived) params.append('includeArchived', 'true');
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());

    return this.get(`/admin/polls?${params.toString()}`);
  }

  async getPoll(pollId: string): Promise<ApiResponse<Poll>> {
    return this.get(`/admin/polls/${pollId}`);
  }

  async createPoll(data: CreatePollDto): Promise<ApiResponse<Poll>> {
    return this.post('/admin/polls', data);
  }

  async updatePoll(pollId: string, data: UpdatePollDto): Promise<ApiResponse<Poll>> {
    return this.patch(`/admin/polls/${pollId}`, data);
  }

  async deletePoll(pollId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete(`/admin/polls/${pollId}`);
  }

  async publishPoll(pollId: string, schedule?: PollScheduleDto): Promise<ApiResponse<Poll>> {
    return this.post(`/admin/polls/${pollId}/publish`, schedule || {});
  }

  async pausePoll(pollId: string): Promise<ApiResponse<Poll>> {
    return this.post(`/admin/polls/${pollId}/pause`, {});
  }

  async resumePoll(pollId: string): Promise<ApiResponse<Poll>> {
    return this.post(`/admin/polls/${pollId}/resume`, {});
  }

  async closePoll(pollId: string): Promise<ApiResponse<Poll>> {
    return this.post(`/admin/polls/${pollId}/close`, {});
  }

  async archivePoll(pollId: string): Promise<ApiResponse<Poll>> {
    return this.post(`/admin/polls/${pollId}/archive`, {});
  }

  async setPollTrigger(pollId: string, data: PollTriggerDto): Promise<ApiResponse<Poll>> {
    return this.patch(`/admin/polls/${pollId}/trigger`, data);
  }

  async setPollTargeting(pollId: string, data: PollTargetingDto): Promise<ApiResponse<Poll>> {
    return this.patch(`/admin/polls/${pollId}/targeting`, data);
  }

  async getPollResults(pollId: string): Promise<ApiResponse<PollResultsDto>> {
    return this.get(`/admin/polls/${pollId}/results`);
  }
}

// Export singleton instance
export const adminApi = new AdminApiClient();
