/**
 * Referrals API Service
 * Handles all referral-related API calls
 */

import { apiClient, ApiResponse } from './api-client';

export interface ReferralStats {
  invitedCount: number;
  activeCount: number;
  completedCount: number;
  earnedPerCurrency: { currency: string; totalMinorUnits: number }[];
}

export interface ReferralHistoryItem {
  maskedEmail: string;
  paidTransferCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  createdAt: string;
}

export interface ReferralHistoryResponse {
  data: ReferralHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReferralMyCode {
  code: string;
  shareUrl: string;
}

export interface ShareMessage {
  whatsapp: string;
  twitter: string;
  email: { subject: string; body: string };
}

export interface ApplyCodeResult {
  id: string;
  referrerId: string;
  refereeId: string;
  referralCode: string;
  status: 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';
  paidTransferCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateCodeResult {
  valid: boolean;
  referrerName?: string;
}

export class ReferralsApi {
  /**
   * Get the authenticated user's referral code and share URL
   */
  async getMyCode(): Promise<ApiResponse<ReferralMyCode>> {
    return apiClient.get<ReferralMyCode>('/referrals/my-code');
  }

  /**
   * Get referral stats for the authenticated user
   */
  async getStats(): Promise<ApiResponse<ReferralStats>> {
    return apiClient.get<ReferralStats>('/referrals/stats');
  }

  /**
   * Get paginated referral history for the authenticated user
   */
  async getHistory(page: number = 1, limit: number = 20): Promise<ApiResponse<ReferralHistoryResponse>> {
    return apiClient.get<ReferralHistoryResponse>(`/referrals/history?page=${page}&limit=${limit}`);
  }

  /**
   * Validate a referral code (public, no auth required)
   */
  async validateCode(code: string): Promise<ApiResponse<ValidateCodeResult>> {
    return apiClient.get<ValidateCodeResult>(`/referrals/validate/${encodeURIComponent(code)}`);
  }

  /**
   * Apply a referral code to the authenticated user's account
   */
  async applyCode(code: string): Promise<ApiResponse<ApplyCodeResult>> {
    return apiClient.post<ApplyCodeResult>('/referrals/apply', { code });
  }

  /**
   * Get AI-generated share messages for referral sharing.
   */
  async getShareMessage(): Promise<ApiResponse<ShareMessage>> {
    return apiClient.get<ShareMessage>('/referrals/share-message');
  }

  /**
   * Get AI-generated insight about referral performance.
   * Returns null body when no insight is available.
   */
  async getAiInsight(): Promise<ApiResponse<{ insight: string }>> {
    return apiClient.get<{ insight: string }>('/referrals/ai-insight');
  }
}

export const referralsApi = new ReferralsApi();
