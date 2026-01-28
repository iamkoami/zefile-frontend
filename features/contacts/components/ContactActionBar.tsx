'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';

interface ContactActionBarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => Promise<void>;
  onCancel: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

/**
 * ContactActionBar - Bottom action bar for contact bulk operations
 * Fixed at the bottom of the drawer, above the footer
 */
const ContactActionBar: React.FC<ContactActionBarProps> = ({
  selectedCount,
  totalCount,
  onDelete,
  onCancel,
  onSelectAll,
  onDeselectAll,
}) => {
  const t = useTranslations('contacts');
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedCount === 0 || !mounted) return null;

  const allSelected = selectedCount === totalCount;

  const barContent = (
    <div
      className="fixed right-0 w-[70vw] px-16 z-[10000]"
      style={{ bottom: '72px' }}
      role="toolbar"
      aria-label={t('bulkActions')}
    >
      <div className="flex items-center justify-between bg-[#FDF8F0] px-6 py-4 rounded">
        {/* Left side - selection info */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {selectedCount} {selectedCount === 1 ? t('contactSelected') : t('contactsSelected')}
          </span>
          <span className="text-gray-400">-</span>
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-sm text-gray-900 underline hover:text-gray-700 transition-colors font-medium"
          >
            {allSelected ? t('deselectAll') : t('selectAll')}
          </button>
        </div>

        {/* Right side - action buttons */}
        <div className="flex items-center gap-3">
          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-[#171717] bg-[#87E64B] rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 min-w-[120px]"
          >
            {isDeleting ? t('deleting') : t('deleteAction')}
          </button>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render at body level for proper positioning
  return createPortal(barContent, document.body);
};

export default ContactActionBar;
