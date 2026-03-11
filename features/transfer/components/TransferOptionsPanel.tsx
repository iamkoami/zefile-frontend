'use client';

import React, { useRef } from 'react';
import { Xmark, MediaImagePlus } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import {
  UseTierLimitsReturn,
  SubscriptionTier,
  getTierTranslationKey,
} from '@/hooks/useTierLimits';
import { toast } from '@/components/shared/Toast';
import Image from 'next/image';

/**
 * Transfer options state - shared with page.tsx
 */
export interface TransferOptions {
  accessControl: 'private' | 'password' | 'public';
  validityDuration: string;
  password: string;
  /** Size limit in GB as string for form handling (e.g., "2", "10", "50") */
  sizeLimit: string;
  /** Custom wallpaper file selected for upload (undefined = no wallpaper) */
  wallpaperFile?: File;
  /** Local blob URL for wallpaper preview */
  wallpaperPreview?: string;
}

interface TransferOptionsPanelProps {
  isVisible: boolean;
  hasFilesSelected?: boolean;
  /** Transfer options controlled by parent (REQUIRED) */
  options: TransferOptions;
  /** Callback when options change (REQUIRED) */
  onOptionsChange: (options: TransferOptions) => void;
  /** Callback to close the panel */
  onClose?: () => void;
  /** User's subscription tier for tier-limited options */
  userTier?: SubscriptionTier;
  /** Dynamic tier limits data from API */
  tierLimitsData?: UseTierLimitsReturn;
}

const MAX_WALLPAPER_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_WALLPAPER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const TransferOptionsPanel: React.FC<TransferOptionsPanelProps> = ({
  isVisible,
  hasFilesSelected = false,
  options,
  onOptionsChange,
  onClose,
  userTier = 'free',
  tierLimitsData,
}) => {
  const t = useTranslations('transferOptions');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler for access control - clears password when switching away from password mode
  const handleAccessControlChange = (value: string) => {
    const newAccessControl = value as TransferOptions['accessControl'];
    onOptionsChange({
      ...options,
      accessControl: newAccessControl,
      // Clear password when switching away from password mode
      password: newAccessControl === 'password' ? options.password : '',
    });
  };

  // Handler for validity duration - validates selection is within tier limits
  const handleValidityDurationChange = (value: string) => {
    // Handle empty/placeholder selection
    if (!value) {
      onOptionsChange({ ...options, validityDuration: '' });
      return;
    }
    const days = parseInt(value, 10);
    // Guard against NaN from invalid input
    if (isNaN(days)) return;
    // Only allow selection if available for user's tier (defensive check)
    if (tierLimitsData?.isValidityAvailable(days, userTier) ?? true) {
      onOptionsChange({ ...options, validityDuration: value });
    }
  };

  // Handler for size limit - validates selection is within tier limits
  const handleSizeLimitChange = (value: string) => {
    // Handle empty/placeholder selection
    if (!value) {
      onOptionsChange({ ...options, sizeLimit: '' });
      return;
    }
    // Value is in GB
    const sizeGB = parseInt(value, 10);
    // Guard against NaN from invalid input
    if (isNaN(sizeGB)) return;
    // Only allow selection if available for user's tier (defensive check)
    if (tierLimitsData?.isSizeLimitAvailable(sizeGB, userTier) ?? true) {
      onOptionsChange({ ...options, sizeLimit: value });
    }
  };

  // Handler for wallpaper file selection
  const handleWallpaperSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected
    e.target.value = '';

    if (!ALLOWED_WALLPAPER_TYPES.includes(file.type)) {
      toast.error(t('invalidFileType'));
      return;
    }

    if (file.size > MAX_WALLPAPER_SIZE) {
      toast.error(t('fileTooLarge'));
      return;
    }

    // Revoke old preview URL if exists
    if (options.wallpaperPreview) {
      URL.revokeObjectURL(options.wallpaperPreview);
    }

    const previewUrl = URL.createObjectURL(file);
    onOptionsChange({
      ...options,
      wallpaperFile: file,
      wallpaperPreview: previewUrl,
    });
  };

  // Handler for removing wallpaper
  const handleRemoveWallpaper = () => {
    if (options.wallpaperPreview) {
      URL.revokeObjectURL(options.wallpaperPreview);
    }
    onOptionsChange({
      ...options,
      wallpaperFile: undefined,
      wallpaperPreview: undefined,
    });
  };

  // Reset to valid defaults if current selections become unavailable (e.g., tier downgrade)
  React.useEffect(() => {
    if (!tierLimitsData || tierLimitsData.isLoading) return;

    let needsUpdate = false;
    const updates: Partial<TransferOptions> = {};

    // Check validity duration
    if (options.validityDuration) {
      const currentDays = parseInt(options.validityDuration, 10);
      if (!isNaN(currentDays) && !tierLimitsData.isValidityAvailable(currentDays, userTier)) {
        updates.validityDuration = tierLimitsData.getDefaultValidity(userTier);
        needsUpdate = true;
      }
    }

    // Check size limit (value is in GB)
    if (options.sizeLimit) {
      const currentSizeGB = parseInt(options.sizeLimit, 10);
      if (!isNaN(currentSizeGB) && !tierLimitsData.isSizeLimitAvailable(currentSizeGB, userTier)) {
        updates.sizeLimit = tierLimitsData.getDefaultSizeLimit(userTier);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      onOptionsChange({ ...options, ...updates });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTier, tierLimitsData?.isLoading]);

  // Minimum password length requirement
  const MIN_PASSWORD_LENGTH = 8;

  // Handler for password
  const handlePasswordChange = (value: string) => {
    onOptionsChange({ ...options, password: value });
  };

  // Password validation state
  const isPasswordTooShort =
    options.accessControl === 'password' &&
    options.password.length > 0 &&
    options.password.length < MIN_PASSWORD_LENGTH;

  // Get options from tierLimitsData or use empty arrays while loading
  const validityOptions = tierLimitsData?.allValidityOptions ?? [];
  const sizeLimitOptions = tierLimitsData?.allSizeLimitOptions ?? [];

  const isWallpaperDisabled = userTier === 'free';

  return (
    <div
      id="ze-options-panel"
      className={`ze-options-panel ${isVisible ? 'visible' : ''} ${hasFilesSelected ? 'has-files-selected' : ''}`}
    >
      <div id="ze-options-panel-content" className="ze-options-panel-content">
        <div className="flex items-center justify-between mb-6">
          <h2 id="ze-options-title" className="ze-options-title text-lg font-bold text-black">
            {t('title')}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <Xmark className="w-5 h-5" />
            </button>
          )}
        </div>

        <div id="ze-options-form" className="ze-options-form space-y-4">
          {/* Access Control */}
          <div className="ze-form-field">
            <select
              id="ze-access-control"
              value={options.accessControl}
              onChange={(e) => handleAccessControlChange(e.target.value)}
              className="ze-form-select"
            >
              <option value="" disabled>{t('accessControl')}</option>
              <option value="private">{t('accessPrivate')}</option>
              <option value="public">{t('accessPublic')}</option>
              <option value="password">{t('accessPassword')}</option>
            </select>
          </div>

          {/* Validity Duration - moved to main upload form (UploadPanel) */}

          {/* Size Limit - tier-limited options from API */}
          <div className="ze-form-field">
            <select
              id="ze-size-limit"
              value={options.sizeLimit}
              onChange={(e) => handleSizeLimitChange(e.target.value)}
              className="ze-form-select"
              disabled={tierLimitsData?.isLoading}
            >
              <option value="" disabled>{tierLimitsData?.isLoading ? t('loading') : t('sizeLimitLabel')}</option>
              {sizeLimitOptions.map((option) => {
                const isAvailable = tierLimitsData?.isSizeLimitAvailable(option.sizeGB, userTier) ?? true;
                const requiredTier = !isAvailable ? tierLimitsData?.getRequiredTierForSize(option.sizeGB) : null;
                const tierBadge = requiredTier ? ` (${t(getTierTranslationKey(requiredTier))})` : '';
                return (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={!isAvailable}
                    className={!isAvailable ? 'text-gray-400' : ''}
                  >
                    {t(option.labelKey)}{tierBadge}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Password - only visible when access control is "password" */}
          {options.accessControl === 'password' && (
            <div className="ze-form-field transition-all duration-200 ease-in-out">
              <input
                type="password"
                id="ze-password"
                value={options.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder={t('setPassword')}
                className={`ze-form-input ${isPasswordTooShort ? 'border-red-500' : ''}`}
                minLength={MIN_PASSWORD_LENGTH}
              />
              {isPasswordTooShort && (
                <p className="text-red-500 text-xs mt-1">
                  {t('passwordMinLength', { min: MIN_PASSWORD_LENGTH })}
                </p>
              )}
            </div>
          )}

          {/* Wallpaper Upload */}
          <div className="ze-form-field">
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              {t('wallpaperLabel')}
              {isWallpaperDisabled && (
                <span className="ml-1 text-[#5E53E0] text-[10px] font-bold uppercase">
                  ({t('starterTier')})
                </span>
              )}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleWallpaperSelect}
              className="hidden"
              disabled={isWallpaperDisabled}
            />

            {options.wallpaperPreview ? (
              /* Selected state: preview + remove */
              <div className="relative inline-block">
                <div className="w-[80px] h-[80px] rounded border-2 border-[#87E64B] overflow-hidden">
                  <Image
                    src={options.wallpaperPreview}
                    alt={t('wallpaperPreview')}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveWallpaper}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label={t('removeWallpaper')}
                >
                  <Xmark className="w-3 h-3" />
                </button>
              </div>
            ) : (
              /* Empty state: upload area */
              <button
                type="button"
                onClick={() => !isWallpaperDisabled && fileInputRef.current?.click()}
                className={`w-full h-[60px] rounded border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
                  isWallpaperDisabled
                    ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                    : 'cursor-pointer border-gray-300 bg-gray-50 hover:border-[#5E53E0] hover:bg-gray-100'
                }`}
                disabled={isWallpaperDisabled}
              >
                <MediaImagePlus className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400">{t('uploadWallpaper')}</span>
              </button>
            )}
            <p className="text-[10px] text-gray-400 mt-1">{t('wallpaperHint')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferOptionsPanel;
