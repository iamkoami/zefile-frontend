'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Xmark, Upload, Check } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import { disputesApi, DisputeType } from '@/services/dispute-api';

interface ReportIssueModalProps {
  transferId: string;
  shortCode: string;
  userEmail?: string;
  role: 'sender' | 'recipient';
  onClose: () => void;
}

const ISSUE_TYPES: { value: DisputeType; labelKey: string }[] = [
  { value: 'payment_no_download', labelKey: 'typePaymentNoDownload' },
  { value: 'corrupted_files', labelKey: 'typeCorruptedFiles' },
  { value: 'wrong_files', labelKey: 'typeWrongFiles' },
  { value: 'transfer_expired', labelKey: 'typeTransferExpired' },
  { value: 'content_mismatch', labelKey: 'typeContentMismatch' },
  { value: 'double_charged', labelKey: 'typeDoubleCharged' },
  { value: 'other', labelKey: 'typeOther' },
];

/**
 * ReportIssueModal - Modal for submitting a dispute/issue report
 */
const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  transferId,
  shortCode,
  userEmail,
  role,
  onClose,
}) => {
  const t = useTranslations('dispute');
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<'form' | 'success' | 'existing'>('form');
  const [reference, setReference] = useState('');
  const [existingDispute, setExistingDispute] = useState<{
    reference: string;
    status: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    type: '' as DisputeType | '',
    description: '',
    email: userEmail || '',
    screenshot: null as File | null,
    screenshotUrl: '',
  });

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check for existing dispute on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const response = await disputesApi.getDisputeForTransfer(
          transferId,
          userEmail || formData.email
        );
        if (response.data?.dispute) {
          setExistingDispute({
            reference: response.data.dispute.reference,
            status: response.data.dispute.status,
          });
          setStep('existing');
        }
      } catch {
        // No existing dispute, continue with form
      }
    };

    if (transferId && (userEmail || formData.email)) {
      checkExisting();
    }
  }, [transferId, userEmail, formData.email]);

  // Handle ESC key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // Handle screenshot upload
  const handleScreenshotChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('errorImageOnly'));
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('errorFileTooLarge'));
      return;
    }

    setFormData((f) => ({ ...f, screenshot: file }));
    setError('');

    // Upload immediately
    setIsUploading(true);
    try {
      const response = await disputesApi.uploadScreenshot(file);
      if (response.data?.url) {
        setFormData((f) => ({ ...f, screenshotUrl: response.data!.url }));
      } else {
        setError(t('errorUploadFailed'));
        setFormData((f) => ({ ...f, screenshot: null }));
      }
    } catch {
      setError(t('errorUploadFailed'));
      setFormData((f) => ({ ...f, screenshot: null }));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.type) {
      setError(t('errorSelectType'));
      return;
    }
    if (formData.description.length < 20) {
      setError(t('errorDescriptionTooShort'));
      return;
    }
    if (!userEmail && !formData.email) {
      setError(t('errorEmailRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await disputesApi.createDispute({
        transferId,
        type: formData.type,
        description: formData.description,
        email: formData.email || userEmail,
        role,
        screenshotUrl: formData.screenshotUrl || undefined,
      });

      if (response.data) {
        setReference(response.data.reference);
        setStep('success');
      } else if (response.error) {
        // Check if it's a duplicate dispute error
        const errorMessage = typeof response.error === 'string'
          ? response.error
          : response.error.message || String(response.error);
        if (errorMessage.includes('already')) {
          setError(t('errorAlreadySubmitted'));
        } else {
          setError(errorMessage);
        }
      }
    } catch {
      setError(t('errorSubmitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[10000] transition-opacity duration-200"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-issue-title"
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="bg-white dark:bg-[oklch(0.24_0_0)] rounded-lg shadow-xl dark:shadow-black/40 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <h2
              id="report-issue-title"
              className="text-lg font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]"
            >
              {step === 'form' && t('title')}
              {step === 'success' && t('successTitle')}
              {step === 'existing' && t('existingTitle')}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-600 dark:hover:text-[oklch(0.75_0_0)] rounded transition-colors"
            >
              <Xmark className="w-5 h-5" />
            </button>
          </div>

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Transfer Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-1">
                  {t('transferReference')}
                </label>
                <input
                  type="text"
                  value={shortCode}
                  disabled
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-gray-500 dark:text-[oklch(0.65_0_0)] text-sm"
                />
              </div>

              {/* Email (if not authenticated) */}
              {!userEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-1">
                    {t('yourEmail')} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded focus:border-[#171717] dark:focus:border-[#5E53E0] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#5E53E0] outline-none text-sm dark:bg-[oklch(0.22_0_0)] dark:text-[oklch(0.91_0_0)]"
                    required
                  />
                </div>
              )}

              {/* Issue Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-1">
                  {t('issueType')} *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      type: e.target.value as DisputeType,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded focus:border-[#171717] dark:focus:border-[#5E53E0] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#5E53E0] outline-none text-sm dark:bg-[oklch(0.22_0_0)] dark:text-[oklch(0.91_0_0)]"
                  required
                >
                  <option value="">{t('selectIssue')}</option>
                  {ISSUE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(type.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-1">
                  {t('description')} *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder={t('descriptionPlaceholder')}
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded focus:border-[#171717] dark:focus:border-[#5E53E0] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[#5E53E0] outline-none text-sm resize-none dark:bg-[oklch(0.22_0_0)] dark:text-[oklch(0.91_0_0)]"
                  required
                />
                <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mt-1">
                  {formData.description.length}/1000 ({t('minimum20')})
                </p>
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-1">
                  {t('screenshot')}
                </label>
                <label
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded cursor-pointer transition-colors ${
                    isUploading
                      ? 'border-gray-300 dark:border-[oklch(0.30_0_0)] bg-gray-50 dark:bg-[oklch(0.22_0_0)]'
                      : 'border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]'
                  }`}
                >
                  {isUploading ? (
                    <span className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
                      {t('uploading')}
                    </span>
                  ) : formData.screenshot ? (
                    <>
                      <Check className="w-5 h-5 text-green-500 dark:text-green-400" />
                      <span className="text-sm text-gray-700 dark:text-[oklch(0.75_0_0)] truncate max-w-[200px]">
                        {formData.screenshot.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400 dark:text-[oklch(0.50_0_0)]" />
                      <span className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
                        {t('clickToUpload')}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mt-1">{t('maxFileSize')}</p>
              </div>

              {/* Error */}
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="w-full py-2.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? t('submitting') : t('submit')}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-[oklch(0.91_0_0)] mb-2">
                {t('successMessage')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)] mb-4">
                {t('successDescription')}
              </p>
              <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded p-3 mb-4">
                <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)]">{t('referenceNumber')}</p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
                  {reference}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)] mb-4">
                {t('confirmationEmailSent')}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-gray-700 dark:text-[oklch(0.75_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors"
              >
                {t('close')}
              </button>
            </div>
          )}

          {step === 'existing' && existingDispute && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Check className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-[oklch(0.91_0_0)] mb-2">
                {t('existingMessage')}
              </h3>
              <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded p-3 mb-4">
                <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)]">{t('referenceNumber')}</p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
                  {existingDispute.reference}
                </p>
                <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)] mt-2">{t('status')}</p>
                <p className="text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] capitalize">
                  {existingDispute.status.replace('_', ' ')}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)] mb-4">
                {t('existingDescription')}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-gray-700 dark:text-[oklch(0.75_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors"
              >
                {t('close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default ReportIssueModal;
