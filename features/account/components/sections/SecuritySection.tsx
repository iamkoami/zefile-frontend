'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LogOut } from 'iconoir-react';
import { usersApi } from '@/services/users-api';
import { apiClient } from '@/services/api-client';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { toast } from '@/components/shared/Toast';
import { useDrawerStore } from '@/stores/drawer-store';

/**
 * SecuritySection - Security settings including logout all devices
 * Story 17.7: Frontend Security Section
 */
const SecuritySection: React.FC = () => {
  const t = useTranslations('account');
  const router = useRouter();
  const { closeDrawer } = useDrawerStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutAllDevices = async () => {
    setIsLoggingOut(true);
    try {
      const response = await usersApi.logoutAllDevices();

      if (response.data) {
        // Show success toast with count
        const count = response.data.count;
        toast.success(
          t('logoutAllSuccess', { count: count.toString() })
        );

        // Clear all local storage and auth state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          sessionStorage.clear();
        }
        apiClient.setAccessToken(null);

        // Close drawer and redirect to home
        closeDrawer();

        // Small delay for toast to be visible
        setTimeout(() => {
          router.push('/');
          // Dispatch auth state change event
          window.dispatchEvent(new CustomEvent('auth-state-change', {
            detail: { isAuthenticated: false, user: null }
          }));
        }, 500);
      } else if (response.error) {
        toast.error(response.error.message || t('logoutAllError'));
        setIsLoggingOut(false);
      }
    } catch {
      toast.error(t('logoutAllError'));
      setIsLoggingOut(false);
    }
  };

  return (
    <section className="border-t border-gray-200 pt-6 mt-6">
      <h3 className="text-lg font-semibold text-[#171717] mb-4">
        {t('securitySection')}
      </h3>

      {/* Logout All Devices */}
      <div className="flex items-start justify-between py-3">
        <div className="flex-1 pr-4">
          <p className="font-medium text-[#171717]">
            {t('logoutAllDevices')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('logoutAllDescription')}
          </p>
        </div>
        <button
          onClick={() => setShowLogoutModal(true)}
          disabled={isLoggingOut}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium text-[#171717] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          aria-label={t('logoutAllDevices')}
        >
          <LogOut className="w-4 h-4" />
          {t('logoutAllButton')}
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutAllDevices}
        title={t('logoutAllConfirmTitle')}
        message={t('logoutAllConfirmDescription')}
        confirmLabel={t('logoutAllConfirmButton')}
        cancelLabel={t('logoutAllCancel')}
        type="warning"
        isLoading={isLoggingOut}
      />
    </section>
  );
};

export default SecuritySection;
