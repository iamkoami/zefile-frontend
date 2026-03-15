/**
 * Invoices API Service
 * Handles invoice listing and download operations
 */

import { apiClient, ApiResponse } from './api-client';

export enum InvoiceType {
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  SALE_INVOICE = 'SALE_INVOICE',
  PAYOUT_RECEIPT = 'PAYOUT_RECEIPT',
  REFUND_RECEIPT = 'REFUND_RECEIPT',
  SUBSCRIPTION_RECEIPT = 'SUBSCRIPTION_RECEIPT',
  ESCROW_HOLD_RECEIPT = 'ESCROW_HOLD_RECEIPT',
  ESCROW_RELEASE_RECEIPT = 'ESCROW_RELEASE_RECEIPT',
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  userId?: string;
  transactionId?: string;
  withdrawalId?: string;
  refundRequestId?: string;
  fileRequestId?: string;
  fileSize: number;
  currency: string;
  totalMinorUnits: number;
  generatedAt: string;
  createdAt: string;
}

export interface ListInvoicesParams {
  type?: InvoiceType;
  transactionId?: string;
  withdrawalId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedInvoicesResponse {
  data: InvoiceDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DownloadInvoiceResponse {
  downloadUrl: string;
  filename: string;
  expiresIn: number;
}

class InvoicesApi {
  /**
   * List invoices for the current user with optional filters
   */
  async listInvoices(params?: ListInvoicesParams): Promise<ApiResponse<PaginatedInvoicesResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.transactionId) searchParams.set('transactionId', params.transactionId);
    if (params?.withdrawalId) searchParams.set('withdrawalId', params.withdrawalId);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    const endpoint = query ? `/invoices?${query}` : '/invoices';

    return apiClient.get<PaginatedInvoicesResponse>(endpoint);
  }

  /**
   * Get a presigned download URL for an invoice PDF
   */
  async downloadInvoice(id: string): Promise<ApiResponse<DownloadInvoiceResponse>> {
    return apiClient.get<DownloadInvoiceResponse>(`/invoices/${id}/download`);
  }
}

export const invoicesApi = new InvoicesApi();
