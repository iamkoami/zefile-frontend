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
import { storageApi } from './storage-api';
import { trackFileUploaded, trackUploadFailed } from '@/lib/posthog';

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

// --- Upload state encryption (AES-GCM) ---
// Key stored in sessionStorage to survive page refreshes within the same tab.
const SESSION_KEY_NAME = '__zefile_upload_key__';
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getOrCreateEncryptionKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;

  try {
    const stored = sessionStorage.getItem(SESSION_KEY_NAME);
    if (stored) {
      const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      return crypto.subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
    }

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(SESSION_KEY_NAME, btoa(String.fromCharCode(...new Uint8Array(exported))));
    return key;
  } catch {
    return null;
  }
}

async function encryptState(data: string): Promise<string | null> {
  const key = await getOrCreateEncryptionKey();
  if (!key) return null;
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch {
    return null;
  }
}

async function decryptState(ciphertext: string): Promise<string | null> {
  const key = await getOrCreateEncryptionKey();
  if (!key) return null;
  try {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * PresignedUrlPool — fetches presigned URLs in batches of up to 10 and caches
 * them for the sliding window workers. Falls back to the singular endpoint if
 * the batch endpoint returns an error (e.g. 404 on older backend).
 */
export class PresignedUrlPool {
  private urls = new Map<number, string>();
  private pendingFetch: Promise<void> | null = null;
  private pendingPrefetch: Promise<void> | null = null;
  private useFallback = false;
  private fallbackWarned = false;
  private readonly batchSize = 10;
  private readonly completedParts: ReadonlySet<number>;
  /** Highest part number included in any batch fetch so far */
  private highWaterMark = 0;

  private static readonly PREFETCH_THRESHOLD = 6;

  constructor(
    private readonly uploadId: string,
    private readonly objectKey: string,
    private readonly totalParts: number,
    completedParts?: ReadonlySet<number>,
  ) {
    this.completedParts = completedParts ?? new Set();
  }

  /**
   * Get a presigned URL for the given part number.
   * Returns from cache when available, otherwise triggers a batch fetch.
   * Falls back to the singular endpoint on error.
   * Deduplicates in-flight batch requests so concurrent workers don't
   * trigger redundant API calls.
   */
  async getUrl(partNumber: number): Promise<string> {
    // Return from cache if a previous batch already fetched this URL
    const cached = this.urls.get(partNumber);
    if (cached) {
      this.urls.delete(partNumber); // consumed
      return cached;
    }

    // If the batch endpoint failed previously, use the singular fallback
    if (this.useFallback) {
      return this.fetchSingular(partNumber);
    }

    // If another worker already triggered a batch, wait for it then check cache
    if (this.pendingFetch) {
      await this.pendingFetch;
      const rechecked = this.urls.get(partNumber);
      if (rechecked) {
        this.urls.delete(partNumber);
        return rechecked;
      }
    }

    // Fetch a new batch starting from this part number
    try {
      await this.fetchBatch(partNumber);
    } catch {
      // Batch failed — switch to fallback permanently for this pool instance
      this.useFallback = true;
      if (!this.fallbackWarned) {
        this.fallbackWarned = true;
        console.warn(
          '[PresignedUrlPool] Batch endpoint failed, falling back to singular presigned URL endpoint.',
        );
      }
      return this.fetchSingular(partNumber);
    }

    const url = this.urls.get(partNumber);
    if (url) {
      this.urls.delete(partNumber);
      return url;
    }

    // Batch returned but didn't include this part — singular fallback
    return this.fetchSingular(partNumber);
  }

  /**
   * Trigger a background prefetch if the URL pool is running low.
   * Non-blocking — fires and forgets so the caller isn't delayed.
   *
   * AC1: triggers when fewer than PREFETCH_THRESHOLD unconsumed URLs remain.
   * AC2: non-blocking — returns immediately.
   * AC3: skips if all remaining parts already have URLs cached.
   * AC4: skips when upload is paused.
   * AC5: prefetches at most one batch (10 parts) ahead — well within URL expiry.
   */
  prefetchIfNeeded(isPaused: boolean): void {
    if (isPaused) return;                    // AC4
    if (this.useFallback) return;            // no batching in fallback mode
    if (this.pendingPrefetch) return;        // already prefetching

    // AC1: only prefetch when pool is running low
    if (this.urls.size >= PresignedUrlPool.PREFETCH_THRESHOLD) return;

    // Determine where the next prefetch batch should start
    const startPart = this.highWaterMark + 1;
    if (startPart > this.totalParts) return; // AC3: all parts already covered

    // eslint-disable-next-line no-console -- intentional debug logging for prefetch observability
    console.debug(
      `[PresignedUrlPool] Prefetching parts ${startPart}-${Math.min(startPart + this.batchSize - 1, this.totalParts)} (pool: ${this.urls.size} URLs buffered)`,
    );

    // Use fetchBatchCore directly — avoids overwriting pendingFetch used
    // by demand-driven getUrl() dedup, preventing workers from waiting on
    // an irrelevant prefetch batch.
    this.pendingPrefetch = this.fetchBatchCore(startPart)
      .catch(() => { /* silently fail — will retry on next consumption */ })
      .finally(() => { this.pendingPrefetch = null; });
  }

  /**
   * Core batch fetch logic — fetches up to batchSize URLs and populates cache.
   * Does NOT touch pendingFetch. Used by both demand-driven fetchBatch()
   * and background prefetchIfNeeded() to avoid dedup interference.
   */
  private async fetchBatchCore(startPart: number): Promise<void> {
    // Track high water mark for prefetch scheduling
    const batchEnd = Math.min(startPart + this.batchSize - 1, this.totalParts);
    if (batchEnd > this.highWaterMark) {
      this.highWaterMark = batchEnd;
    }

    const partNumbers: number[] = [];
    for (
      let i = startPart;
      i < startPart + this.batchSize && i <= this.totalParts;
      i++
    ) {
      if (!this.urls.has(i) && !this.completedParts.has(i)) {
        partNumbers.push(i);
      }
    }
    if (partNumbers.length === 0) return;

    const response = await storageApi.getBatchPresignedUrls(
      this.uploadId,
      this.objectKey,
      partNumbers,
    );

    if (response.error || !response.data?.urls) {
      throw new Error(
        response.error?.message || 'Batch presigned URL fetch failed',
      );
    }

    for (const item of response.data.urls) {
      this.urls.set(item.partNumber, item.presignedUrl);
    }
  }

  /**
   * Demand-driven batch fetch with pendingFetch dedup.
   * Wraps fetchBatchCore and sets pendingFetch so concurrent getUrl()
   * callers can wait on the same in-flight request.
   */
  private async fetchBatch(startPart: number): Promise<void> {
    const fetchPromise = this.fetchBatchCore(startPart);

    this.pendingFetch = fetchPromise;
    try {
      await fetchPromise;
    } finally {
      this.pendingFetch = null;
    }
  }

  /**
   * Singular fallback — fetches one presigned URL at a time.
   */
  private async fetchSingular(partNumber: number): Promise<string> {
    const response = await storageApi.getSinglePresignedUrl(
      this.uploadId,
      this.objectKey,
      partNumber,
    );

    if (response.error || !response.data?.presignedUrl) {
      throw new Error(
        response.error?.message ||
          `Failed to get presigned URL for part ${partNumber}`,
      );
    }

    return response.data.presignedUrl;
  }

}

class MultipartUploadService {
  private readonly STORAGE_KEY_PREFIX = 'zefile_upload_';
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private pauseResolvers: Array<() => void> = [];
  private saveQueue: Promise<void> = Promise.resolve();

  /**
   * Pause all ongoing uploads
   * Current in-flight chunks finish, but no new chunks start
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
   * Mark upload as cancelled — checked after pause resolves
   */
  public cancel(): void {
    this.isCancelled = true;
  }

  /**
   * Check if the upload was cancelled
   */
  public isUploadCancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Reset cancel flag (call before starting a new upload)
   */
  public resetCancel(): void {
    this.isCancelled = false;
  }

  /**
   * Check if uploads are currently paused
   */
  public isUploadPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Wait if paused - returns a promise that resolves when resumed
   * Public so UploadPanel can gate finalization on pause state
   */
  public async waitIfPaused(): Promise<void> {
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
   * Save upload state to localStorage (encrypted with AES-GCM).
   * Falls back to plaintext if Web Crypto is unavailable.
   */
  private saveUploadState(state: UploadState): void {
    if (!this.isLocalStorageAvailable()) return;

    const key = `${this.STORAGE_KEY_PREFIX}${state.uploadId}`;
    const json = JSON.stringify(state);

    // Chain saves sequentially so concurrent workers don't overwrite each other.
    // Each save waits for the previous one to finish, ensuring the latest state wins.
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        const encrypted = await encryptState(json);
        if (!encrypted) {
          console.warn('[MultipartUpload] Encryption returned empty, falling back to plaintext');
        }
        localStorage.setItem(key, encrypted || json);
      } catch {
        // Encryption failed — fall back to plaintext
        try { localStorage.setItem(key, json); } catch { /* best-effort */ }
      }
    });
  }

  /**
   * Load upload state from localStorage (decrypts AES-GCM).
   * Falls back to plaintext parsing if decryption fails (e.g., key rotated).
   */
  private loadUploadState(uploadId: string): UploadState | null {
    // Synchronous wrapper — encryption is async, so we return null here
    // and use loadUploadStateAsync for the actual upload flow
    return this.loadUploadStateSync(uploadId);
  }

  private loadUploadStateSync(uploadId: string): UploadState | null {
    if (!this.isLocalStorageAvailable()) return null;
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${uploadId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      // Try parsing as plaintext JSON first (backwards compat)
      try {
        const state = JSON.parse(stored) as UploadState;
        if (state.uploadId) return state;
      } catch {
        // Not plaintext — will need async decryption
      }
    } catch {
      // Silently fail
    }
    return null;
  }

  async loadUploadStateAsync(uploadId: string): Promise<UploadState | null> {
    if (!this.isLocalStorageAvailable()) return null;
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${uploadId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      // Try plaintext first (backwards compat)
      try {
        const state = JSON.parse(stored) as UploadState;
        if (state.uploadId) return state;
      } catch {
        // Not plaintext JSON — try decryption
      }

      const decrypted = await decryptState(stored);
      if (decrypted) {
        return JSON.parse(decrypted) as UploadState;
      }
    } catch {
      // Corrupted state — ignore
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
    } catch {
      // Silently fail - state clear is best-effort
    }
  }

  /**
   * Get all incomplete uploads from localStorage.
   * Also cleans up stale entries older than 24 hours.
   */
  public getIncompleteUploads(): UploadState[] {
    if (!this.isLocalStorageAvailable()) return [];

    const incompleteUploads: UploadState[] = [];
    const now = Date.now();
    const keysToRemove: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const state = JSON.parse(stored) as UploadState;
              // Clean up stale entries (older than 24h)
              if (state.startTime && now - state.startTime > STALE_THRESHOLD_MS) {
                keysToRemove.push(key);
              } else {
                incompleteUploads.push(state);
              }
            } catch {
              // Encrypted or corrupted — can't parse synchronously, skip
              // Could be cleaned up by async methods
            }
          }
        }
      }
      // Remove stale entries
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {
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

    // Build list of parts that still need uploading (skip completed for resume)
    const pendingParts: number[] = [];
    for (let i = 1; i <= totalParts; i++) {
      if (!completedPartNumbers.has(i)) {
        pendingParts.push(i);
      }
    }

    // Step 2: Upload chunks with sliding window (keeps all slots busy)
    // Each worker independently grabs the next pending part, uploads it, and loops.
    // This eliminates idle gaps between batches — a freed slot is filled immediately.
    let nextPartIdx = 0;
    let slidingWindowError: Error | null = null;

    // PresignedUrlPool — fetches batch presigned URLs on-demand (up to 10 at a time)
    // with automatic fallback to singular endpoint if batch fails (AC3).
    const urlPool = new PresignedUrlPool(uploadId, objectKey, totalParts, completedPartNumbers);

    const uploadWorker = async (): Promise<void> => {
      while (true) {
        // Wait if paused — blocks until resumed
        await this.waitIfPaused();
        if (this.isCancelled) return;

        // Safe: check-and-increment runs synchronously before any await
        if (nextPartIdx >= pendingParts.length || slidingWindowError) return;
        const partNumber = pendingParts[nextPartIdx++];

        try {
          const presignedUrl = await urlPool.getUrl(partNumber);
          // Trigger background prefetch if pool is running low (non-blocking)
          urlPool.prefetchIfNeeded(this.isPaused);
          if (this.isCancelled) return;

          const start = (partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);

          const etag = await this.uploadChunkWithRetry(presignedUrl, chunk, partNumber, (loaded) => {
            chunkProgress.set(partNumber, loaded);
            calculateTotalProgress();
          });

          completedParts.push({ partNumber, etag });
          completedPartNumbers.add(partNumber);
          chunkProgress.set(partNumber, end - start);
          calculateTotalProgress();

          // Save state after each chunk for resume support
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
        } catch (error) {
          if (!slidingWindowError) slidingWindowError = error as Error;
          return;
        }
      }
    };

    // Launch worker pool — each worker keeps its slot busy until all parts are done
    const workerCount = Math.min(CONCURRENT_UPLOADS, pendingParts.length);
    if (workerCount > 0) {
      await Promise.all(
        Array.from({ length: workerCount }, () => uploadWorker())
      );
    }

    if (slidingWindowError) {
      throw slidingWindowError;
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
      trackUploadFailed({ fileName: file.name, errorMessage: completeError.message, stage: 'finalization' });

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

    trackFileUploaded({ fileName: file.name, fileSize: file.size, mimeType: getFileMimeType(file) });

    return result;
  }
}

export const multipartUploadService = new MultipartUploadService();
