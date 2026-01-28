'use client';

import { useTranslations } from 'next-intl';
import { BillingPeriod } from '@/services/subscription-api';

interface BillingPeriodToggleProps {
  value: BillingPeriod;
  onChange: (period: BillingPeriod) => void;
}

export function BillingPeriodToggle({ value, onChange }: BillingPeriodToggleProps) {
  const t = useTranslations('subscription');

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
        <button
          onClick={() => onChange('monthly')}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
            value === 'monthly'
              ? 'bg-white text-[#171717] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('monthly')}
        </button>
        <button
          onClick={() => onChange('annual')}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${
            value === 'annual'
              ? 'bg-white text-[#171717] shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('annual')}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            value === 'annual'
              ? 'bg-green-100 text-green-700'
              : 'bg-green-50 text-green-600'
          }`}>
            {t('saveUpTo')}
          </span>
        </button>
      </div>
    </div>
  );
}
