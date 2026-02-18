/**
 * Custom Domain API Service
 * Handles custom domain management for STARTER/PRO users
 */

import { apiClient, ApiResponse } from './api-client';

export type CustomDomainStatus =
  | 'pending_verification'
  | 'dns_verified'
  | 'provisioning_ssl'
  | 'active'
  | 'ssl_error'
  | 'suspended'
  | 'removed';

export interface BrandingConfig {
  companyName: string;
  primaryColor: string;
  backgroundColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  showPoweredByZefile: boolean;
}

export interface CustomDomainDto {
  id: string;
  domain: string;
  status: CustomDomainStatus;
  verificationToken: string;
  verificationAttempts: number;
  lastVerificationAt: string | null;
  cloudflareHostnameId: string | null;
  sslStatus: string | null;
  brandingConfig: BrandingConfig | null;
  logoS3Key: string | null;
  faviconS3Key: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DnsInstructions {
  cnameHost: string;
  cnameTarget: string;
  txtHost: string;
  txtValue: string;
}

export interface VerificationResult {
  success: boolean;
  status: CustomDomainStatus;
  message?: string;
  dnsInstructions?: DnsInstructions;
}

export interface DomainStatusResult {
  status: CustomDomainStatus;
  sslStatus: string | null;
  cloudflareHostnameId: string | null;
}

class CustomDomainApi {
  /**
   * Add a new custom domain
   */
  async addDomain(domain: string): Promise<ApiResponse<CustomDomainDto & { dnsInstructions: DnsInstructions }>> {
    return apiClient.post('/custom-domains', { domain });
  }

  /**
   * Get current user's custom domain (or null)
   */
  async getUserDomain(): Promise<ApiResponse<CustomDomainDto | null>> {
    return apiClient.get('/custom-domains');
  }

  /**
   * Verify domain DNS records
   */
  async verifyDomain(domainId: string): Promise<ApiResponse<VerificationResult>> {
    return apiClient.post(`/custom-domains/${domainId}/verify`);
  }

  /**
   * Update branding configuration
   */
  async updateBranding(domainId: string, config: BrandingConfig): Promise<ApiResponse<CustomDomainDto>> {
    return apiClient.put(`/custom-domains/${domainId}/branding`, config);
  }

  /**
   * Upload logo image (max 1MB, PNG/JPG/SVG)
   */
  async uploadLogo(domainId: string, file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    const formData = new FormData();
    formData.append('logo', file);
    return apiClient.post(`/custom-domains/${domainId}/logo`, formData);
  }

  /**
   * Upload favicon (max 100KB, PNG/ICO)
   */
  async uploadFavicon(domainId: string, file: File): Promise<ApiResponse<{ faviconUrl: string }>> {
    const formData = new FormData();
    formData.append('favicon', file);
    return apiClient.post(`/custom-domains/${domainId}/favicon`, formData);
  }

  /**
   * Remove custom domain
   */
  async removeDomain(domainId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/custom-domains/${domainId}`);
  }

  /**
   * Check domain status (SSL, CF hostname)
   */
  async getDomainStatus(domainId: string): Promise<ApiResponse<DomainStatusResult>> {
    return apiClient.get(`/custom-domains/${domainId}/status`);
  }
}

export const customDomainApi = new CustomDomainApi();
