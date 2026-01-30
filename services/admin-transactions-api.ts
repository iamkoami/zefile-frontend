/**
 * Admin Transactions API Service
 * Handles admin operations for viewing all platform transactions
 * Story 14-14: Admin Transactions List (Read-Only) with Filters & Export
 */

import { apiClient, ApiResponse } from './api-client';

// ============================================
// ENUMS
// ============================================

export enum TransactionStatus {
  CREATED = 'created',
  CANCELED = 'canceled',
  SUCCESS = 'success',
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentMethod {
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum Currency {
  XOF = 'XOF',
  XAF = 'XAF',
  GHS = 'GHS',
  NGN = 'NGN',
  KES = 'KES',
  USD = 'USD',
}

// ============================================
// TYPES
// ============================================

/**
 * Transaction user info
 */
export interface TransactionUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Transaction transfer info
 */
export interface TransactionTransfer {
  id: string;
  title: string;
  shortCode?: string;
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  user: TransactionUser;
  transferId: TransactionTransfer | null;
  amountPaid: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  transactionStatus: TransactionStatus;
  paymentReference?: string;
  paymentAccessCode?: string;
  transactionDate: string;
  updatedAt?: string;
}

/**
 * Transaction filters
 */
export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  currency?: Currency;
  userEmail?: string;
  minAmount?: number;
  maxAmount?: number;
  reference?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated transactions response
 */
export interface PaginatedTransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Transaction stats response
 */
export interface TransactionStatsResponse {
  totalCount: number;
  totalVolume: number;
  byType: {
    payments: { count: number; volume: number };
    payouts: { count: number; volume: number };
    refunds: { count: number; volume: number };
  };
  byStatus: Record<string, number>;
}

// ============================================
// STATUS DISPLAY CONFIGURATION
// ============================================

export const TRANSACTION_STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; color: string; bgColor: string }
> = {
  [TransactionStatus.CREATED]: {
    label: 'Created',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  [TransactionStatus.PENDING]: {
    label: 'Pending',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  [TransactionStatus.SUCCESS]: {
    label: 'Success',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  [TransactionStatus.COMPLETED]: {
    label: 'Completed',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  [TransactionStatus.CANCELED]: {
    label: 'Canceled',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  [TransactionStatus.FAILED]: {
    label: 'Failed',
    color: '#DC2626',
    bgColor: '#FEE2E2',
  },
};

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: string }> = {
  [PaymentMethod.CARD]: {
    label: 'Card',
    icon: 'CreditCard',
  },
  [PaymentMethod.MOBILE_MONEY]: {
    label: 'Mobile Money',
    icon: 'Smartphone',
  },
  [PaymentMethod.BANK_TRANSFER]: {
    label: 'Bank Transfer',
    icon: 'Building',
  },
};

// ============================================
// API CLASS
// ============================================

class AdminTransactionsApi {
  /**
   * Get transaction statistics
   */
  async getStats(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<TransactionStatsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);

    const queryString = queryParams.toString();
    const url = `/admin/transactions/stats${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<TransactionStatsResponse>(url);
  }

  /**
   * List transactions with filters
   */
  async listTransactions(
    filters?: TransactionFilters
  ): Promise<ApiResponse<PaginatedTransactionsResponse>> {
    const queryParams = new URLSearchParams();

    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
    if (filters?.currency) queryParams.append('currency', filters.currency);
    if (filters?.userEmail) queryParams.append('userEmail', filters.userEmail);
    if (filters?.minAmount !== undefined) queryParams.append('minAmount', filters.minAmount.toString());
    if (filters?.maxAmount !== undefined) queryParams.append('maxAmount', filters.maxAmount.toString());
    if (filters?.reference) queryParams.append('reference', filters.reference);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());

    const queryString = queryParams.toString();
    const url = `/admin/transactions${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<PaginatedTransactionsResponse>(url);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return apiClient.get<Transaction>(`/admin/transactions/${id}`);
  }

  /**
   * Export transactions to CSV
   * Returns the download URL or triggers download
   */
  async exportToCsv(filters?: Omit<TransactionFilters, 'page' | 'limit'>): Promise<void> {
    const queryParams = new URLSearchParams();

    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.paymentMethod) queryParams.append('paymentMethod', filters.paymentMethod);
    if (filters?.currency) queryParams.append('currency', filters.currency);
    if (filters?.userEmail) queryParams.append('userEmail', filters.userEmail);
    if (filters?.minAmount !== undefined) queryParams.append('minAmount', filters.minAmount.toString());
    if (filters?.maxAmount !== undefined) queryParams.append('maxAmount', filters.maxAmount.toString());

    const queryString = queryParams.toString();
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/transactions/export/csv${queryString ? `?${queryString}` : ''}`;

    // Trigger download in new window/tab
    window.open(url, '_blank');
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Format amount from minor units
   */
  formatAmount(minorUnits: number, currency: string): string {
    const amount = minorUnits / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Get status display config
   */
  getStatusConfig(status: TransactionStatus) {
    return TRANSACTION_STATUS_CONFIG[status] || TRANSACTION_STATUS_CONFIG[TransactionStatus.PENDING];
  }

  /**
   * Get payment method config
   */
  getPaymentMethodConfig(method: PaymentMethod) {
    return PAYMENT_METHOD_CONFIG[method] || PAYMENT_METHOD_CONFIG[PaymentMethod.MOBILE_MONEY];
  }
}

export const adminTransactionsApi = new AdminTransactionsApi();
