/**
 * Analytics API Service
 * Handles user analytics dashboard data
 */

import { apiClient, ApiResponse } from './api-client';

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'year' | 'all';

export interface MetricWithDelta {
  value: number;
  previousValue: number;
  percentChange: number | null;
  trend: 'up' | 'down' | 'flat';
}

export interface AnalyticsOverview {
  totalTransfers: number;
  totalDownloads: number;
  totalRevenue: number;
  currency: string;
  avgDownloadsPerTransfer: number;
  totalPageViews: number;
  // Enhanced fields
  totalViews: number;
  conversionRate: number | null;
  totalTransfersDelta: MetricWithDelta;
  totalDownloadsDelta: MetricWithDelta;
  totalViewsDelta: MetricWithDelta;
  totalRevenueDelta: MetricWithDelta;
  conversionRateDelta: MetricWithDelta | null;
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

export interface TopTransfer {
  transferId: string;
  shortCode: string;
  displayName: string;
  recipientCount: number;
  views: number;
  downloads: number;
  conversionRate: number | null;
  revenue: number;
  currency: string;
  createdAt: string;
}

export interface TransferAnalyticsList {
  transfers: (TransferAnalytics | TopTransfer)[];
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
  period: string;
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
  async getOverview(period: AnalyticsPeriod = '7d'): Promise<ApiResponse<AnalyticsOverview>> {
    return apiClient.get<AnalyticsOverview>(`/analytics/overview?period=${period}`);
  },

  /**
   * Get per-transfer analytics for the current user
   */
  async getTransferAnalytics(
    limit = 5,
    offset = 0,
    period: AnalyticsPeriod = '7d',
  ): Promise<ApiResponse<TransferAnalyticsList>> {
    return apiClient.get<TransferAnalyticsList>(
      `/analytics/transfers?limit=${limit}&offset=${offset}&period=${period}`,
    );
  },

  /**
   * Get analytics trends over time
   */
  async getTrends(period: AnalyticsPeriod = '7d'): Promise<ApiResponse<AnalyticsTrends>> {
    return apiClient.get<AnalyticsTrends>(`/analytics/trends?period=${period}`);
  },

  /**
   * Get detailed insights for a specific transfer
   */
  async getTransferInsights(transferId: string): Promise<ApiResponse<TransferInsights>> {
    return apiClient.get<TransferInsights>(`/analytics/transfers/${transferId}/insights`);
  },
};
