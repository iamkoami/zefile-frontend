/**
 * Multipart Upload Service
 * Handles chunked file uploads directly to Wasabi S3 via presigned URLs
 *
 * This service implements WeTransfer-like upload architecture:
 * 1. Initialize multipart upload via NestJS API
 * 2. Upload chunks directly to Wasabi using presigned URLs
 * 3. Finalize upload via NestJS API
 *
 * Progress tracking is based on REAL bytes uploaded to Wasabi
 */

import { apiClient } from './api-client';

/**
 * Fallback MIME type map for extensions the browser doesn't recognize.
 * The browser's File.type returns "" for these, causing backend validation to fail.
 */
const MIME_FALLBACK: Record<string, string> = {
  mkv: 'video/x-matroska',
  flv: 'video/x-flv',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flac: 'audio/flac',
  m4a: 'audio/x-m4a',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  rar: 'application/x-rar-compressed',
};

function getFileMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_FALLBACK[ext] || 'application/octet-stream';
}

export interface MultipartUploadConfig {
  uploadId: string;
  objectKey: string;
  chunkSize: number;
  totalParts: number;
}

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  progress: number; // 0-100
  uploadSpeed: number; // bytes/second
  estimatedTimeRemaining: number; // seconds
}

export interface CompletedPart {
  partNumber: number;
  etag: string;
}

export interface UploadState {
  uploadId: string;
  objectKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  transferShortCode: string;
  uploadedBy: string;
  transferId: string;
  chunkSize: number;
  totalParts: number;
  completedParts: CompletedPart[];
  startTime: number;
  versionId?: string; // For version uploads
}

class MultipartUploadService {
  private readonly STORAGE_KEY_PREFIX = 'zefile_upload_';
  private isPaused: boolean = false;
  private pauseResolvers: Array<() => void> = [];

  /**
   * Pause all ongoing uploads
   * Uploads will pause before starting the next chunk
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume paused uploads
   */
  public resume(): void {
    this.isPaused = false;
    // Resolve all waiting promises to continue uploads
    this.pauseResolvers.forEach(resolve => resolve());
    this.pauseResolvers = [];
  }

  /**
   * Check if uploads are currently paused
   */
  public isUploadPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Wait if paused - returns a promise that resolves when resumed
   */
  private async waitIfPaused(): Promise<void> {
    if (!this.isPaused) return;

    return new Promise<void>((resolve) => {
      this.pauseResolvers.push(resolve);
    });
  }

  /**
   * Check if localStorage is available and functional
   */
  private isLocalStorageAvailable(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      if (typeof localStorage === 'undefined') return false;
      if (typeof localStorage.getItem !== 'function') return false;
      if (typeof localStorage.setItem !== 'function') return false;

      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Save upload state to localStorage for resume capability
   */
  private saveUploadState(state: UploadState): void {
    if (!this.isLocalStorageAvailable()) return;

    try {
      const key = `${this.STORAGE_KEY_PREFIX}${state.uploadId}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      // Silently fail - state save is best-effort for resume capability
    }
  }

  /**
   * Load upload state from localStorage
   */
  private loadUploadState(uploadId: string): UploadState | null {
    if (!this.isLocalStorageAvailable()) return null;

    try {
      const key = `${this.STORAGE_KEY_PREFIX}${uploadId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const state = JSON.parse(stored) as UploadState;
        return state;
      }
    } catch (error) {
      // Silently fail - corrupted state can be ignored
    }
    return null;
  }

  /**
   * Clear upload state from localStorage
   */
  private clearUploadState(uploadId: string): void {
    if (!this.isLocalStorageAvailable()) return;

    try {
      const key = `${this.STORAGE_KEY_PREFIX}${uploadId}`;
      localStorage.removeItem(key);
    } catch (error) {
      // Silently fail - state clear is best-effort
    }
  }

  /**
   * Get all incomplete uploads from localStorage
   */
  public getIncompleteUploads(): UploadState[] {
    if (!this.isLocalStorageAvailable()) return [];

    const incompleteUploads: UploadState[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const state = JSON.parse(stored) as UploadState;
            incompleteUploads.push(state);
          }
        }
      }
    } catch (error) {
      // Silently fail - return empty array
    }
    return incompleteUploads;
  }

  /**
   * Initialize multipart upload
   * Creates upload session on Wasabi and returns configuration
   * @param versionId Optional version ID when uploading new version files
   */
  async initiateUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
    transferShortCode: string,
    uploadedBy: string,
    transferId: string,
    versionId?: string
  ): Promise<MultipartUploadConfig> {
    const response = await apiClient.post('/storage/multipart/initiate', {
      fileName,
      fileSize,
      mimeType,
      transferShortCode,
      uploadedBy,
      transferId,
      versionId,
    });

    if (response.error) {
      // Check for storage limit exceeded error
      const errorData = response.error as any;
      if (errorData.code === 'STORAGE_LIMIT_EXCEEDED') {
        const error = new Error(errorData.message || 'Storage limit exceeded');
        (error as any).code = 'STORAGE_LIMIT_EXCEEDED';
        (error as any).tier = errorData.tier;
        (error as any).currentUsageBytes = errorData.currentUsageBytes;
        (error as any).limitBytes = errorData.limitBytes;
        (error as any).remainingBytes = errorData.remainingBytes;
        throw error;
      }
      throw new Error(response.error.message || 'Failed to initiate upload');
    }

    return response.data;
  }

  /**
   * Get presigned URL for uploading a specific part
   */
  async getPresignedUrl(
    uploadId: string,
    objectKey: string,
    partNumber: number
  ): Promise<string> {
    const response = await apiClient.post('/storage/multipart/presigned-url', {
      uploadId,
      objectKey,
      partNumber,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to get presigned URL');
    }

    return response.data.presignedUrl;
  }

  /**
   * Upload a single chunk directly to Wasabi
   * Returns ETag required for completion
   *
   * IMPORTANT: This uploads directly to Wasabi via presigned URL
   * No ACL headers are sent - Wasabi private-only account
   */
  async uploadChunk(
    presignedUrl: string,
    chunk: Blob,
    onProgress?: (loaded: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track progress for this chunk
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(e.loaded);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Get ETag from response header (required for S3 multipart completion)
          const etag = xhr.getResponseHeader('ETag');
          if (!etag) {
            reject(new Error('No ETag returned from S3 - chunk may not have been saved'));
            return;
          }
          // Remove quotes from ETag if present
          resolve(etag.replace(/"/g, ''));
        } else {
          // Parse error response if possible
          let errorMessage = `Chunk upload failed with status ${xhr.status}`;
          try {
            // Wasabi returns XML errors
            if (xhr.responseText) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(xhr.responseText, 'text/xml');
              const code = doc.querySelector('Code')?.textContent;
              const message = doc.querySelector('Message')?.textContent;
              if (code || message) {
                errorMessage = `S3 Error: ${code || 'Unknown'} - ${message || xhr.responseText}`;
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error: Unable to connect to storage server'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout: Connection too slow or server not responding'));
      });

      // IMPORTANT: No custom headers - presigned URL includes all auth
      // Do NOT add x-amz-acl or any ACL headers - Wasabi private-only
      xhr.open('PUT', presignedUrl);
      xhr.timeout = 300000; // 5 minutes per chunk
      xhr.send(chunk);
    });
  }

  /**
   * Upload chunk with automatic retry and exponential backoff
   * Retries up to 3 times with delays: 2s, 4s, 8s
   */
  private async uploadChunkWithRetry(
    presignedUrl: string,
    chunk: Blob,
    partNumber: number,
    onProgress?: (loaded: number) => void,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const etag = await this.uploadChunk(presignedUrl, chunk, onProgress);
        return etag;
      } catch (error) {
        lastError = error as Error;

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(
            `Chunk ${partNumber} failed after ${maxRetries + 1} attempts: ${lastError.message}`
          );
        }

        // Calculate exponential backoff delay: 2^attempt seconds
        const delayMs = Math.pow(2, attempt + 1) * 1000;

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error(`Chunk ${partNumber} upload failed`);
  }

  /**
   * Complete multipart upload
   * Finalizes upload on Wasabi and confirms success
   * @param versionId Optional version ID when uploading new version files
   */
  async completeUpload(
    uploadId: string,
    objectKey: string,
    parts: CompletedPart[],
    fileName: string,
    fileSize: number,
    mimeType: string,
    transferShortCode: string,
    uploadedBy: string,
    transferId: string,
    versionId?: string
  ): Promise<any> {
    const response = await apiClient.post('/storage/multipart/complete', {
      uploadId,
      objectKey,
      parts,
      fileName,
      fileSize,
      mimeType,
      transferShortCode,
      uploadedBy,
      transferId,
      versionId,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to complete upload');
    }

    return response.data;
  }

  /**
   * Abort multipart upload
   * Cancels upload and cleans up resources
   */
  async abortUpload(
    uploadId: string,
    objectKey: string,
    transferId?: string,
  ): Promise<void> {
    const response = await apiClient.post('/storage/multipart/abort', {
      uploadId,
      objectKey,
      transferId,
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to abort upload');
    }

    // Clear upload state after abort
    this.clearUploadState(uploadId);
  }

  /**
   * Upload file using multipart upload with real progress tracking
   *
   * SINGLE SOURCE OF TRUTH: All progress comes from actual bytes uploaded to Wasabi
   *
   * Supports resume: If an upload was interrupted, pass the same file and it will
   * attempt to resume from the last completed chunk.
   *
   * @param versionId Optional version ID when uploading new version files
   */
  async uploadFile(
    file: File,
    transferShortCode: string,
    uploadedBy: string,
    transferId: string,
    onProgress: (progress: UploadProgress) => void,
    onUploadStarted?: (uploadId: string, objectKey: string) => void,
    resumeUploadId?: string,
    versionId?: string
  ): Promise<any> {
    let uploadId: string;
    let objectKey: string;
    let chunkSize: number;
    let totalParts: number;
    let completedParts: CompletedPart[] = [];
    let startTime: number;

    // Check if we're resuming an existing upload
    const existingState = resumeUploadId ? this.loadUploadState(resumeUploadId) : null;

    if (existingState && existingState.fileName === file.name && existingState.fileSize === file.size) {
      // Resume existing upload
      uploadId = existingState.uploadId;
      objectKey = existingState.objectKey;
      chunkSize = existingState.chunkSize;
      totalParts = existingState.totalParts;
      completedParts = existingState.completedParts;
      startTime = existingState.startTime;

      // Notify caller
      if (onUploadStarted) {
        onUploadStarted(uploadId, objectKey);
      }
    } else {
      // Step 1: Initialize new upload
      const config = await this.initiateUpload(
        file.name,
        file.size,
        getFileMimeType(file),
        transferShortCode,
        uploadedBy,
        transferId,
        versionId
      );

      uploadId = config.uploadId;
      objectKey = config.objectKey;
      chunkSize = config.chunkSize;
      totalParts = config.totalParts;
      completedParts = [];
      startTime = Date.now();

      // Notify caller that upload has started (for tracking/cancellation)
      if (onUploadStarted) {
        onUploadStarted(uploadId, objectKey);
      }

      // Save initial state
      this.saveUploadState({
        uploadId,
        objectKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: getFileMimeType(file),
        transferShortCode,
        uploadedBy,
        transferId,
        chunkSize,
        totalParts,
        completedParts: [],
        startTime,
        versionId,
      });
    }
    const CONCURRENT_UPLOADS = 6;

    // Track progress for each chunk
    const chunkProgress = new Map<number, number>();
    for (let i = 1; i <= totalParts; i++) {
      chunkProgress.set(i, 0);
    }

    // Mark already completed parts in progress tracking
    const completedPartNumbers = new Set(completedParts.map(p => p.partNumber));
    completedPartNumbers.forEach(partNumber => {
      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const partSize = end - start;
      chunkProgress.set(partNumber, partSize);
    });

    // Helper function to calculate total progress
    const calculateTotalProgress = () => {
      let totalBytesUploaded = 0;
      chunkProgress.forEach((loaded) => {
        totalBytesUploaded += loaded;
      });

      const progress = (totalBytesUploaded / file.size) * 100;
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const uploadSpeed = totalBytesUploaded / elapsedSeconds;
      const remainingBytes = file.size - totalBytesUploaded;
      const estimatedTimeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

      onProgress({
        bytesUploaded: totalBytesUploaded,
        totalBytes: file.size,
        progress,
        uploadSpeed,
        estimatedTimeRemaining,
      });
    };

    // Step 2: Upload chunks in parallel (4 concurrent)
    const uploadChunkTask = async (partNumber: number): Promise<CompletedPart> => {
      // Check if paused before starting this chunk
      await this.waitIfPaused();

      const start = (partNumber - 1) * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      // Get presigned URL for this part
      const presignedUrl = await this.getPresignedUrl(uploadId, objectKey, partNumber);

      // Upload chunk with progress tracking and automatic retry
      const etag = await this.uploadChunkWithRetry(presignedUrl, chunk, partNumber, (loaded) => {
        // Update progress for this chunk
        chunkProgress.set(partNumber, loaded);
        calculateTotalProgress();
      });

      // Mark this chunk as fully uploaded
      chunkProgress.set(partNumber, chunk.size);
      calculateTotalProgress();

      return {
        partNumber,
        etag,
      };
    };

    // Upload all chunks with concurrency control
    for (let i = 0; i < totalParts; i += CONCURRENT_UPLOADS) {
      // Check if paused before starting new batch
      await this.waitIfPaused();

      // Create batch of chunks to upload (up to CONCURRENT_UPLOADS at a time)
      const batch = [];
      for (let j = 0; j < CONCURRENT_UPLOADS && (i + j) < totalParts; j++) {
        const partNumber = i + j + 1;

        // Skip already completed parts
        if (!completedPartNumbers.has(partNumber)) {
          batch.push(uploadChunkTask(partNumber));
        }
      }

      // Wait for all chunks in this batch to complete
      if (batch.length > 0) {
        const batchResults = await Promise.all(batch);
        completedParts.push(...batchResults);

        // Update completed part numbers set
        batchResults.forEach(result => completedPartNumbers.add(result.partNumber));

        // Save state after each batch completes (for resume capability)
        this.saveUploadState({
          uploadId,
          objectKey,
          fileName: file.name,
          fileSize: file.size,
          mimeType: getFileMimeType(file),
          transferShortCode,
          uploadedBy,
          transferId,
          chunkSize,
          totalParts,
          completedParts: [...completedParts],
          startTime,
          versionId,
        });
      }
    }

    // Sort completed parts by part number (important for S3)
    completedParts.sort((a, b) => a.partNumber - b.partNumber);

    // Step 3: Complete upload on backend
    // IMPORTANT: Do NOT report 100% until backend confirms CompleteMultipartUpload succeeded
    // Report 99% while waiting for backend confirmation
    onProgress({
      bytesUploaded: file.size,
      totalBytes: file.size,
      progress: 99, // Not 100% until backend confirms
      uploadSpeed: file.size / ((Date.now() - startTime) / 1000),
      estimatedTimeRemaining: 2, // Approx time for finalization
    });

    let result;
    try {
      result = await this.completeUpload(
        uploadId,
        objectKey,
        completedParts,
        file.name,
        file.size,
        getFileMimeType(file),
        transferShortCode,
        uploadedBy,
        transferId,
        versionId
      );

      // Validate backend response
      if (!result || !result.success) {
        throw new Error(result?.message || 'Backend did not confirm upload completion');
      }
    } catch (completeError: any) {

      // Try to abort the upload to clean up S3
      try {
        await this.abortUpload(uploadId, objectKey, transferId);
      } catch (abortError) {
        // Silently fail - abort is best-effort cleanup
      }

      // Re-throw with clear message
      throw new Error(`Upload finalization failed: ${completeError.message}`);
    }

    // Clear upload state after successful completion
    this.clearUploadState(uploadId);

    // Report 100% completion
    onProgress({
      bytesUploaded: file.size,
      totalBytes: file.size,
      progress: 100,
      uploadSpeed: file.size / ((Date.now() - startTime) / 1000),
      estimatedTimeRemaining: 0,
    });

    return result;
  }
}

export const multipartUploadService = new MultipartUploadService();
