'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Xmark } from 'iconoir-react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
          // Filter out emails that are already added
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

    // Debounce the API call
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

    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmail();
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      // Remove last email on backspace when input is empty
      const newEmails = emails.slice(0, -1);
      onEmailsChange(newEmails);
    }
  };

  const selectSuggestion = (contact: Contact) => {
    const email = contact.email.toLowerCase();

    // Check for duplicates
    if (emails.includes(email)) {
      setInputValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // Check max limit
    if (emails.length >= maxEmails) {
      setInputError(t('maxRecipientsReached', { max: maxEmails }));
      setTimeout(() => setInputError(''), 3000);
      return;
    }

    // Add email
    onEmailsChange([...emails, email]);
    setInputValue('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setInputError('');

    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const addEmail = () => {
    const trimmedEmail = inputValue.trim().toLowerCase();

    if (!trimmedEmail) {
      return;
    }

    // Validate email format
    if (!validateEmail(trimmedEmail)) {
      setInputError(t('invalidEmailFormat'));
      setTimeout(() => setInputError(''), 3000);
      return;
    }

    // Check for duplicates (silent - no error message)
    if (emails.includes(trimmedEmail)) {
      setInputValue('');
      setShowSuggestions(false);
      // Keep focus on input
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // Check max limit
    if (emails.length >= maxEmails) {
      setInputError(t('maxRecipientsReached', { max: maxEmails }));
      setTimeout(() => setInputError(''), 3000);
      return;
    }

    // Add email
    onEmailsChange([...emails, trimmedEmail]);
    setInputValue('');
    setShowSuggestions(false);
    setInputError('');

    // Keep focus on input after adding email
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removeEmail = (emailToRemove: string) => {
    const newEmails = emails.filter(email => email !== emailToRemove);
    onEmailsChange(newEmails);

    // Keep focus on input after removing email
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleBlur = () => {
    // Delay blur handling to allow click on suggestion
    setTimeout(() => {
      if (inputValue.trim() && !showSuggestions) {
        addEmail();
      }
    }, 200);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="w-full relative">
      {/* Email chips - Scrollable area above input */}
      {emails.length > 0 && (
        <div
          className="flex flex-wrap gap-2 mb-2 overflow-y-auto"
          style={{
            maxHeight: emails.length > 2 ? '80px' : 'auto',
            padding: emails.length > 2 ? '4px 0' : '0'
          }}
        >
          {emails.map((email, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-[#87E64B] text-black px-2 py-1 rounded text-sm"
            >
              <span>{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="hover:bg-[#75D43A] rounded p-0.5 transition-colors"
              >
                <Xmark width={14} height={14} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input field with autocomplete - Always visible at bottom */}
      <div className="relative">
        <div
          className={`ze-form-input flex items-center min-h-[50px] ${
            error || inputError ? 'border-red-500' : ''
          }`}
          style={{
            padding: '8px 12px'
          }}
        >
          {emails.length < maxEmails && (
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
          )}
          {emails.length >= maxEmails && (
            <span className="text-sm text-gray-500">{t('maxRecipientsReached', { max: maxEmails })}</span>
          )}
        </div>

        {/* Autocomplete suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
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
                <span className="text-sm font-medium text-gray-900">{contact.email}</span>
                {contact.name && (
                  <span className="text-xs text-gray-500">{contact.name}</span>
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
