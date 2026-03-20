'use client';

import React from 'react';
import { Search } from 'iconoir-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

/**
 * SearchInput - Reusable search input component
 * Matches the design from ZeFile reference screens
 * Clean border, proper icon alignment, subtle focus state
 */
const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
        strokeWidth={1.5}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 pl-14 pr-5 bg-white dark:bg-[var(--input)] border border-[#171717] dark:border-[var(--border)] rounded text-base text-gray-900 dark:text-[var(--foreground)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.40_0_0)] focus:outline-none transition-colors"
      />
    </div>
  );
};

export default SearchInput;
