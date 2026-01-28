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
        className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        strokeWidth={1.5}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-14 pl-14 pr-5 bg-white border border-[#171717] rounded text-base text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors"
      />
    </div>
  );
};

export default SearchInput;
