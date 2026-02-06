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
  versionId?: string;
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
  versionId?: string;
}

// Response from requesting async ZIP creation
export interface ZipJobResponseDto {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  message: string;
}

// Response from checking ZIP job status
export interface ZipJobStatusDto {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  progress?: number;
  zipUrl?: string;
  totalFiles?: number;
  estimatedSize?: number;
  error?: string;
}

// Legacy response type (kept for compatibility)
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
   * Request async ZIP creation for all transfer files
   * Returns a job ID that can be polled for completion
   */
  async requestZipDownload(data: ZipDownloadRequestDto): Promise<ApiResponse<ZipJobResponseDto>> {
    return apiClient.post<ZipJobResponseDto>('/storage/download/zip', data);
  }

  /**
   * Check ZIP creation job status
   */
  async getZipJobStatus(jobId: string): Promise<ApiResponse<ZipJobStatusDto>> {
    return apiClient.get<ZipJobStatusDto>(`/storage/download/zip/status/${jobId}`);
  }

  /**
   * Request ZIP download and poll until complete
   * Convenience method that handles the full async flow
   */
  async getZipDownloadUrl(
    data: ZipDownloadRequestDto,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<ApiResponse<ZipDownloadResponseDto>> {
    // 1. Request ZIP creation
    const jobResponse = await this.requestZipDownload(data);

    if (jobResponse.error || !jobResponse.data) {
      return { ...jobResponse, data: undefined } as ApiResponse<ZipDownloadResponseDto>;
    }

    const { jobId } = jobResponse.data;

    // 2. Poll for completion
    return new Promise((resolve) => {
      const pollInterval = setInterval(async () => {
        // F-4.4: Check if polling was cancelled via AbortSignal
        if (signal?.aborted) {
          clearInterval(pollInterval);
          resolve({
            data: undefined,
            error: { message: 'ZIP download cancelled', statusCode: 0 },
            status: 0,
          });
          return;
        }

        try {
          const statusResponse = await this.getZipJobStatus(jobId);

          if (statusResponse.error || !statusResponse.data) {
            clearInterval(pollInterval);
            resolve({ ...statusResponse, data: undefined } as ApiResponse<ZipDownloadResponseDto>);
            return;
          }

          const { status, progress, zipUrl, totalFiles, estimatedSize, error } = statusResponse.data;

          // Report progress
          if (onProgress && typeof progress === 'number') {
            onProgress(progress);
          }

          if (status === 'completed' && zipUrl) {
            clearInterval(pollInterval);
            resolve({
              data: {
                zipUrl,
                expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24h from now
                totalFiles: totalFiles || 0,
                estimatedSize: estimatedSize || 0,
              },
              error: undefined,
              status: 200,
            });
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            resolve({
              data: undefined,
              error: { message: error || 'ZIP creation failed', statusCode: 500 },
              status: 500,
            });
          }
          // Continue polling for 'waiting' and 'active' states
        } catch (pollError) {
          clearInterval(pollInterval);
          resolve({
            data: undefined,
            error: { message: 'Failed to check ZIP status', statusCode: 500 },
            status: 500,
          });
        }
      }, 2000); // Poll every 2 seconds

      // Timeout after 10 minutes
      const timeoutId = setTimeout(() => {
        clearInterval(pollInterval);
        resolve({
          data: undefined,
          error: { message: 'ZIP creation timed out', statusCode: 408 },
          status: 408,
        });
      }, 600000);

      // F-4.4: Listen for abort signal to cancel polling
      if (signal) {
        signal.addEventListener('abort', () => {
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          resolve({
            data: undefined,
            error: { message: 'ZIP download cancelled', statusCode: 0 },
            status: 0,
          });
        }, { once: true });
      }
    });
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
   * Backend stores shortCode WITHOUT prefix, this adds it
   */
  getShortLinkUrl(shortCode: string): string {
    const domain = process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || 'localhost:3001';
    const prefix = process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || 'z-';
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${domain}/t/${prefix}${shortCode}`;
  }

  /**
   * Stream ZIP download with secure two-step flow
   * Step 1: POST to validate password and get signed download URL
   * Step 2: Redirect to signed URL for instant download
   *
   * SECURITY:
   * - Password is sent via POST (not in URL)
   * - Download URL uses time-limited HMAC signature
   * - Token expires in 5 minutes
   *
   * @param shortCode - Transfer short code
   * @param password - Optional password for protected transfers
   * @param versionId - Optional version ID to download specific version (default: current version)
   * @param email - Optional email for payment verification on paid transfers
   */
  async streamZipDownload(shortCode: string, password?: string, versionId?: string, email?: string): Promise<ApiResponse<void>> {
    // Step 1: Get signed download URL
    const response = await apiClient.post<{ downloadUrl: string; expiresIn: number }>(
      '/storage/download/zip/token',
      { shortCode, password, versionId, email }
    );

    if (response.error) {
      return {
        error: response.error,
        status: response.status,
      };
    }

    if (!response.data?.downloadUrl) {
      return {
        error: { message: 'Failed to generate download URL', statusCode: 500 },
        status: 500,
      };
    }

    // Step 2: Redirect to signed download URL (instant download)
    window.location.href = response.data.downloadUrl;

    return { status: 200 };
  }

  /**
   * Get download URL for entire transfer (ZIP of all files)
   * Wrapper around getZipDownloadUrl for convenience
   * @deprecated Use streamZipDownload for instant downloads
   */
  async getTransferDownloadUrl(shortCode: string, password?: string): Promise<ApiResponse<{ url: string }>> {
    const response = await this.getZipDownloadUrl({ shortCode, password });
    if (response.data?.zipUrl) {
      return { ...response, data: { url: response.data.zipUrl } };
    }
    return { ...response, data: undefined } as ApiResponse<{ url: string }>;
  }

  /**
   * Get download URL for a single file by ID
   */
  async getFileDownloadUrl(fileId: string, password?: string): Promise<ApiResponse<{ url: string }>> {
    return apiClient.post<{ url: string }>(`/storage/file/${fileId}/download`, { password });
  }

  /**
   * Get presigned URL for file preview
   * Used for in-app file preview without downloading
   * Returns watermarked preview if available (thumbnail for images, preview clip for video/audio)
   * Falls back to original file URL for PDFs or files without previews
   * When requestOriginal is true and transfer is paid/free, returns original file URL
   */
  async getFilePreviewUrl(
    shortCode: string,
    fileId: string,
    password?: string,
    options?: { requestOriginal?: boolean }
  ): Promise<ApiResponse<{
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    expiresAt: string;
    isWatermarked?: boolean;
    previewType?: 'thumbnail' | 'previewClip' | 'waveform' | 'original';
  }>> {
    return apiClient.post<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
      expiresAt: string;
      isWatermarked?: boolean;
      previewType?: 'thumbnail' | 'previewClip' | 'waveform' | 'original';
    }>(
      '/storage/preview/url',
      { shortCode, fileId, password, requestOriginal: options?.requestOriginal }
    );
  }

  /**
   * Regenerate preview for a file (Starter/Pro tier only)
   * Manually triggers preview regeneration for a specific file
   * Requires authentication - userId is extracted from JWT token
   */
  async regeneratePreview(
    fileId: string
  ): Promise<ApiResponse<{
    success: boolean;
    message: string;
    fileId: string;
  }>> {
    return apiClient.post<{
      success: boolean;
      message: string;
      fileId: string;
    }>(
      `/storage/preview/regenerate/${fileId}`,
      {}
    );
  }

  /**
   * Verify transfer password
   * Used by download page to authenticate access to password-protected transfers
   * @param shortCode - The transfer short code
   * @param password - The password to verify
   * @returns Success response or error
   */
  async verifyTransferPassword(
    shortCode: string,
    password: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient.post<{ success: boolean }>('/storage/verify-password', {
      shortCode,
      password,
    });
  }
}

// Export singleton instance
export const storageApi = new StorageApi();
