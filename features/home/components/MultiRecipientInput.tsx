'use client';

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Xmark, Plus, Mail, ChatLines } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import { contactsApi, Contact } from '@/services/contacts-api';
import { authApi } from '@/services/auth-api';
import type { TransferRecipient } from '@/types/recipient';

interface MultiRecipientInputProps {
  recipients: TransferRecipient[];
  onRecipientsChange: (recipients: TransferRecipient[]) => void;
  placeholder?: string;
  maxRecipients?: number;
  error?: string;
}

/**
 * Detects whether a raw input string should be treated as an email or
 * WhatsApp phone number. This is a UX-level heuristic — the backend
 * `RecipientDto` validator is the security boundary.
 *
 * Rules:
 * - `+` followed by 8–15 digits (E.164) → `whatsapp`
 * - `0` followed by 7–14 digits (local format) → `whatsapp` (will then fail
 *   `validateRecipient`; caller should reject with "use international format")
 * - Everything else (including empty string) → `email`
 *
 * Matches the regex in backend `src/modules/transfers/dtos/recipient.dto.ts`.
 */
export const detectRecipientType = (raw: string): 'email' | 'whatsapp' => {
  const trimmed = raw.trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return 'whatsapp';
  if (/^0\d{7,14}$/.test(trimmed)) return 'whatsapp';
  return 'email';
};

const validateRecipient = (value: string, type: 'email' | 'whatsapp'): boolean => {
  const trimmed = value.trim();
  if (type === 'email') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  }
  return /^\+[1-9]\d{7,14}$/.test(trimmed);
};

const MultiRecipientInput: React.FC<MultiRecipientInputProps> = ({
  recipients,
  onRecipientsChange,
  placeholder,
  maxRecipients = 10,
  error,
}) => {
  const t = useTranslations('multiRecipient');
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const recipientsRef = useRef(recipients);
  recipientsRef.current = recipients;
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;

  // Contact autocomplete — email-only (contacts have no phone field today)
  useEffect(() => {
    const fetchSuggestions = async () => {
      const user = authApi.getStoredUser();
      if (!user || !inputValue.trim() || inputValue.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await contactsApi.searchContacts(user.id, inputValue.trim(), 5);
        if (response.data && response.data.length > 0) {
          const existingEmails = recipients
            .filter((r) => r.type === 'email')
            .map((r) => r.value.toLowerCase());
          const filteredSuggestions = response.data.filter(
            (contact) => !existingEmails.includes(contact.email.toLowerCase())
          );
          setSuggestions(filteredSuggestions);
          setShowSuggestions(filteredSuggestions.length > 0);
          setSelectedSuggestionIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Failed to fetch contact suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(fetchSuggestions, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, recipients]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doAddRecipient = useCallback(
    (raw: string): boolean => {
      const trimmed = raw.trim();
      if (!trimmed) return false;

      const type = detectRecipientType(trimmed);

      // MVP: 0-prefixed numbers are rejected — user must provide E.164 format.
      // Follow-up: use libphonenumber-js with a default country for auto-normalization.
      if (type === 'whatsapp' && trimmed.startsWith('0')) {
        setInputError(t('invalidPhoneFormat'));
        setTimeout(() => setInputError(''), 3000);
        return false;
      }

      if (!validateRecipient(trimmed, type)) {
        setInputError(
          type === 'whatsapp' ? t('invalidPhoneFormat') : t('invalidEmailFormat')
        );
        setTimeout(() => setInputError(''), 3000);
        return false;
      }

      const value = type === 'email' ? trimmed.toLowerCase() : trimmed;
      const current = recipientsRef.current;

      // Both sides are already normalized at this point (emails lowercased above).
      const exists = current.some((r) => r.type === type && r.value === value);
      if (exists) {
        setInputValue('');
        setShowSuggestions(false);
        return false;
      }

      if (current.length >= maxRecipients) {
        setInputError(t('maxRecipientsReached', { max: maxRecipients }));
        setTimeout(() => setInputError(''), 3000);
        return false;
      }

      onRecipientsChange([...current, { type, value }]);
      setInputValue('');
      setShowSuggestions(false);
      setInputError('');
      setIsInputOpen(false);
      return true;
    },
    [maxRecipients, onRecipientsChange, t]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }
      if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }
    }

    if (e.key === 'Escape' && inputValue === '' && recipients.length > 0) {
      setIsInputOpen(false);
      return;
    }

    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      doAddRecipient(inputValue);
    } else if (
      e.key === 'Backspace' &&
      inputValue === '' &&
      recipients.length > 0
    ) {
      onRecipientsChange(recipients.slice(0, -1));
    }
  };

  const selectSuggestion = (contact: Contact) => {
    const email = contact.email.toLowerCase();
    const existingEmails = recipients
      .filter((r) => r.type === 'email')
      .map((r) => r.value.toLowerCase());

    if (existingEmails.includes(email)) {
      setInputValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    if (recipients.length >= maxRecipients) {
      setInputError(t('maxRecipientsReached', { max: maxRecipients }));
      setTimeout(() => setInputError(''), 3000);
      return;
    }

    onRecipientsChange([...recipients, { type: 'email', value: email }]);
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setInputError('');
    setIsInputOpen(false);
  };

  const removeRecipient = (index: number) => {
    onRecipientsChange(recipients.filter((_, i) => i !== index));
  };

  const handleBlur = () => {
    setTimeout(() => {
      const currentInput = inputValueRef.current;
      const currentRecipients = recipientsRef.current;

      if (currentInput.trim() && !showSuggestions) {
        doAddRecipient(currentInput);
      } else if (!currentInput.trim() && currentRecipients.length > 0) {
        setIsInputOpen(false);
      }
    }, 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const openInput = () => {
    setIsInputOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const inputVisible = recipients.length === 0 || isInputOpen;
  const atMax = recipients.length >= maxRecipients;

  return (
    <div className="w-full relative">
      {recipients.length > 0 && (
        <div className="relative mb-2">
          <div
            className="flex flex-wrap gap-2 overflow-y-auto pr-10"
            style={{
              maxHeight: recipients.length > 2 ? '80px' : 'auto',
              padding: recipients.length > 2 ? '4px 0' : '0',
            }}
          >
            {recipients.map((recipient, index) => (
              <div
                key={`${recipient.type}-${recipient.value}`}
                className="flex items-center gap-1 bg-[#F9F9FA] dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] px-2 py-1 rounded text-xs"
              >
                {recipient.type === 'email' ? (
                  <Mail width={12} height={12} strokeWidth={2} />
                ) : (
                  <ChatLines width={12} height={12} strokeWidth={2} />
                )}
                <span>{recipient.value}</span>
                <button
                  type="button"
                  onClick={() => removeRecipient(index)}
                  className="hover:bg-gray-200 dark:hover:bg-[oklch(0.35_0_0)] rounded p-0.5 transition-colors"
                >
                  <Xmark width={12} height={12} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          {!isInputOpen && !atMax && (
            <button
              type="button"
              onClick={openInput}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-[#87E64B] hover:bg-[#75D43A] text-[#171717] transition-colors"
            >
              <Plus width={16} height={16} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      <div className="relative">
        {atMax ? (
          <div
            className={`ze-form-input flex items-center min-h-[50px] ${
              error || inputError ? 'border-red-500' : ''
            }`}
            style={{ padding: '8px 12px' }}
          >
            <span className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
              {t('maxRecipientsReached', { max: maxRecipients })}
            </span>
          </div>
        ) : (
          <div
            className={`ze-form-input flex items-center min-h-[50px] ${
              error || inputError ? 'border-red-500' : ''
            }`}
            style={{
              padding: '8px 12px',
              display: inputVisible ? '' : 'none',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (text.includes(',') || text.includes(';') || text.includes('\n')) {
                  e.preventDefault();
                  const parsed = text
                    .split(/[,;\s\n]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);

                  // Batch-collect locally — doAddRecipient alone would read a stale
                  // recipientsRef.current on each call (React batches state updates
                  // within a single handler), so paste would only keep the LAST token.
                  const current = recipientsRef.current;
                  const additions: TransferRecipient[] = [];
                  let firstError: string | null = null;

                  for (const raw of parsed) {
                    if (current.length + additions.length >= maxRecipients) {
                      firstError = firstError ?? t('maxRecipientsReached', { max: maxRecipients });
                      break;
                    }
                    const trimmed = raw.trim();
                    if (!trimmed) continue;
                    const type = detectRecipientType(trimmed);
                    if (type === 'whatsapp' && trimmed.startsWith('0')) {
                      firstError = firstError ?? t('invalidPhoneFormat');
                      continue;
                    }
                    if (!validateRecipient(trimmed, type)) {
                      firstError = firstError ??
                        (type === 'whatsapp' ? t('invalidPhoneFormat') : t('invalidEmailFormat'));
                      continue;
                    }
                    const value = type === 'email' ? trimmed.toLowerCase() : trimmed;
                    const alreadyInCurrent = current.some(
                      (r) => r.type === type && r.value === value
                    );
                    const alreadyInAdditions = additions.some(
                      (r) => r.type === type && r.value === value
                    );
                    if (alreadyInCurrent || alreadyInAdditions) continue;
                    additions.push({ type, value });
                  }

                  if (additions.length > 0) {
                    onRecipientsChange([...current, ...additions]);
                    setInputValue('');
                    setIsInputOpen(false);
                  }
                  if (firstError) {
                    setInputError(firstError);
                    setTimeout(() => setInputError(''), 3000);
                  }
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={recipients.length === 0 ? placeholder || t('placeholder') : ''}
              className="w-full outline-none bg-transparent"
              style={{ border: 'none', height: 'auto', padding: '0' }}
              autoComplete="off"
            />
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg shadow-lg overflow-hidden"
            style={{ color: 'var(--foreground)' }}
          >
            {suggestions.map((contact, index) => (
              <button
                key={contact.id}
                type="button"
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors flex flex-col ${
                  index === selectedSuggestionIndex
                    ? 'bg-gray-100 dark:bg-[oklch(0.28_0_0)]'
                    : ''
                }`}
                onClick={() => selectSuggestion(contact)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  {contact.email}
                </span>
                {contact.name && (
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {contact.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {(error || inputError) && (
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error || inputError}</p>
      )}

      <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)] mt-1">
        {t('recipientsCount', { count: recipients.length, max: maxRecipients })} •{' '}
        {t('helperText')}
      </p>
    </div>
  );
};

export default MultiRecipientInput;
