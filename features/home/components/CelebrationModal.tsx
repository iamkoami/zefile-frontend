'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Share, Xmark } from 'iconoir-react';

interface CelebrationModalProps {
  transferTitle: string;
  shortLink: string;
  onDismiss: () => void;
  onShare: () => void;
}

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
}

/**
 * CelebrationModal - Shows a confetti celebration for first transfer completion
 * Includes animated confetti, celebration message, and share CTA
 */
const CelebrationModal: React.FC<CelebrationModalProps> = ({
  transferTitle,
  shortLink,
  onDismiss,
  onShare,
}) => {
  const t = useTranslations('celebration');
  const [isVisible, setIsVisible] = useState(false);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  // Generate confetti pieces on mount
  useEffect(() => {
    const colors = ['#87E64B', '#5E53E0', '#FFD93D', '#FF6B6B', '#4ECDC4', '#FF9F43'];
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2,
        rotation: Math.random() * 360,
      });
    }

    setConfetti(pieces);

    // Fade in modal
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 5 seconds
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

      {/* Confetti container */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute w-3 h-3 rounded-sm animate-confetti"
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        ))}
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
            <Share className="w-5 h-5" />
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

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
          top: -20px;
        }
      `}</style>
    </div>
  );
};

export default CelebrationModal;
