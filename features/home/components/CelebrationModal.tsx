'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ShareIos, Xmark } from 'iconoir-react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import confettiAnimation from '@/public/lotties/confetti_success.json';

interface CelebrationModalProps {
  transferTitle: string;
  shortLink: string;
  onDismiss: () => void;
  onShare: () => void;
}

/**
 * CelebrationModal - Shows a confetti celebration for first transfer completion
 * Uses Lottie animation for smooth confetti effect
 * @see Story 7-3: First Transfer Celebration
 */
const CelebrationModal: React.FC<CelebrationModalProps> = ({
  transferTitle,
  shortLink,
  onDismiss,
  onShare,
}) => {
  const t = useTranslations('celebration');
  const [isVisible, setIsVisible] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Fade in modal on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  const handleShare = useCallback(() => {
    onShare();
    handleDismiss();
  }, [onShare, handleDismiss]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleDismiss}
      />

      {/* Confetti Lottie animation - covers entire viewport */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Lottie
          lottieRef={lottieRef}
          animationData={confettiAnimation}
          loop={false}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </div>

      {/* Modal content */}
      <div
        className={`relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('dismiss')}
        >
          <Xmark className="w-5 h-5 text-gray-500" />
        </button>

        {/* Celebration emoji */}
        <div className="text-center mb-4">
          <span className="text-6xl">🎉</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {t('title')}
        </h2>

        {/* Subtitle */}
        <p className="text-center text-gray-600 mb-6">
          {t('subtitle', { title: transferTitle || t('yourTransfer') })}
        </p>

        {/* Link preview */}
        <div className="bg-gray-50 rounded-lg p-3 mb-6">
          <p className="text-sm text-gray-500 mb-1">{t('yourLink')}</p>
          <p className="text-[#5E53E0] font-medium truncate">{shortLink}</p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#87E64B] text-[#171717] font-semibold rounded transition-colors hover:bg-[#78d43f]"
          >
            <ShareIos className="w-5 h-5" />
            {t('shareNow')}
          </button>
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 text-gray-600 font-medium hover:bg-gray-100 rounded transition-colors"
          >
            {t('maybeLater')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CelebrationModal;
