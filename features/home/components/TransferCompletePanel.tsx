'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Copy } from 'iconoir-react';

interface TransferCompletePanelProps {
  transferLink: string;
  shortLink: string;
  onSendAnother: () => void;
}

const TransferCompletePanel: React.FC<TransferCompletePanelProps> = ({
  transferLink,
  shortLink,
  onSendAnother
}) => {
  const t = useTranslations('upload');
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Animate progress from current to 100%
  useEffect(() => {
    const duration = 1000; // 1 second animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);

      setAnimationProgress(progress);

      if (progress < 100) {
        requestAnimationFrame(animate);
      } else {
        // Show success checkmark after progress completes
        setTimeout(() => setShowSuccess(true), 200);
      }
    };

    animate();
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Success Circle Animation */}
      <div className="relative mb-6">
        {!showSuccess ? (
          // Progress circle animating to 100%
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
              strokeDashoffset={`${2 * Math.PI * 56 * (1 - animationProgress / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
        ) : (
          // Success checkmark with fade-in animation
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              backgroundColor: '#87E64B',
              opacity: showSuccess ? 1 : 0,
              transform: showSuccess ? 'scale(1)' : 'scale(0.8)'
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Percentage text (only during animation) */}
        {!showSuccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-[#87E64B]">
              {Math.round(animationProgress)}%
            </span>
          </div>
        )}
      </div>

      {/* Transfer Sent Message */}
      <h2 className="text-lg font-bold text-black mb-2 text-center">
        {t('transferSent')}
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center mb-6">
        {t('copyLinkOrShareTransfer')}
      </p>

      {/* Link Display with Copy Button */}
      <div className="w-full mb-4">
        <div className="flex items-center gap-2 p-3 bg-white border-2 border-[#171717] rounded-lg">
          <input
            type="text"
            value={shortLink}
            readOnly
            className="flex-1 text-sm font-medium text-[#171717] bg-transparent outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="p-2 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            aria-label="Copy link"
          >
            {copied ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#87E64B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <Copy width={20} height={20} strokeWidth={2} color="#171717" />
            )}
          </button>
        </div>
      </div>

      {/* Send Another Button */}
      <button
        onClick={onSendAnother}
        className="w-full py-3 px-4 rounded-lg font-semibold text-[#171717] hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#87E64B' }}
      >
        {t('sendAnother')}
      </button>
    </div>
  );
};

export default TransferCompletePanel;
