'use client';

import React, { useState, useCallback } from 'react';
import { NavArrowRight, Check, ClockRotateRight } from 'iconoir-react';
import { useTranslations, useLocale } from 'next-intl';
import { TransferDto } from '@/services/transfer-api';

interface TransferItemProps {
  transfer: TransferDto;
  onClick?: (transfer: TransferDto) => void;
  onPreview: (transfer: TransferDto) => void;
  onCopyLink: (transfer: TransferDto) => void;
  onDelete: (transfer: TransferDto) => void;
  // Selection mode props
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string) => void;
}

/**
 * TransferItem - Individual transfer row in the transfers list
 * Shows file info, metadata, and hover actions
 * Click on the item navigates to transfer details
 */
const TransferItem: React.FC<TransferItemProps> = ({
  transfer,
  onClick,
  onPreview,
  onCopyLink,
  onDelete,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}) => {
  const t = useTranslations('transferItem');
  const locale = useLocale();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isActive = isHovered || isFocused;

  // Handle checkbox click
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectionChange) {
      onSelectionChange(transfer.id);
    }
  }, [onSelectionChange, transfer.id]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date based on locale
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return t('unknownDate');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t('invalidDate');
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculate total size from files with defensive checks
  const totalSize = (transfer.files || []).reduce((acc, file) => {
    const size = typeof file?.size === 'string' ? parseInt(file.size, 10) : (file?.size || 0);
    return acc + size;
  }, 0);
  const fileCount = (transfer.files || []).length;

  // Get expiry date (backend uses expireAt, some places use expiryDate)
  const expiryDateStr = transfer.expireAt || transfer.expiryDate;

  // Get created date (backend uses createdAt, some places use createdDate)
  const createdDateStr = transfer.createdAt || transfer.createdDate;

  // Calculate days until expiry
  const getDaysUntilExpiry = (): { text: string; isUrgent: boolean } => {
    if (!expiryDateStr) {
      return { text: t('noExpiration'), isUrgent: false };
    }

    const now = new Date();
    const expiry = new Date(expiryDateStr);

    if (isNaN(expiry.getTime())) {
      return { text: t('invalidDate'), isUrgent: false };
    }

    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffDays <= 0) {
      return { text: t('expired'), isUrgent: true };
    }
    if (diffHours < 24) {
      return { text: t('expiresInHours', { hours: diffHours }), isUrgent: true };
    }
    return { text: t('expiresInDays', { days: diffDays }), isUrgent: false };
  };

  const expiryInfo = getDaysUntilExpiry();
  const isExpired = transfer.status === 'expired' || transfer.status === 'cancelled' ||
    (expiryDateStr ? new Date(expiryDateStr).getTime() <= Date.now() : false);
  const downloadStatus = (transfer.downloadCount || 0) > 0 ? t('downloaded') : t('notDownloaded');
  const versionCount = transfer.versionCount || 1;

  // Get display title - use first file name or title with defensive checks
  const getDisplayTitle = (): string => {
    if (transfer.title) return transfer.title;
    const firstFile = (transfer.files || [])[0];
    if (firstFile) {
      return firstFile.filename || firstFile.fileName || t('untitled');
    }
    return t('untitled');
  };
  const displayTitle = getDisplayTitle();

  // File count text
  const fileCountText = fileCount === 1
    ? t('file', { count: fileCount })
    : t('files', { count: fileCount });

  // Handle click on the item (not on action buttons)
  const handleItemClick = () => {
    if (onClick) {
      onClick(transfer);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick();
    }
  };

  return (
    <div
      className={`relative flex items-center justify-between px-6 py-5 cursor-pointer rounded-xl transition-all duration-300 ease-out ${
        isSelected
          ? 'bg-[#87E64B]/10 ring-2 ring-[#87E64B] scale-[1.01]'
          : isActive
            ? 'bg-gray-900 scale-[1.01] shadow-lg dark:shadow-black/30'
            : 'bg-[#F9F9FA] dark:bg-[oklch(0.22_0_0)] hover:bg-gray-200 dark:hover:bg-[oklch(0.28_0_0)] scale-100'
      }`}
      onClick={selectionMode ? handleCheckboxClick : handleItemClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="button"
      aria-label={`Transfer: ${displayTitle}`}
      aria-selected={isSelected}
    >
      {/* Checkbox for selection mode - only visible when in selection mode */}
      {selectionMode && (
        <div
          className="flex items-center justify-center mr-4"
          onClick={handleCheckboxClick}
          role="checkbox"
          aria-checked={isSelected}
          tabIndex={0}
        >
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
              isSelected
                ? 'bg-[#87E64B] border-[#87E64B]'
                : 'border-gray-300 dark:border-[oklch(0.40_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.50_0_0)]'
            }`}
          >
            {isSelected && (
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Title + expired badge */}
        <div className="flex items-center gap-2">
          <h4
            className={`text-base font-bold truncate transition-colors duration-200 ${
              isSelected ? 'text-[#171717] dark:text-[oklch(0.91_0_0)]' : isActive ? 'text-white' : 'text-gray-900 dark:text-[oklch(0.91_0_0)]'
            }`}
          >
            {displayTitle}
          </h4>
          {isExpired && (
            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 transition-all duration-200 ${
              isActive ? 'opacity-100 bg-gray-700 text-gray-300' : 'opacity-0'
            }`}>
              {t('expired')}
            </span>
          )}
        </div>

        {/* Metadata and Actions container with crossfade */}
        <div className="relative h-6 mt-1">
          {/* Metadata - fades out on hover (unless in selection mode) */}
          <p
            className={`absolute inset-0 text-sm truncate transition-all duration-200 flex items-center gap-1 ${
              isSelected ? 'text-gray-700 dark:text-[oklch(0.75_0_0)]' : 'text-gray-500 dark:text-[oklch(0.65_0_0)]'
            } ${
              isActive && !selectionMode ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
            }`}
          >
            <span>{t('sentOn', { date: formatDate(createdDateStr) })} - {formatSize(totalSize)} ({fileCountText}) - {downloadStatus}</span>
            {versionCount > 1 && (
              <>
                <span>-</span>
                <span className="inline-flex items-center gap-1">
                  <ClockRotateRight className="w-3.5 h-3.5" />
                  {t('versionCount', { count: versionCount })}
                </span>
              </>
            )}
            <span>-</span>
            <span className={expiryInfo.isUrgent ? 'text-red-500' : ''}>
              {expiryInfo.text}
            </span>
          </p>

          {/* Actions - fades in on hover (hidden in selection mode) */}
          <div
            className={`absolute inset-0 flex items-center gap-1 transition-all duration-200 ${
              isActive && !selectionMode ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
            }`}
            aria-hidden={!isActive || selectionMode}
          >
            {!isExpired && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(transfer);
                  }}
                  className="text-sm text-[#87E64B] hover:text-[#9ef55e] underline transition-colors focus:outline-none"
                  tabIndex={isActive && !selectionMode ? 0 : -1}
                >
                  {t('preview')}
                </button>
                <span className="text-gray-500 mx-1">-</span>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink(transfer);
              }}
              className="text-sm text-white hover:text-gray-200 underline transition-colors focus:outline-none"
              tabIndex={isActive && !selectionMode ? 0 : -1}
            >
              {t('copyLink')}
            </button>
            <span className="text-gray-500 mx-1">-</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(transfer);
              }}
              className="text-sm text-white hover:text-gray-200 underline transition-colors focus:outline-none"
              tabIndex={isActive && !selectionMode ? 0 : -1}
            >
              {t('delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow indicator with slide animation (hidden when selected) */}
      <NavArrowRight
        className={`w-5 h-5 flex-shrink-0 ml-4 transition-all duration-200 ${
          isSelected
            ? 'opacity-0'
            : isActive
              ? 'text-white translate-x-1'
              : 'text-gray-400 dark:text-[oklch(0.50_0_0)] translate-x-0'
        }`}
        strokeWidth={1.5}
      />
    </div>
  );
};

export default TransferItem;
