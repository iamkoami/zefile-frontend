'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface CancelConfirmationPanelProps {
  progress: number; // Current progress percentage to display
  onConfirmCancel: () => void;
  onContinue: () => void;
}

const CancelConfirmationPanel: React.FC<CancelConfirmationPanelProps> = ({
  progress,
  onConfirmCancel,
  onContinue
}) => {
  const t = useTranslations('upload');

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Progress Circle with Percentage */}
      <div className="relative mb-6">
        <svg className="w-32 h-32 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="#87E64B"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-[#87E64B]">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Cancel Confirmation Message */}
      <h2 className="text-lg font-bold text-black mb-6 text-center">
        {t('cancelThisTransfer')}
      </h2>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 w-full">
        {/* No Button */}
        <button
          onClick={onContinue}
          className="flex-1 py-3 px-4 bg-white border-2 border-[#171717] rounded-lg font-semibold text-[#171717] hover:bg-gray-50 transition-colors"
        >
          {t('no')}
        </button>

        {/* Yes Button */}
        <button
          onClick={onConfirmCancel}
          className="flex-1 py-3 px-4 rounded-lg font-semibold text-[#171717] hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#87E64B' }}
        >
          {t('yes')}
        </button>
      </div>
    </div>
  );
};

export default CancelConfirmationPanel;
