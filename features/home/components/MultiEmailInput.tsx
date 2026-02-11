'use client';

import React, { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { Xmark, Plus } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import { contactsApi, Contact } from '@/services/contacts-api';
import { authApi } from '@/services/auth-api';

interface MultiEmailInputProps {
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  placeholder?: string;
  maxEmails?: number;
  error?: string;
}

const MultiEmailInput: React.FC<MultiEmailInputProps> = ({
  emails,
  onEmailsChange,
  placeholder,
  maxEmails = 10,
  error
}) => {
  const t = useTranslations('multiEmail');
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to always have latest values (avoids stale closures in blur handler)
  const emailsRef = useRef(emails);
  emailsRef.current = emails;
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;

  // Fetch suggestions when input changes
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
          const filteredSuggestions = response.data.filter(
            (contact) => !emails.includes(contact.email.toLowerCase())
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
  }, [inputValue, emails]);

  // Close suggestions when clicking outside
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Core add logic — reads from refs so it always uses latest state
  const doAddEmail = useCallback((emailToAdd: string) => {
    const trimmed = emailToAdd.trim().toLowerCase();
    if (!trimmed) return false;

    if (!validateEmail(trimmed)) {
      setInputError(t('invalidEmailFormat'));
      setTimeout(() => setInputError(''), 3000);
      return false;
    }

    const currentEmails = emailsRef.current;

    if (currentEmails.includes(trimmed)) {
      setInputValue('');
      setShowSuggestions(false);
      return false;
    }

    if (currentEmails.length >= maxEmails) {
      setInputError(t('maxRecipientsReached', { max: maxEmails }));
      setTimeout(() => setInputError(''), 3000);
      return false;
    }

    onEmailsChange([...currentEmails, trimmed]);
    setInputValue('');
    setShowSuggestions(false);
    setInputError('');
    setIsInputOpen(false);
    return true;
  }, [maxEmails, onEmailsChange, t]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Handle suggestion navigation
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

    if (e.key === 'Escape' && inputValue === '' && emails.length > 0) {
      setIsInputOpen(false);
      return;
    }

    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      doAddEmail(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      const newEmails = emails.slice(0, -1);
      onEmailsChange(newEmails);
    }
  };

  const selectSuggestion = (contact: Contact) => {
    const email = contact.email.toLowerCase();

    if (emails.includes(email)) {
      setInputValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    if (emails.length >= maxEmails) {
      setInputError(t('maxRecipientsReached', { max: maxEmails }));
      setTimeout(() => setInputError(''), 3000);
      return;
    }

    onEmailsChange([...emails, email]);
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setInputError('');
    setIsInputOpen(false);
  };

  const removeEmail = (emailToRemove: string) => {
    const newEmails = emails.filter(email => email !== emailToRemove);
    onEmailsChange(newEmails);
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion to fire first
    setTimeout(() => {
      // Read LATEST values from refs — not stale closure values
      const currentInput = inputValueRef.current;
      const currentEmails = emailsRef.current;

      if (currentInput.trim() && !showSuggestions) {
        doAddEmail(currentInput);
      } else if (!currentInput.trim() && currentEmails.length > 0) {
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

  const inputVisible = emails.length === 0 || isInputOpen;
  const atMax = emails.length >= maxEmails;

  return (
    <div className="w-full relative">
      {/* Email chips + fixed-right add button */}
      {emails.length > 0 && (
        <div className="relative mb-2">
          <div
            className="flex flex-wrap gap-2 overflow-y-auto pr-10"
            style={{
              maxHeight: emails.length > 2 ? '80px' : 'auto',
              padding: emails.length > 2 ? '4px 0' : '0'
            }}
          >
            {emails.map((email, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-[#F9F9FA] text-[#171717] px-2 py-1 rounded text-xs"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="hover:bg-gray-200 rounded p-0.5 transition-colors"
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
              className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-[#87E64B] hover:bg-[#75D43A] transition-colors"
            >
              <Plus width={16} height={16} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* Input field — always in DOM, hidden via display:none when collapsed */}
      <div className="relative">
        {atMax ? (
          <div
            className={`ze-form-input flex items-center min-h-[50px] ${
              error || inputError ? 'border-red-500' : ''
            }`}
            style={{ padding: '8px 12px' }}
          >
            <span className="text-sm text-gray-500">{t('maxRecipientsReached', { max: maxEmails })}</span>
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
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={emails.length === 0 ? (placeholder || t('placeholder')) : ''}
              className="w-full outline-none bg-transparent"
              style={{ border: 'none', height: 'auto', padding: '0' }}
              autoComplete="off"
            />
          </div>
        )}

        {/* Autocomplete suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
            style={{ color: '#171717' }}
          >
            {suggestions.map((contact, index) => (
              <button
                key={contact.id}
                type="button"
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex flex-col ${
                  index === selectedSuggestionIndex ? 'bg-gray-100' : ''
                }`}
                onClick={() => selectSuggestion(contact)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
              >
                <span className="text-sm font-medium" style={{ color: '#171717' }}>{contact.email}</span>
                {contact.name && (
                  <span className="text-xs" style={{ color: '#6b7280' }}>{contact.name}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error messages */}
      {(error || inputError) && (
        <p className="text-sm text-red-600 mt-1">{error || inputError}</p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500 mt-1">
        {t('recipientsCount', { count: emails.length, max: maxEmails })} • {t('helperText')}
      </p>
    </div>
  );
};

export default MultiEmailInput;
