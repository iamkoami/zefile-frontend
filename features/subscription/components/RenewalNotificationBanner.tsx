'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, InfoCircle } from 'iconoir-react';
import { subscriptionApi, UserSubscription } from '@/services/subscription-api';
import { authApi } from '@/services/auth-api';

interface RenewalNotificationBannerProps {
  /** Size variant */
  variant?: 'banner' | 'compact' | 'inline';
  /** Additional class names */
  className?: string;
  /** Days before renewal to show notification (default 7) */
  daysThreshold?: number;
  /** Callback when manage billing is clicked */
  onManageBilling?: () => void;
}

/**
 * RenewalNotificationBanner - Shows upcoming subscription renewal notification
 *
 * Story 3-7: Subscription renewal notifications
 *
 * Variants:
 * - banner: Full-width banner for prominent display
 * - compact: Card-style for side panels
 * - inline: Minimal inline notice
 */
export function RenewalNotificationBanner({
  variant = 'compact',
  className = '',
  daysThreshold = 7,
  onManageBilling,
}: RenewalNotificationBannerProps) {
  const t = useTranslations('billing');
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [daysUntilRenewal, setDaysUntilRenewal] = useState<number | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!authApi.isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await subscriptionApi.getCurrentSubscription();
        if (response.data) {
          setSubscription(response.data);

          // Calculate days until renewal
          if (response.data.currentPeriodEnd && response.data.status === 'active' && !response.data.cancelAtPeriodEnd) {
            const endDate = new Date(response.data.currentPeriodEnd);
            const today = new Date();
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDaysUntilRenewal(diffDays);
          }
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  // Don't render if loading, no subscription, cancelled, or not within threshold
  if (
    isLoading ||
    !subscription ||
    subscription.status !== 'active' ||
    subscription.cancelAtPeriodEnd ||
    subscription.tier === 'free' ||
    daysUntilRenewal === null ||
    daysUntilRenewal > daysThreshold ||
    daysUntilRenewal < 0
  ) {
    return null;
  }

  const isUrgent = daysUntilRenewal <= 2;
  const isToday = daysUntilRenewal <= 1;
  const renewalDate = new Date(subscription.currentPeriodEnd).toLocaleDateString();

  // Banner variant - full-width notification
  if (variant === 'banner') {
    return (
      <div
        className={`w-full px-4 py-3 ${
          isUrgent ? 'bg-amber-500' : 'bg-[#5E53E0]'
        } ${className}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 flex-shrink-0 text-white" />
            <p className="text-sm font-medium text-white">
              {isToday
                ? t('renewsToday')
                : t('renewsIn', { days: daysUntilRenewal })}
            </p>
          </div>

          {onManageBilling && (
            <button
              onClick={onManageBilling}
              className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-[#171717] hover:bg-gray-100"
            >
              {t('manageBilling')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline variant - minimal text notice
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <InfoCircle className={`h-4 w-4 ${isUrgent ? 'text-amber-500' : 'text-blue-500'}`} />
        <span className={isUrgent ? 'text-amber-700' : 'text-gray-600'}>
          {isToday
            ? t('renewsToday')
            : t('renewsIn', { days: daysUntilRenewal })}
          {' - '}
          <span className="font-medium">{renewalDate}</span>
        </span>
      </div>
    );
  }

  // Compact variant - card style for panels
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border p-4 ${
        isUrgent
          ? 'border-amber-200 bg-amber-50'
          : 'border-blue-200 bg-blue-50'
      } ${className}`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          isUrgent ? 'bg-amber-100' : 'bg-blue-100'
        }`}
      >
        <Calendar className={`h-5 w-5 ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
          {t('upcomingRenewal')}
        </p>
        <p className={`text-xs ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`}>
          {isToday
            ? t('renewsToday')
            : t('renewsIn', { days: daysUntilRenewal })}
          {' - '}
          {renewalDate}
        </p>
      </div>
      {onManageBilling && (
        <button
          onClick={onManageBilling}
          className={`rounded px-3 py-1.5 text-xs font-medium ${
            isUrgent
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {t('manage')}
        </button>
      )}
    </div>
  );
}
