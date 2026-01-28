'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Track upload state in a ref to avoid stale closure in beforeunload
  const isUploadActiveRef = useRef(false);

  // Keep ref in sync with store state via subscription
  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = useUploadStore.subscribe((state) => {
      isUploadActiveRef.current = state.status === 'uploading' || state.status === 'paused';
    });

    // Set initial value
    isUploadActiveRef.current = canInterrupt();

    return unsubscribe;
  }, [canInterrupt]);

  // Handle beforeunload (browser close/reload)
  // Cross-browser compatibility:
  // - Chrome/Edge: requires returnValue to be set
  // - Firefox: requires preventDefault()
  // - Safari: very restrictive, may not show dialog in all cases
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Use ref to get current upload state (avoids stale closure)
      if (!isUploadActiveRef.current) {
        return;
      }

      // Firefox requires preventDefault() to be called first
      e.preventDefault();

      // Chrome/Edge requires returnValue to be set (legacy but still needed)
      // Must be a non-empty string for some browsers
      const message = 'You have an upload in progress. Are you sure you want to leave?';
      e.returnValue = message;

      // Return value for older browsers
      return message;
    };

    // Use capture phase to ensure we catch the event before other handlers
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
    };
  }, []);

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
  }, [interruptionContext, pendingPath, router, resetUpload]);

  // Cancel the interruption - keep uploading
  const cancelInterruption = useCallback(() => {
    setShowConfirmation(false);
    setInterruptionContext(null);
    setPendingPath(null);
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
