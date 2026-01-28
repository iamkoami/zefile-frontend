'use client';

import React from 'react';
import { Check } from 'iconoir-react';
import { useTranslations } from 'next-intl';

export type TransferStatusLevel = 'sent' | 'paid' | 'downloaded';

interface StatusCheckmarksProps {
  status: TransferStatusLevel;
  className?: string;
  showLabels?: boolean;
}

/**
 * StatusCheckmarks Component
 * Displays transfer progress as checkmarks:
 * - ✓ Sent (transfer created)
 * - ✓✓ Paid (payment received)
 * - ✓✓✓ Downloaded (first download completed)
 */
export function StatusCheckmarks({
  status,
  className = '',
  showLabels = false
}: StatusCheckmarksProps) {
  const t = useTranslations('payment');

  const getCheckmarkCount = (): number => {
    switch (status) {
      case 'sent':
        return 1;
      case 'paid':
        return 2;
      case 'downloaded':
        return 3;
      default:
        return 1;
    }
  };

  const getStatusLabel = (): string => {
    switch (status) {
      case 'sent':
        return t('statusSent');
      case 'paid':
        return t('statusPaid');
      case 'downloaded':
        return t('statusDownloaded');
      default:
        return '';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'downloaded':
        return 'text-[#87E64B]'; // Green for completed
      case 'paid':
        return 'text-[#5E53E0]'; // Purple for paid
      case 'sent':
      default:
        return 'text-gray-400'; // Gray for sent only
    }
  };

  const checkmarkCount = getCheckmarkCount();
  const colorClass = getStatusColor();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: checkmarkCount }).map((_, index) => (
          <Check
            key={index}
            className={`w-4 h-4 ${colorClass} ${index > 0 ? '-ml-1' : ''}`}
            strokeWidth={2.5}
          />
        ))}
      </div>
      {showLabels && (
        <span className={`text-sm font-medium ${colorClass}`}>
          {getStatusLabel()}
        </span>
      )}
    </div>
  );
}

export default StatusCheckmarks;
