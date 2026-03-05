/**
 * Branding API Service
 * Handles branding profile CRUD for STARTER/PRO users (Epic 57)
 */

import { apiClient, ApiResponse } from './api-client';

export interface BrandingProfileDto {
  id: string;
  userId: string;
  companyName: string | null;
  primaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  buttonTextColor: string | null;
  showPoweredByZefile: boolean;
  logoUrl: string | null;
  faviconUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface UpsertBrandingDto {
  companyName?: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  showPoweredByZefile?: boolean;
}

class BrandingApi {
  async getProfile(): Promise<ApiResponse<BrandingProfileDto | null>> {
    return apiClient.get('/branding/profile');
  }

  async upsertProfile(dto: UpsertBrandingDto): Promise<ApiResponse<BrandingProfileDto>> {
    return apiClient.put('/branding/profile', dto);
  }

  async uploadLogo(file: File): Promise<ApiResponse<BrandingProfileDto>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/branding/profile/logo', formData);
  }

  async uploadFavicon(file: File): Promise<ApiResponse<BrandingProfileDto>> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/branding/profile/favicon', formData);
  }

  async deleteLogo(): Promise<ApiResponse<BrandingProfileDto>> {
    return apiClient.delete('/branding/profile/logo');
  }

  async deleteFavicon(): Promise<ApiResponse<BrandingProfileDto>> {
    return apiClient.delete('/branding/profile/favicon');
  }
}

export const brandingApi = new BrandingApi();
