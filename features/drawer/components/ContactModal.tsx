'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, User, Building, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Contact } from '@/services/contacts-api';

interface ContactModalProps {
  isOpen: boolean;
  contact?: Contact | null; // null for add, Contact for edit
  onSave: (data: { email: string; name?: string; organization?: string }) => Promise<void>;
  onCancel: () => void;
}

/**
 * ContactModal - Modal for adding/editing contacts
 * Uses React Portal to render at document body level
 */
const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  contact,
  onSave,
  onCancel,
}) => {
  const t = useTranslations('contacts');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!contact;

  // Track mounted state for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Initialize form when modal opens or contact changes
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        setEmail(contact.email || '');
        setName(contact.name || '');
        setOrganization(contact.organization || '');
      } else {
        setEmail('');
        setName('');
        setOrganization('');
      }
      setError(null);

      // Focus email input
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, contact]);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Validate email
  const isValidEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('emailRequired'));
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError(t('invalidEmail'));
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        email: trimmedEmail.toLowerCase(),
        name: name.trim() || undefined,
        organization: organization.trim() || undefined,
      });
    } catch (err) {
      console.error('Failed to save contact:', err);
      setError(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[10000] transition-opacity duration-200"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2
              id="contact-modal-title"
              className="text-xl font-semibold text-gray-900"
            >
              {isEditMode ? t('editContactTitle') : t('addContactTitle')}
            </h2>
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Email field */}
            <div className="mb-4">
              <label
                htmlFor="contact-email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('emailLabel')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={emailInputRef}
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] transition-colors"
                  required
                />
              </div>
              {isEditMode && (
                <p className="mt-1.5 text-xs text-gray-500">
                  {t('emailEditNotice')}
                </p>
              )}
            </div>

            {/* Name field */}
            <div className="mb-4">
              <label
                htmlFor="contact-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('nameLabel')}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="contact-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] transition-colors"
                />
              </div>
            </div>

            {/* Organization field */}
            <div className="mb-6">
              <label
                htmlFor="contact-organization"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('organizationLabel')}
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="contact-organization"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder={t('organizationPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] transition-colors"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-medium text-[#171717] bg-[#87E64B] rounded-lg hover:bg-[#78d43f] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditMode ? t('saveChanges') : t('addContact')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
};

export default ContactModal;
