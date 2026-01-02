/**
 * Platform Settings API Service
 * Handles platform configuration API calls
 */

import { apiClient, ApiResponse } from './api-client';

export interface PlatformConfig {
  maxUploadSize: number; // in bytes
  serviceChargePercentage: number;
}

export class PlatformApi {
  /**
   * Get public platform configuration
   */
  async getPublicConfig(): Promise<ApiResponse<PlatformConfig>> {
    return apiClient.get<PlatformConfig>('/platform-settings/public/config');
  }
}

// Export singleton instance
export const platformApi = new PlatformApi();
