'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useUploadProtection, InterruptionContext } from '@/hooks/useUploadProtection';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

interface UploadProtectionContextValue {
  requestLogoutInterruption: () => boolean;
  requestNavigationInterruption: (path: string) => boolean;
  isUploadActive: boolean;
}

const UploadProtectionContext = createContext<UploadProtectionContextValue | null>(null);

/**
 * Hook to access upload protection functions
 */
export function useUploadProtectionContext() {
  const context = useContext(UploadProtectionContext);
  if (!context) {
    throw new Error('useUploadProtectionContext must be used within UploadProtectionProvider');
  }
  return context;
}

interface UploadProtectionProviderProps {
  children: ReactNode;
}

/**
 * Provider that wraps the app and shows upload interruption confirmation modal
 * Handles browser close/reload, route navigation, and logout protection
 */
export function UploadProtectionProvider({ children }: UploadProtectionProviderProps) {
  const t = useTranslations('uploadProtection');
  const {
    showConfirmation,
    interruptionContext,
    confirmInterruption,
    cancelInterruption,
    requestLogoutInterruption,
    requestNavigationInterruption,
  } = useUploadProtection();

  // Get modal content based on interruption context
  const getModalContent = (context: InterruptionContext) => {
    switch (context) {
      case 'logout':
        return {
          title: t('logoutTitle'),
          message: t('logoutMessage'),
        };
      case 'navigation':
        return {
          title: t('navigationTitle'),
          message: t('navigationMessage'),
        };
      default:
        return {
          title: t('defaultTitle'),
          message: t('defaultMessage'),
        };
    }
  };

  const modalContent = getModalContent(interruptionContext);

  // Check if upload is active (for external components to query)
  const isUploadActive = showConfirmation;

  return (
    <UploadProtectionContext.Provider
      value={{
        requestLogoutInterruption,
        requestNavigationInterruption,
        isUploadActive,
      }}
    >
      {children}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        type="warning"
        title={modalContent.title}
        message={modalContent.message}
        confirmLabel={t('yes')}
        cancelLabel={t('no')}
        onConfirm={confirmInterruption}
        onCancel={cancelInterruption}
      />
    </UploadProtectionContext.Provider>
  );
}
