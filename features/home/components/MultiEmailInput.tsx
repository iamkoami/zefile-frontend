'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Xmark } from 'iconoir-react';
import { useTranslations } from 'next-intl';

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
  const inputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addEmail();
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      // Remove last email on backspace when input is empty
      const newEmails = emails.slice(0, -1);
      onEmailsChange(newEmails);
    }
  };

  const addEmail = () => {
    const trimmedEmail = inputValue.trim();

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
    // Add email on blur if there's input
    if (inputValue.trim()) {
      addEmail();
    }
  };

  return (
    <div className="w-full">
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

      {/* Input field - Always visible at bottom */}
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
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={emails.length === 0 ? (placeholder || t('placeholder')) : ''}
            className="w-full outline-none bg-transparent"
            style={{ border: 'none', height: 'auto', padding: '0' }}
          />
        )}
        {emails.length >= maxEmails && (
          <span className="text-sm text-gray-500">{t('maxRecipientsReached', { max: maxEmails })}</span>
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
