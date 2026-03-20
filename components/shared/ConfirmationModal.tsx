'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { WarningTriangle, Trash } from 'iconoir-react';
import { useTranslations } from 'next-intl';

export type ConfirmationModalType = 'warning' | 'delete';

interface ConfirmationModalProps {
  isOpen: boolean;
  type?: ConfirmationModalType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  className?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmationModal - Reusable modal for destructive action confirmations
 * Matches ZeFile design with warning icon, centered content, and styled buttons
 * Supports both warning (yellow triangle) and delete (red trash) variants
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type = 'warning',
  title,
  message,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  className,
  onConfirm,
  onCancel,
}) => {
  const t = useTranslations('confirmationModal');
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Default labels from translations
  const confirm = confirmLabel || t('yes');
  const cancel = cancelLabel || t('no');

  // Handle ESC key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    },
    [isOpen, onCancel]
  );

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus confirm button on open
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Track if we're mounted (for portal)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/60 z-[10000] transition-opacity duration-200"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className={`bg-white dark:bg-[oklch(0.24_0_0)] rounded-2xl shadow-2xl dark:shadow-black/40 w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200${className ? ` ${className}` : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {type === 'warning' ? (
              <div className="w-20 h-20 flex items-center justify-center">
                <WarningTriangle className="w-16 h-16 text-red-500 dark:text-red-400" strokeWidth={1.5} />
              </div>
            ) : (
              <div className="w-20 h-20 flex items-center justify-center">
                <Trash className="w-16 h-16 text-red-500 dark:text-red-400" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {/* Title */}
          <h2
            id="confirmation-title"
            className="text-xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] text-center mb-2"
          >
            {title}
          </h2>

          {/* Message */}
          <p
            id="confirmation-message"
            className="text-sm text-gray-500 dark:text-[oklch(0.68_0_0)] text-center mb-8"
          >
            {message}
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 max-w-[140px] px-6 py-3 text-base font-medium text-gray-900 dark:text-[oklch(0.91_0_0)] bg-white dark:bg-[oklch(0.28_0_0)] border border-gray-300 dark:border-[oklch(0.30_0_0)] rounded-lg hover:bg-gray-50 dark:hover:bg-[oklch(0.32_0_0)] transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[oklch(0.40_0_0)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancel}
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 max-w-[140px] px-6 py-3 text-base font-medium text-[#171717] bg-[#87E64B] rounded-lg hover:bg-[#7ad43f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {confirm}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Use React Portal to render at document.body level
  return createPortal(modalContent, document.body);
};

export default ConfirmationModal;
