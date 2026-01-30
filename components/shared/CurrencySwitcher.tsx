"use client";

import React, { useState, useEffect, useRef } from "react";
import { NavArrowDown } from "iconoir-react";
import {
  useCurrencyStore,
  COUNTRY_CONFIG,
  ALL_COUNTRY_CODES,
} from "@/stores/currency-store";

const CurrencySwitcher = () => {
  const { countryCode, setCountryCode, hydrate, isHydrated } = useCurrencyStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hydrate store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setCountryCode(code);
    setIsDropdownOpen(false);
  };

  // Show current currency code (e.g., NGN, USD, XOF)
  const currentConfig = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.DEFAULT;
  const { pricing } = useCurrencyStore();

  if (!isHydrated) {
    return (
      <div className="px-3 py-1.5 text-sm font-medium text-gray-400">
        ---
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors text-gray-600 hover:bg-gray-100"
      >
        <span className="text-base">{currentConfig.flag}</span>
        <span>{pricing.currency}</span>
        <NavArrowDown
          className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {ALL_COUNTRY_CODES.map((code) => {
            const config = COUNTRY_CONFIG[code];
            const isSelected = code === countryCode;

            return (
              <button
                key={code}
                onClick={() => handleSelect(code)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  isSelected ? "bg-gray-50 font-medium text-[#5E53E0]" : "text-gray-700"
                }`}
              >
                <span className="text-lg">{config.flag}</span>
                <span>{config.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CurrencySwitcher;
