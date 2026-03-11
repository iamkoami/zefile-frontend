'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  WarningTriangle,
  Upload,
  Xmark,
  InfoCircle,
} from 'iconoir-react';
import {
  refundsApi,
  RefundReason,
  RefundEligibilityResponse,
  REFUND_REASON_CONFIG,
} from '@/services/refunds-api';
import LoadingPanel from '@/components/LoadingPanel';

type Step = 'check' | 'form' | 'confirm' | 'success';

interface RefundRequestPanelProps {
  transferId: string;
  transferTitle?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

/**
 * RefundRequestPanel - Request a refund for a transfer
 * Story 14-11: Refund Request Form
 */
const RefundRequestPanel: React.FC<RefundRequestPanelProps> = ({
  transferId,
  transferTitle,
  onClose,
  onSuccess,
}) => {
  const t = useTranslations('refunds');

  // State
  const [step, setStep] = useState<Step>('check');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check eligibility
  const [email, setEmail] = useState('');
  const [eligibility, setEligibility] = useState<RefundEligibilityResponse | null>(null);

  // Form
  const [selectedReason, setSelectedReason] = useState<RefundReason | null>(null);
  const [description, setDescription] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundReference, setRefundReference] = useState<string>('');

  // Reset on mount
  useEffect(() => {
    setStep('check');
    setIsLoading(false);
  }, []);

  // Check eligibility
  const handleCheckEligibility = async () => {
    if (!email) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await refundsApi.checkEligibility({ transferId, email });

      if (response.data) {
        setEligibility(response.data);
        if (response.data.eligible) {
          setStep('form');
        }
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('checkError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle screenshot selection
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError(t('invalidFileType'));
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('fileTooLarge'));
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError(null);

    // Upload screenshot
    setIsUploadingScreenshot(true);
    try {
      const response = await refundsApi.uploadScreenshot(file);
      if (response.data) {
        setScreenshotUrl(response.data.url);
      } else if (response.error) {
        setError(response.error.message);
        setScreenshotFile(null);
        setScreenshotPreview(null);
      }
    } catch (err) {
      setError(t('uploadError'));
      setScreenshotFile(null);
      setScreenshotPreview(null);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  // Remove screenshot
  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setScreenshotUrl(null);
  };

  // Validate form
  const isFormValid = () => {
    if (!selectedReason) return false;
    if (!description || description.length < 20) return false;
    return true;
  };

  // Continue to confirm
  const handleContinue = () => {
    if (!isFormValid()) return;
    setStep('confirm');
  };

  // Submit refund request
  const handleSubmit = async () => {
    if (!selectedReason || !eligibility) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await refundsApi.createRefundRequest({
        transferId,
        email,
        reason: selectedReason,
        description,
        screenshotUrl: screenshotUrl || undefined,
      });

      if (response.data) {
        setRefundReference(response.data.reference);
        setStep('success');
        onSuccess?.();
      } else if (response.error) {
        setError(response.error.message);
        setStep('form');
      }
    } catch (err) {
      setError(t('submitError'));
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format amount
  const formatAmount = (minorUnits: number, currency: string): string => {
    const amount = minorUnits / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Check step
  if (step === 'check') {
    return (
      <div>
        <h3 className="text-lg font-bold text-[#171717] mb-2">{t('requestRefund')}</h3>
        {transferTitle && (
          <p className="text-sm text-gray-500 mb-6">
            {t('forTransfer')}: <strong>{transferTitle}</strong>
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
            <WarningTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {eligibility && !eligibility.eligible && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <WarningTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">{t('notEligible')}</p>
                <p className="text-sm text-yellow-700 mt-1">{eligibility.reason}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('yourEmail')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#171717]"
            />
            <p className="text-xs text-gray-400 mt-1">{t('emailHint')}</p>
          </div>

          <button
            onClick={handleCheckEligibility}
            disabled={!email || isLoading}
            className="w-full px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isLoading ? t('checking') : t('checkEligibility')}
          </button>
        </div>
      </div>
    );
  }

  // Form step
  if (step === 'form') {
    return (
      <div>
        <button
          onClick={() => setStep('check')}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t('back')}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-2">{t('refundDetails')}</h3>

        {eligibility && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-sm text-gray-500">
              {t('refundAmount')}: <strong className="text-[#171717]">
                {formatAmount(eligibility.amountMinorUnits || 0, eligibility.currency || 'XOF')}
              </strong>
            </p>
            {eligibility.daysRemaining !== undefined && (
              <p className="text-xs text-gray-400 mt-1">
                {t('daysRemaining', { days: eligibility.daysRemaining })}
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
            <WarningTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('reason')}
            </label>
            <div className="space-y-2">
              {Object.entries(REFUND_REASON_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSelectedReason(key as RefundReason)}
                  className={`w-full p-3 border rounded-lg text-left transition-colors ${
                    selectedReason === key
                      ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-[#171717]">{config.label}</p>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#171717] resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              {description.length}/2000 ({t('minimum20')})
            </p>
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenshot')} <span className="text-gray-400">({t('optional')})</span>
            </label>
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreview}
                  alt="Screenshot"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                <button
                  onClick={handleRemoveScreenshot}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <Xmark className="w-4 h-4" />
                </button>
                {isUploadingScreenshot && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">{t('uploading')}</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#5E53E0] transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t('clickToUpload')}</p>
                  <p className="text-xs text-gray-400">{t('acceptedFormats')}</p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleScreenshotChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!isFormValid()}
            className="w-full px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {t('continue')}
          </button>
        </div>
      </div>
    );
  }

  // Confirm step
  if (step === 'confirm') {
    const reasonConfig = selectedReason ? REFUND_REASON_CONFIG[selectedReason] : null;

    return (
      <div>
        <button
          onClick={() => setStep('form')}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t('back')}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-4">{t('confirmRequest')}</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
            <WarningTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('refundAmount')}</span>
            <span className="font-medium">
              {formatAmount(eligibility?.amountMinorUnits || 0, eligibility?.currency || 'XOF')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('reason')}</span>
            <span className="font-medium">{reasonConfig?.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('email')}</span>
            <span>{email}</span>
          </div>
        </div>

        <div className="bg-[#FDF8F0] border border-[#E8E0D5] rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <InfoCircle className="w-5 h-5 text-[#5E53E0] flex-shrink-0" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-[#171717] mb-1">{t('processingNote')}</p>
              <p>{t('processingNoteText')}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep('form')}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t('submitting') : t('submitRequest')}
          </button>
        </div>
      </div>
    );
  }

  // Success step
  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-[#87E64B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-[#87E64B]" />
        </div>
        <h3 className="text-xl font-bold text-[#171717] mb-2">{t('requestSubmitted')}</h3>
        <p className="text-gray-500 mb-2">{t('requestSubmittedMessage')}</p>
        <p className="text-sm text-gray-400 mb-6">
          {t('referenceNumber')}: <strong>{refundReference}</strong>
        </p>
        <p className="text-sm text-gray-500 mb-6">{t('emailNotification')}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
        >
          {t('done')}
        </button>
      </div>
    );
  }

  return null;
};

export default RefundRequestPanel;
