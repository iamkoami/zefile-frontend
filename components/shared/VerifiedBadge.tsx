'use client';

import React from 'react';
import { CheckCircle } from 'iconoir-react';
import { useTranslations } from 'next-intl';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * VerifiedBadge - Displays a checkmark badge for KYC-verified users
 * Shows a tooltip with "Verified seller" on hover
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  showTooltip = true,
  className = '',
}) => {
  const t = useTranslations('common');

  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={showTooltip ? t('verifiedSeller') : undefined}
    >
      <CheckCircle
        className={`${sizeClasses[size]} text-[#5E53E0] fill-current`}
        strokeWidth={2}
      />
    </span>
  );
};

export default VerifiedBadge;
