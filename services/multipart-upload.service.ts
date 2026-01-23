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
    console.log('[Multipart Upload] Pausing uploads');
    this.isPaused = true;
  }

  /**
   * Resume paused uploads
   */
  public resume(): void {
    console.log('[Multipart Upload] Resuming uploads');
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

    console.log('[Multipart Upload] Upload paused, waiting for resume...');
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
      console.log('[Upload State] Saved state for upload:', state.uploadId);
    } catch (error) {
      console.error('[Upload State] Failed to save state:', error);
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
        console.log('[Upload State] Loaded state for upload:', uploadId, `(${state.completedParts.length}/${state.totalParts} parts completed)`);
        return state;
      }
    } catch (error) {
      console.error('[Upload State] Failed to load state:', error);
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
      console.log('[Upload State] Cleared state for upload:', uploadId);
    } catch (error) {
      console.error('[Upload State] Failed to clear state:', error);
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
      console.error('[Upload State] Failed to get incomplete uploads:', error);
    }
    return incompleteUploads;
  }

  /**
   * Initialize multipart upload
   * Creates upload session on Wasabi and returns configuration
   */
  async initiateUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
    transferShortCode: string,
    uploadedBy: string,
    transferId: string
  ): Promise<MultipartUploadConfig> {
    const response = await apiClient.post('/storage/multipart/initiate', {
      fileName,
      fileSize,
      mimeType,
      transferShortCode,
      uploadedBy,
      transferId,
    });

    if (response.error) {
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
            console.error('[Chunk Upload] No ETag in response headers');
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
          console.error('[Chunk Upload] Failed:', errorMessage);
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        console.error('[Chunk Upload] Network error - connection failed');
        reject(new Error('Network error: Unable to connect to storage server'));
      });

      xhr.addEventListener('timeout', () => {
        console.error('[Chunk Upload] Timeout after 5 minutes');
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
        console.log(`[Chunk Upload] Part ${partNumber} - Attempt ${attempt + 1}/${maxRetries + 1}`);

        const etag = await this.uploadChunk(presignedUrl, chunk, onProgress);

        if (attempt > 0) {
          console.log(`[Chunk Upload] Part ${partNumber} succeeded after ${attempt} retries`);
        }

        return etag;
      } catch (error) {
        lastError = error as Error;
        console.error(`[Chunk Upload] Part ${partNumber} failed (attempt ${attempt + 1}):`, error);

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw new Error(
            `Chunk ${partNumber} failed after ${maxRetries + 1} attempts: ${lastError.message}`
          );
        }

        // Calculate exponential backoff delay: 2^attempt seconds
        const delayMs = Math.pow(2, attempt + 1) * 1000;
        console.log(`[Chunk Upload] Retrying part ${partNumber} in ${delayMs / 1000}s...`);

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
    transferId: string
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

    console.log('[Multipart Upload] Upload aborted successfully:', uploadId);
  }

  /**
   * Upload file using multipart upload with real progress tracking
   *
   * SINGLE SOURCE OF TRUTH: All progress comes from actual bytes uploaded to Wasabi
   *
   * Supports resume: If an upload was interrupted, pass the same file and it will
   * attempt to resume from the last completed chunk.
   */
  async uploadFile(
    file: File,
    transferShortCode: string,
    uploadedBy: string,
    transferId: string,
    onProgress: (progress: UploadProgress) => void,
    onUploadStarted?: (uploadId: string, objectKey: string) => void,
    resumeUploadId?: string
  ): Promise<any> {
    console.log('[Multipart Upload] Starting upload for:', file.name, file.size, 'bytes');

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
      console.log('[Multipart Upload] Resuming upload:', existingState.uploadId, `(${existingState.completedParts.length}/${existingState.totalParts} parts completed)`);

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
        file.type,
        transferShortCode,
        uploadedBy,
        transferId
      );

      console.log('[Multipart Upload] Initialized:', config);

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
        mimeType: file.type,
        transferShortCode,
        uploadedBy,
        transferId,
        chunkSize,
        totalParts,
        completedParts: [],
        startTime,
      });
    }
    const CONCURRENT_UPLOADS = 4;

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

      console.log(`[Multipart Upload] Uploading part ${partNumber}/${totalParts}`, {
        start,
        end,
        size: chunk.size
      });

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

      console.log(`[Multipart Upload] Part ${partNumber} completed, ETag: ${etag}`);

      return {
        partNumber,
        etag,
      };
    };

    // Upload all chunks with concurrency control
    console.log(`[Multipart Upload] Starting parallel upload with ${CONCURRENT_UPLOADS} concurrent chunks`);

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
          mimeType: file.type,
          transferShortCode,
          uploadedBy,
          transferId,
          chunkSize,
          totalParts,
          completedParts: [...completedParts],
          startTime,
        });

        console.log(`[Multipart Upload] Batch completed: ${completedParts.length}/${totalParts} parts uploaded`);
      } else {
        console.log(`[Multipart Upload] Skipping batch (all parts already completed)`);
      }
    }

    // Sort completed parts by part number (important for S3)
    completedParts.sort((a, b) => a.partNumber - b.partNumber);

    // Step 3: Complete upload on backend
    // IMPORTANT: Do NOT report 100% until backend confirms CompleteMultipartUpload succeeded
    console.log('[Multipart Upload] All chunks uploaded, finalizing with backend...', completedParts.length, 'parts');

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
        file.type,
        transferShortCode,
        uploadedBy,
        transferId
      );

      // Validate backend response
      if (!result || !result.success) {
        throw new Error(result?.message || 'Backend did not confirm upload completion');
      }

      console.log('[Multipart Upload] Upload confirmed by backend:', result);
    } catch (completeError: any) {
      console.error('[Multipart Upload] Backend completion failed:', completeError);

      // Try to abort the upload to clean up S3
      try {
        await this.abortUpload(uploadId, objectKey, transferId);
      } catch (abortError) {
        console.error('[Multipart Upload] Failed to abort after completion error:', abortError);
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
