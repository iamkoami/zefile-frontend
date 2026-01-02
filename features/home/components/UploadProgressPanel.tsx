'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface UploadProgressPanelProps {
  progress: number; // 0-100
  uploadedSize: number; // in bytes
  totalSize: number; // in bytes
  estimatedTimeRemaining: number; // in seconds
  onCancel: () => void;
  isComplete?: boolean; // New prop for success state
}

const UploadProgressPanel: React.FC<UploadProgressPanelProps> = ({
  progress,
  uploadedSize,
  totalSize,
  estimatedTimeRemaining,
  onCancel,
  isComplete = false
}) => {
  const t = useTranslations('upload');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [showCheck, setShowCheck] = useState(false);

  // Animated counter effect
  useEffect(() => {
    if (isComplete) {
      // When complete, animate to 100 then show checkmark
      const timer = setTimeout(() => setShowCheck(true), 500);
      return () => clearTimeout(timer);
    }

    // Rolling animation for the number
    const step = progress > displayProgress ? 1 : -1;
    const duration = 50; // milliseconds per step

    if (Math.abs(progress - displayProgress) > 0.5) {
      const timer = setTimeout(() => {
        setDisplayProgress(prev => {
          const next = prev + step;
          if (step > 0) {
            return Math.min(next, progress);
          } else {
            return Math.max(next, progress);
          }
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [progress, displayProgress, isComplete]);

  // Format bytes to human-readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} ${t('seconds')}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    if (remainingSeconds > 0) {
      return `${minutes} ${t('minutes')} ${remainingSeconds} ${t('seconds')}`;
    }
    return `${minutes} ${t('minutes')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Progress Number with Gradient or Success Checkmark */}
      <div className="relative mb-6">
        <div
          className="flex items-center justify-center transition-all duration-500"
          style={{
            background: `linear-gradient(180deg, rgba(135, 230, 75, 0.5) 0%, #87E64B 100%)`,
            borderRadius: showCheck ? '50%' : '12px',
            padding: '24px',
            minWidth: showCheck ? '280px' : '280px',
            minHeight: showCheck ? '280px' : 'auto'
          }}
        >
          {showCheck ? (
            // Success checkmark
            <div className="animate-fadeIn">
              <svg
                width="140"
                height="140"
                viewBox="0 0 140 140"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="animate-scaleIn"
              >
                <path
                  d="M35 70L60 95L105 45"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-checkmark"
                />
              </svg>
            </div>
          ) : (
            // Progress number
            <>
              <span
                className="font-bold transition-all duration-100"
                style={{
                  fontSize: '190px',
                  lineHeight: '1',
                  background: 'linear-gradient(180deg, rgba(135, 230, 75, 0.5) 0%, #87E64B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                {Math.round(displayProgress)}
              </span>
              <span
                className="font-bold ml-2"
                style={{
                  fontSize: '32px',
                  lineHeight: '1',
                  color: '#87E64B'
                }}
              >
                %
              </span>
            </>
          )}
        </div>
      </div>

      {/* Transfer Processing Message */}
      <h2 className="text-lg font-bold text-black mb-2 text-center">
        {t('transferProcessing')}
      </h2>

      {/* Upload Stats */}
      <p className="text-sm text-gray-600 text-center mb-1">
        {t('sendingFiles')} {formatBytes(uploadedSize)} {t('of')} {formatBytes(totalSize)}
      </p>

      {/* Estimated Time Remaining */}
      <p className="text-sm text-gray-600 text-center mb-6">
        {t('remainingTime')} {formatTimeRemaining(estimatedTimeRemaining)}
      </p>

      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="ze-form-input w-full text-center font-semibold text-[#171717] hover:bg-gray-50 transition-colors"
      >
        {t('cancel')}
      </button>
    </div>
  );
};

export default UploadProgressPanel;
