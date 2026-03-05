/**
 * Analytics API Service
 * Handles user analytics dashboard data
 */

import { apiClient, ApiResponse } from './api-client';

export interface AnalyticsOverview {
  totalTransfers: number;
  totalDownloads: number;
  totalRevenue: number;
  currency: string;
  avgDownloadsPerTransfer: number;
  totalPageViews: number;
}

export interface TransferAnalytics {
  transferId: string;
  shortCode: string;
  title: string;
  views: number;
  downloads: number;
  revenue: number;
  currency: string;
  createdAt: string;
  lastDownloadedAt?: string;
  timeToFirstDownload?: number;
}

export interface TransferAnalyticsList {
  transfers: TransferAnalytics[];
  total: number;
}

export interface TrendDataPoint {
  date: string;
  transfers: number;
  downloads: number;
  revenue: number;
  views: number;
}

export interface TrendTotals {
  transfers: number;
  downloads: number;
  revenue: number;
  views: number;
}

export interface AnalyticsTrends {
  period: 'week' | 'month';
  data: TrendDataPoint[];
  totals: TrendTotals;
}

export interface TimelineEvent {
  type: 'view' | 'download' | 'preview';
  timestamp: string;
  recipientEmail?: string;
  isAnonymous: boolean;
  country?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

export interface RecipientDownload {
  email: string;
  downloadedAt: string;
  downloadCount: number;
}

export interface GeographyStats {
  country: string;
  count: number;
  percentage: number;
}

export interface DeviceStats {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface RecipientView {
  email: string;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  previewCount: number;
  hasPaid: boolean;
}

export interface TransferInsights {
  transferId: string;
  totalViews: number;
  totalDownloads: number;
  totalPreviews: number;
  uniqueVisitors: number;
  timeline: TimelineEvent[];
  recipientDownloads: RecipientDownload[];
  recipientViews: RecipientView[];
  geography: GeographyStats[];
  devices: DeviceStats;
}

export const analyticsApi = {
  /**
   * Get analytics overview for the current user
   */
  async getOverview(): Promise<ApiResponse<AnalyticsOverview>> {
    return apiClient.get<AnalyticsOverview>('/analytics/overview');
  },

  /**
   * Get per-transfer analytics for the current user
   */
  async getTransferAnalytics(
    limit = 20,
    offset = 0,
  ): Promise<ApiResponse<TransferAnalyticsList>> {
    return apiClient.get<TransferAnalyticsList>(
      `/analytics/transfers?limit=${limit}&offset=${offset}`,
    );
  },

  /**
   * Get analytics trends over time
   */
  async getTrends(period: 'week' | 'month' = 'week'): Promise<ApiResponse<AnalyticsTrends>> {
    return apiClient.get<AnalyticsTrends>(`/analytics/trends?period=${period}`);
  },

  /**
   * Get detailed insights for a specific transfer
   */
  async getTransferInsights(transferId: string): Promise<ApiResponse<TransferInsights>> {
    return apiClient.get<TransferInsights>(`/analytics/transfers/${transferId}/insights`);
  },
};
