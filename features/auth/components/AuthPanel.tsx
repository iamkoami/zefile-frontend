'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import EmailAuthForm from './EmailAuthForm';
import PhoneAuthForm from './PhoneAuthForm';

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'email' | 'phone';
}

const AuthPanel: React.FC<AuthPanelProps> = ({
  isOpen,
  onClose,
  defaultTab = 'email'
}) => {
  const t = useTranslations('auth');
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>(defaultTab);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = 'hidden';
      // Trigger animation after mounting - use double requestAnimationFrame for reliability
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      document.body.style.overflow = 'unset';
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        id="ze-auth-backdrop"
        className={`ze-auth-backdrop fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        style={{ pointerEvents: isAnimating ? 'auto' : 'none' }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        id="ze-auth-panel"
        className={`ze-auth-panel fixed top-0 right-0 h-full w-[90%] bg-white z-[9999] shadow-2xl transition-transform duration-500 ease-in-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ze-auth-close absolute top-6 left-6 w-12 h-12 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Content */}
        <div className="ze-auth-panel-content h-full flex flex-col items-center justify-center px-12 pb-12">
          {/* Tabs */}
          <div className="ze-auth-tabs flex justify-center mb-16">
            <div className="inline-flex bg-[#FFF5F0] rounded-lg p-1">
              <button
                onClick={() => setActiveTab('email')}
                className={`ze-auth-tab px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('emailTab')}
              </button>
              <button
                onClick={() => setActiveTab('phone')}
                className={`ze-auth-tab px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'phone'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('phoneTab')}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="ze-auth-form-container w-full max-w-3xl">
            {activeTab === 'email' && <EmailAuthForm onSuccess={onClose} />}
            {activeTab === 'phone' && <PhoneAuthForm onSuccess={onClose} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPanel;
