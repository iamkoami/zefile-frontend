'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Sparks } from 'iconoir-react';
import { subscriptionApi } from '@/services/subscription-api';

interface TrialStatus {
  hasUsedTrial: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  trialActive: boolean;
  daysRemaining?: number;
}

interface TrialCountdownProps {
  /** Size variant */
  variant?: 'badge' | 'banner' | 'compact';
  /** Additional class names */
  className?: string;
  /** Callback when upgrade is clicked */
  onUpgrade?: () => void;
}

/**
 * TrialCountdown - Displays trial status with countdown
 *
 * Variants:
 * - badge: Small pill-shaped indicator for headers
 * - banner: Full-width banner for prominent display
 * - compact: Minimal version for side panels
 */
export function TrialCountdown({
  variant = 'badge',
  className = '',
  onUpgrade,
}: TrialCountdownProps) {
  const t = useTranslations('subscription');
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      try {
        const response = await subscriptionApi.getTrialStatus();
        if (response.data) {
          setTrialStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch trial status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrialStatus();
  }, []);

  // Don't render if loading, no trial active, or trial already used
  if (isLoading || !trialStatus?.trialActive) {
    return null;
  }

  const daysRemaining = trialStatus.daysRemaining ?? 0;
  const isUrgent = daysRemaining <= 2;
  const isLastDay = daysRemaining <= 1;

  // Badge variant - compact pill for header
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          isUrgent
            ? 'bg-amber-100 text-amber-800'
            : 'bg-purple-100 text-purple-800'
        } ${className}`}
      >
        <Sparks className="h-3 w-3" />
        <span>
          {isLastDay
            ? t('trialLastDay')
            : t('trialDaysRemaining', { days: daysRemaining })}
        </span>
      </div>
    );
  }

  // Banner variant - full-width with upgrade CTA
  if (variant === 'banner') {
    return (
      <div
        className={`w-full px-4 py-3 ${
          isUrgent ? 'bg-amber-500' : 'bg-[#5E53E0]'
        } ${className}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 flex-shrink-0 text-white" />
            <p className="text-sm font-medium text-white">
              {isLastDay
                ? t('trialEndsToday')
                : t('trialEndsIn', { days: daysRemaining })}
            </p>
          </div>

          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="rounded bg-white px-3 py-1.5 text-sm font-bold text-[#171717] hover:bg-gray-100"
            >
              {t('upgradeNow')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact variant - minimal for sidebars
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-3 ${
        isUrgent
          ? 'border-amber-200 bg-amber-50'
          : 'border-purple-200 bg-purple-50'
      } ${className}`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          isUrgent ? 'bg-amber-100' : 'bg-purple-100'
        }`}
      >
        <Clock className={`h-4 w-4 ${isUrgent ? 'text-amber-600' : 'text-purple-600'}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${isUrgent ? 'text-amber-800' : 'text-purple-800'}`}>
          {t('freeTrial')}
        </p>
        <p className={`text-xs ${isUrgent ? 'text-amber-600' : 'text-purple-600'}`}>
          {isLastDay
            ? t('endsToday')
            : t('daysLeft', { days: daysRemaining })}
        </p>
      </div>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          className={`rounded px-2 py-1 text-xs font-medium ${
            isUrgent
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {t('upgrade')}
        </button>
      )}
    </div>
  );
}
