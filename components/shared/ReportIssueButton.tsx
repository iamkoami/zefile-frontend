'use client';

import React, { useState } from 'react';
import { WarningTriangle } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import ReportIssueModal from './ReportIssueModal';

interface ReportIssueButtonProps {
  transferId: string;
  shortCode: string;
  userEmail?: string;
  role: 'sender' | 'recipient';
  variant?: 'link' | 'button' | 'icon';
  className?: string;
}

/**
 * ReportIssueButton - Opens the Report Issue modal
 * Can be displayed as a link or a button
 */
const ReportIssueButton: React.FC<ReportIssueButtonProps> = ({
  transferId,
  shortCode,
  userEmail,
  role,
  variant = 'link',
  className = '',
}) => {
  const t = useTranslations('dispute');
  const [showModal, setShowModal] = useState(false);

  if (variant === 'button') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors ${className}`}
        >
          <WarningTriangle className="w-4 h-4" />
          {t('reportIssue')}
        </button>

        {showModal && (
          <ReportIssueModal
            transferId={transferId}
            shortCode={shortCode}
            userEmail={userEmail}
            role={role}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Icon variant - matches drawer action button style
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors ${className}`}
          aria-label={t('reportIssue')}
        >
          <WarningTriangle className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs">{t('report')}</span>
        </button>

        {showModal && (
          <ReportIssueModal
            transferId={transferId}
            shortCode={shortCode}
            userEmail={userEmail}
            role={role}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors ${className}`}
      >
        <WarningTriangle className="w-4 h-4" />
        {t('reportIssue')}
      </button>

      {showModal && (
        <ReportIssueModal
          transferId={transferId}
          shortCode={shortCode}
          userEmail={userEmail}
          role={role}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ReportIssueButton;
