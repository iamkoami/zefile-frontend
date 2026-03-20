'use client';

import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  'aria-describedby'?: string;
}

/**
 * Toggle - Accessible switch component
 * Uses proper ARIA attributes for screen readers
 * Supports keyboard navigation (Space/Enter to toggle)
 */
const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  id,
  'aria-describedby': ariaDescribedBy,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full shrink-0
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-[#87E64B] focus:ring-offset-2
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${checked ? 'bg-[#87E64B]' : 'bg-gray-200 dark:bg-[oklch(0.35_0_0)]'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full shadow-sm
          transition-all duration-200 ease-in-out
          ${checked ? 'translate-x-6 bg-[#171717]' : 'translate-x-1 bg-white'}
        `}
      />
    </button>
  );
};

export default Toggle;
