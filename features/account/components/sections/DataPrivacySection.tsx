'use client';

import React, { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toIntlLocale } from '@/lib/locale';
import Toggle from '@/components/shared/Toggle';
import { usersApi, DataConsentResponse, LegalConsentStatus } from '@/services/users-api';
import { getAnalyticsConsent, saveConsent } from '@/components/shared/CookieConsentBanner';
import { toast } from '@/components/shared/Toast';

const DataPrivacySection: React.FC = () => {
  const t = useTranslations('account');
  const locale = useLocale();
  const [consent, setConsent] = useState<DataConsentResponse | null>(null);
  const [legalConsent, setLegalConsent] = useState<LegalConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [isUpdatingAnalytics, setIsUpdatingAnalytics] = useState(false);
  const [isUpdatingMarketing, setIsUpdatingMarketing] = useState(false);

  useEffect(() => {
    loadConsentStatus();
    setAnalyticsEnabled(getAnalyticsConsent());
  }, []);

  const loadConsentStatus = async () => {
    setIsLoading(true);
    try {
      const [dataResponse, legalResponse] = await Promise.all([
        usersApi.getDataConsent(),
        usersApi.getLegalConsent(),
      ]);
      if (dataResponse.data) {
        setConsent(dataResponse.data);
      }
      if (legalResponse.data) {
        setLegalConsent(legalResponse.data);
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

  const handleAnalyticsToggle = async (newValue: boolean) => {
    setIsUpdatingAnalytics(true);
    try {
      saveConsent(newValue);
      setAnalyticsEnabled(newValue);
      await usersApi.updateCookieConsent({ analytics: newValue });
      toast.success(t('consentUpdated'));
    } catch {
      toast.success(t('consentUpdated'));
    } finally {
      setIsUpdatingAnalytics(false);
    }
  };

  const handleMarketingToggle = async (newValue: boolean) => {
    setIsUpdatingMarketing(true);
    try {
      const response = await usersApi.acceptLegalTerms({
        termsAccepted: true,
        privacyAccepted: true,
        marketingConsent: newValue,
      });
      if (response.data) {
        setLegalConsent((prev) =>
          prev ? { ...prev, marketingConsent: newValue, marketingConsentAt: new Date().toISOString() } : prev,
        );
        toast.success(t('consentUpdated'));
      } else {
        toast.error(t('consentUpdateError'));
      }
    } catch {
      toast.error(t('consentUpdateError'));
    } finally {
      setIsUpdatingMarketing(false);
    }
  };

  const formatConsentDate = (date: Date | string | undefined | null): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString(toIntlLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <section className="border-t border-gray-200 pt-6 mt-6">
        <h3 className="text-lg font-bold text-[#171717] mb-4">
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
      <h3 className="text-lg font-bold text-[#171717] mb-4">
        {t('dataPrivacySection')}
      </h3>

      {/* Legal terms status */}
      {legalConsent && legalConsent.termsAccepted && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            {t('legalTermsAccepted', {
              version: legalConsent.termsVersion || '',
              date: formatConsentDate(legalConsent.termsAcceptedAt),
            })}
          </p>
        </div>
      )}

      {/* Data Processing Consent Toggle */}
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

      {consent?.consent && consent?.consentDate && (
        <p className="text-xs text-gray-400 mt-1 mb-3">
          {t('consentGranted', { date: formatConsentDate(consent.consentDate) })}
        </p>
      )}

      {/* Analytics Cookie Consent Toggle */}
      <div className="flex items-start justify-between py-3 border-t border-gray-100">
        <div className="flex-1 pr-4">
          <p className="font-medium text-[#171717]" id="analytics-label">
            {t('analyticsCookieConsent')}
          </p>
          <p className="text-sm text-gray-500 mt-1" id="analytics-description">
            {t('analyticsCookieDescription')}
          </p>
        </div>
        <div className="relative">
          {isUpdatingAnalytics && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-[#87E64B] rounded-full animate-spin" />
            </div>
          )}
          <Toggle
            checked={analyticsEnabled}
            onChange={handleAnalyticsToggle}
            disabled={isUpdatingAnalytics}
            aria-describedby="analytics-description"
            label={t('analyticsCookieConsent')}
          />
        </div>
      </div>

      {/* Marketing Consent Toggle */}
      <div className="flex items-start justify-between py-3 border-t border-gray-100">
        <div className="flex-1 pr-4">
          <p className="font-medium text-[#171717]" id="marketing-label">
            {t('marketingConsent')}
          </p>
          <p className="text-sm text-gray-500 mt-1" id="marketing-description">
            {t('marketingDescription')}
          </p>
        </div>
        <div className="relative">
          {isUpdatingMarketing && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-[#87E64B] rounded-full animate-spin" />
            </div>
          )}
          <Toggle
            checked={legalConsent?.marketingConsent ?? false}
            onChange={handleMarketingToggle}
            disabled={isUpdatingMarketing}
            aria-describedby="marketing-description"
            label={t('marketingConsent')}
          />
        </div>
      </div>

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
