'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usersApi, UserProfile } from '@/services/users-api';
import LoadingPanel from '@/components/LoadingPanel';
import ProfileSection from './sections/ProfileSection';
import DataPrivacySection from './sections/DataPrivacySection';
import SecuritySection from './sections/SecuritySection';
import DangerZoneSection from './sections/DangerZoneSection';

/**
 * AccountSettingsContent - Main account settings page
 * Story 17.5, 17.6, 17.7: Account Settings & Privacy Controls
 *
 * Sections:
 * - ProfileSection: Edit name, view email (read-only), edit phone
 * - DataPrivacySection: GDPR data processing consent toggle
 * - SecuritySection: Logout from all devices
 */
const AccountSettingsContent: React.FC = () => {
  const t = useTranslations('account');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await usersApi.getCurrentUser();
      if (response.data) {
        setUser(response.data);
      } else if (response.error) {
        setError(response.error.message || t('loadProfileError'));
      }
    } catch {
      setError(t('loadProfileError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    // Note: ProfileSection handles localStorage update and dispatches auth-state-change event
  };

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadUserProfile}
          className="px-4 py-2 bg-[#87E64B] text-[#171717] rounded hover:bg-[#78d43f] font-medium"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h3 className="text-xl font-semibold text-[#171717]">
          {t('settingsTitle')}
        </h3>
        <p className="text-gray-500 mt-1">{t('settingsDescription')}</p>
      </div>

      {/* Profile Section */}
      <ProfileSection
        user={user}
        onUpdate={handleUserUpdate}
      />

      {/* Data & Privacy Section */}
      <DataPrivacySection />

      {/* Security Section */}
      <SecuritySection />

      {/* Danger Zone Section (Account Deletion) */}
      <DangerZoneSection />
    </div>
  );
};

export default AccountSettingsContent;
