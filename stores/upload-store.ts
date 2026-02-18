'use client';

import { create } from 'zustand';

/**
 * Upload status enum
 */
export type UploadStatus = 'idle' | 'uploading' | 'paused' | 'complete' | 'error';

/**
 * Upload state interface
 */
interface UploadState {
  status: UploadStatus;
  progress: number;
  fileCount: number;
  totalSize: number;
  uploadedSize: number;

  // Actions
  setUploading: (fileCount: number, totalSize: number) => void;
  setResumed: () => void;
  setPaused: () => void;
  setProgress: (progress: number, uploadedSize: number) => void;
  setComplete: () => void;
  setError: () => void;
  reset: () => void;

  // Helpers
  isActive: () => boolean;
  canInterrupt: () => boolean;
}

/**
 * Global upload state store
 * Tracks upload status across the application for:
 * - Page navigation protection
 * - Browser close/reload protection
 * - Logout protection
 */
export const useUploadStore = create<UploadState>((set, get) => ({
  status: 'idle',
  progress: 0,
  fileCount: 0,
  totalSize: 0,
  uploadedSize: 0,

  setUploading: (fileCount: number, totalSize: number) => set({
    status: 'uploading',
    fileCount,
    totalSize,
    progress: 0,
    uploadedSize: 0,
  }),

  setResumed: () => set({ status: 'uploading' }),

  setPaused: () => set({ status: 'paused' }),

  setProgress: (progress: number, uploadedSize: number) => set({
    progress,
    uploadedSize,
  }),

  setComplete: () => set({
    status: 'complete',
    progress: 100,
  }),

  setError: () => set({ status: 'error' }),

  reset: () => set({
    status: 'idle',
    progress: 0,
    fileCount: 0,
    totalSize: 0,
    uploadedSize: 0,
  }),

  // Returns true if upload is active or paused (can be interrupted)
  isActive: () => {
    const { status } = get();
    return status === 'uploading' || status === 'paused';
  },

  // Returns true if user action should show confirmation
  canInterrupt: () => {
    const { status } = get();
    return status === 'uploading' || status === 'paused';
  },
}));
