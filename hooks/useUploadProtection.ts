'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUploadStore } from '@/stores/upload-store';

export type InterruptionContext =
  | 'browser-close'     // Tab close or reload
  | 'navigation'        // Route change
  | 'logout'            // User logout action
  | null;

interface UseUploadProtectionReturn {
  showConfirmation: boolean;
  interruptionContext: InterruptionContext;
  pendingPath: string | null;

  // Actions
  confirmInterruption: () => void;
  cancelInterruption: () => void;
  requestLogoutInterruption: () => boolean; // Returns true if confirmation needed
  requestNavigationInterruption: (path: string) => boolean; // Returns true if confirmation needed
}

/**
 * Hook for protecting active uploads from interruption
 * Handles: browser close/reload, route navigation, logout
 */
export function useUploadProtection(): UseUploadProtectionReturn {
  const router = useRouter();
  const { canInterrupt, reset: resetUpload } = useUploadStore();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [interruptionContext, setInterruptionContext] = useState<InterruptionContext>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingLogoutCallback, setPendingLogoutCallback] = useState<(() => void) | null>(null);

  // Handle beforeunload (browser close/reload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (canInterrupt()) {
        // Standard way to show browser confirmation dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [canInterrupt]);

  // Request navigation interruption - returns true if confirmation is needed
  const requestNavigationInterruption = useCallback(
    (path: string): boolean => {
      if (canInterrupt()) {
        setPendingPath(path);
        setInterruptionContext('navigation');
        setShowConfirmation(true);
        return true;
      }
      // No active upload, proceed directly
      router.push(path);
      return false;
    },
    [canInterrupt, router]
  );

  // Request logout interruption - returns true if confirmation is needed
  const requestLogoutInterruption = useCallback((): boolean => {
    if (canInterrupt()) {
      setInterruptionContext('logout');
      setShowConfirmation(true);
      return true;
    }
    return false;
  }, [canInterrupt]);

  // Confirm the interruption - cancel upload and proceed
  const confirmInterruption = useCallback(() => {
    // Reset upload state
    resetUpload();

    if (interruptionContext === 'navigation' && pendingPath) {
      router.push(pendingPath);
    }

    // If logout, the callback will be handled by the component that called requestLogoutInterruption

    // Reset state
    setShowConfirmation(false);
    setInterruptionContext(null);
    setPendingPath(null);
    setPendingLogoutCallback(null);
  }, [interruptionContext, pendingPath, router, resetUpload]);

  // Cancel the interruption - keep uploading
  const cancelInterruption = useCallback(() => {
    setShowConfirmation(false);
    setInterruptionContext(null);
    setPendingPath(null);
    setPendingLogoutCallback(null);
  }, []);

  return {
    showConfirmation,
    interruptionContext,
    pendingPath,
    confirmInterruption,
    cancelInterruption,
    requestLogoutInterruption,
    requestNavigationInterruption,
  };
}
