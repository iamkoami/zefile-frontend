'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'iconoir-react';
import { Contact } from '@/services/contacts-api';

interface ContactRowProps {
  contact: Contact;
  isSelectionMode: boolean;
  isSelected: boolean;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onAddToTransfer: (contact: Contact) => void;
  onToggleSelect: (contact: Contact) => void;
}

/**
 * ContactRow - Individual contact item in the contacts list
 * Shows email, name, organization and hover actions
 * Supports selection mode with checkboxes for bulk operations
 */
const ContactRow: React.FC<ContactRowProps> = ({
  contact,
  isSelectionMode,
  isSelected,
  onEdit,
  onDelete,
  onAddToTransfer,
  onToggleSelect,
}) => {
  const t = useTranslations('contacts');
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const showActions = (isHovered || isFocused) && !isSelectionMode;
  const hasNameOrOrg = contact.name || contact.organization;

  const handleRowClick = () => {
    if (isSelectionMode) {
      onToggleSelect(contact);
    } else {
      onAddToTransfer(contact);
    }
  };

  return (
    <div
      className={`flex items-center gap-4 py-4 px-2 group cursor-pointer rounded-lg transition-colors ${
        isSelected ? 'bg-gray-50 dark:bg-[oklch(0.22_0_0)]' : 'hover:bg-gray-50 dark:hover:bg-[oklch(0.22_0_0)]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={0}
      role="button"
      aria-label={`Contact: ${contact.email}`}
      aria-selected={isSelected}
      onClick={handleRowClick}
    >
      {/* Checkbox - only visible in selection mode */}
      {isSelectionMode && (
        <div className="flex-shrink-0">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(contact);
            }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
              isSelected
                ? 'bg-[#87E64B] border-[#87E64B]'
                : 'border-gray-300 dark:border-[oklch(0.60_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.75_0_0)]'
            }`}
            role="checkbox"
            aria-checked={isSelected}
          >
            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Contact info */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-gray-900 dark:text-[oklch(0.91_0_0)] truncate">
          {contact.email}
        </p>
        {hasNameOrOrg && (
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] truncate mt-0.5">
            {contact.name}
            {contact.name && contact.organization && ' - '}
            {contact.organization}
          </p>
        )}
      </div>

      {/* Actions - visible on hover/focus when not in selection mode */}
      <div
        className={`flex items-center gap-2 transition-opacity duration-200 ml-4 flex-shrink-0 ${
          showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(contact);
          }}
          className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.91_0_0)] underline transition-colors focus:outline-none focus:text-gray-700 dark:focus:text-[oklch(0.91_0_0)]"
        >
          {t('edit')}
        </button>
        <span className="text-gray-300 dark:text-[oklch(0.60_0_0)]">-</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(contact);
          }}
          className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.91_0_0)] underline transition-colors focus:outline-none focus:text-gray-700 dark:focus:text-[oklch(0.91_0_0)]"
        >
          {t('delete')}
        </button>
        <span className="text-gray-300 dark:text-[oklch(0.60_0_0)]">-</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToTransfer(contact);
          }}
          className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.75_0_0)] underline transition-colors focus:outline-none"
        >
          {t('addToTransfer')}
        </button>
      </div>
    </div>
  );
};

export default ContactRow;
