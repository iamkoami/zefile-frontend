/**
 * Storage API Service
 * Handles file upload, download, and storage operations
 */

import { apiClient, ApiResponse } from './api-client';

export interface UploadFileDto {
  file: File;
  transferShortCode: string;
  uploadedBy: string;
  transferId: string;
}

export interface UploadResultDto {
  s3Key: string;
  fileUrl: string;
  certificate: FileCertificateDto;
  fileHash: string;
  fileSignature: string;
}

export interface FileCertificateDto {
  certificateId: string;
  fileHash: string;
  signature: string;
  metadata: {
    filename: string;
    size: number;
    mimeType: string;
    uploadedBy: string;
    transferId: string;
    uploadTimestamp: string;
  };
  issuedAt: string;
}

export interface PresignedUrlRequestDto {
  shortCode: string;
  fileIds?: string[];
  password?: string;
  expiresIn?: number;
}

export interface PresignedUrlResponseDto {
  urls: Array<{
    fileId: string;
    filename: string;
    url: string;
    expiresAt: string;
  }>;
  expiresIn: number;
  shortCode: string;
}

export interface ZipDownloadRequestDto {
  shortCode: string;
  password?: string;
  expiresIn?: number;
}

export interface ZipDownloadResponseDto {
  zipUrl: string;
  expiresAt: string;
  totalFiles: number;
  estimatedSize: number;
}

export interface TransferInfoDto {
  id: string;
  shortCode: string;
  recipientEmail: string;
  senderEmail: string;
  message?: string;
  expiryDate: string;
  downloadCount: number;
  maxDownloads?: number;
  files: Array<{
    id: string;
    filename: string;
    size: number;
    mimeType: string;
    thumbnailUrl?: string;
  }>;
  hasPassword: boolean;
  status: string;
}

export interface VerifyCertificateDto {
  certificateId: string;
}

export interface CertificateVerificationDto {
  isValid: boolean;
  certificate: FileCertificateDto;
  verifiedAt: string;
}

export class StorageApi {
  /**
   * Upload a file
   */
  async uploadFile(
    file: File,
    transferShortCode: string,
    uploadedBy: string,
    transferId: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadResultDto>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transferShortCode', transferShortCode);
    formData.append('uploadedBy', uploadedBy);
    formData.append('transferId', transferId);

    return apiClient.upload<UploadResultDto>('/storage/upload', formData, onProgress);
  }

  /**
   * Generate presigned download URL(s)
   */
  async getDownloadUrl(data: PresignedUrlRequestDto): Promise<ApiResponse<PresignedUrlResponseDto>> {
    return apiClient.post<PresignedUrlResponseDto>('/storage/download/url', data);
  }

  /**
   * Generate ZIP download URL for all transfer files
   */
  async getZipDownloadUrl(data: ZipDownloadRequestDto): Promise<ApiResponse<ZipDownloadResponseDto>> {
    return apiClient.post<ZipDownloadResponseDto>('/storage/download/zip', data);
  }

  /**
   * Get transfer information
   */
  async getTransferInfo(shortCode: string, password?: string): Promise<ApiResponse<TransferInfoDto>> {
    const url = `/storage/info/${shortCode}`;
    if (password) {
      return apiClient.post<TransferInfoDto>(url, { password });
    }
    return apiClient.get<TransferInfoDto>(url);
  }

  /**
   * Verify file certificate
   */
  async verifyCertificate(certificateId: string): Promise<ApiResponse<CertificateVerificationDto>> {
    return apiClient.post<CertificateVerificationDto>('/storage/verify-certificate', {
      certificateId,
    });
  }

  /**
   * Delete transfer and all files
   */
  async deleteTransfer(shortCode: string): Promise<ApiResponse<{ message: string; deletedCount: number }>> {
    return apiClient.delete(`/storage/transfer/${shortCode}`);
  }

  /**
   * Get complete certificate
   */
  async getCertificate(certificateId: string): Promise<ApiResponse<FileCertificateDto>> {
    return apiClient.get<FileCertificateDto>(`/storage/certificate/${certificateId}`);
  }

  /**
   * Download file (initiates browser download)
   */
  async downloadFile(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Generate short link URL
   */
  getShortLinkUrl(shortCode: string): string {
    const domain = process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'localhost:3001';
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${domain}/t/${shortCode}`;
  }
}

// Export singleton instance
export const storageApi = new StorageApi();
