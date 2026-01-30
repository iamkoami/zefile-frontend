'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Toggle from '@/components/shared/Toggle';
import { usersApi, DataConsentResponse } from '@/services/users-api';
import { toast } from '@/components/shared/Toast';

/**
 * DataPrivacySection - GDPR-compliant data processing consent toggle
 * Story 17.6: Frontend Data & Privacy Section
 */
const DataPrivacySection: React.FC = () => {
  const t = useTranslations('account');
  const [consent, setConsent] = useState<DataConsentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadConsentStatus();
  }, []);

  const loadConsentStatus = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getDataConsent();
      if (response.data) {
        setConsent(response.data);
      }
    } catch {
      // Silently fail - user can still toggle
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (newValue: boolean) => {
    setIsUpdating(true);
    try {
      const response = await usersApi.updateDataConsent(newValue);
      if (response.data) {
        setConsent(response.data);
        toast.success(t('consentUpdated'));
      } else if (response.error) {
        toast.error(response.error.message || t('consentUpdateError'));
      }
    } catch {
      toast.error(t('consentUpdateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  const formatConsentDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Show skeleton while initially loading
  if (isLoading) {
    return (
      <section className="border-t border-gray-200 pt-6 mt-6">
        <h3 className="text-lg font-semibold text-[#171717] mb-4">
          {t('dataPrivacySection')}
        </h3>
        <div className="animate-pulse">
          <div className="flex items-start justify-between py-3">
            <div className="flex-1 pr-4">
              <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
            <div className="w-12 h-6 bg-gray-200 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-gray-200 pt-6 mt-6">
      <h3 className="text-lg font-semibold text-[#171717] mb-4">
        {t('dataPrivacySection')}
      </h3>

      {/* Toggle Row */}
      <div className="flex items-start justify-between py-3">
        <div className="flex-1 pr-4">
          <p className="font-medium text-[#171717]" id="consent-label">
            {t('dataProcessingConsent')}
          </p>
          <p className="text-sm text-gray-500 mt-1" id="consent-description">
            {t('dataProcessingDescription')}
          </p>
        </div>
        <div className="relative">
          {/* Loading indicator while updating */}
          {isUpdating && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-[#87E64B] rounded-full animate-spin" />
            </div>
          )}
          <Toggle
            checked={consent?.consent ?? false}
            onChange={handleToggle}
            disabled={isLoading || isUpdating}
            aria-describedby="consent-description"
            label={t('dataProcessingConsent')}
          />
        </div>
      </div>

      {/* Consent Date */}
      {consent?.consent && consent?.consentDate && (
        <p className="text-xs text-gray-400 mt-2">
          {t('consentGranted', { date: formatConsentDate(consent.consentDate) })}
        </p>
      )}

      {/* GDPR Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">
          {t('gdprNotice')}
        </p>
      </div>
    </section>
  );
};

export default DataPrivacySection;
