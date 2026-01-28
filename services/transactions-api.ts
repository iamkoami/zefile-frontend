/**
 * Transactions API Service
 * Handles all transaction-related API calls
 */

import { apiClient, ApiResponse } from './api-client';

// Transaction status enum (matches backend)
export enum TransactionStatus {
  CREATED = 'created',
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// Payment method enum (matches backend)
export enum PaymentMethod {
  CARD = 'card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
}

// Transaction DTO
export interface TransactionDto {
  id: string;
  amountPaid: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionStatus: TransactionStatus;
  paymentReference?: string;
  transactionDate: string;
  updatedAt?: string;
  // Related entities (populated from backend)
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  transferId?: {
    id: string;
    title?: string;
    shortCode?: string;
    recipientEmails?: string[];
  } | null;
}

// Transaction filters
export interface TransactionFilters {
  period?: 'all' | '7days' | '30days' | '90days' | 'year';
  category?: 'all' | 'payment' | 'refund' | 'payout';
  contact?: string; // email filter
}

class TransactionsApi {
  /**
   * Get all transactions for the current user
   */
  async getMyTransactions(
    userId: string,
    status?: TransactionStatus
  ): Promise<ApiResponse<TransactionDto[]>> {
    const endpoint = status
      ? `/transactions/user/${userId}/status/${status}`
      : `/transactions/user/${userId}`;

    return apiClient.get<TransactionDto[]>(endpoint);
  }

  /**
   * Get successful transactions for the current user (payment history)
   */
  async getPaymentHistory(userId: string): Promise<ApiResponse<TransactionDto[]>> {
    return this.getMyTransactions(userId, TransactionStatus.SUCCESS);
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<ApiResponse<TransactionDto>> {
    return apiClient.get<TransactionDto>(`/transactions/${id}`);
  }

  /**
   * Get transactions for a specific transfer
   */
  async getTransferTransactions(transferId: string): Promise<ApiResponse<TransactionDto[]>> {
    return apiClient.get<TransactionDto[]>(`/transactions/transfer/${transferId}`);
  }
}

export const transactionsApi = new TransactionsApi();
