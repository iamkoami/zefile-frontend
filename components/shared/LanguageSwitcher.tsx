"use client";

import React, { useState } from "react";
import { useLocale } from "next-intl";

const LanguageSwitcher = () => {
  const currentLocale = useLocale();
  const [isChanging, setIsChanging] = useState(false);

  const changeLanguage = (newLocale: string) => {
    setIsChanging(true);

    // Set cookie to persist language preference
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`; // 1 year

    // Reload page to apply new locale
    window.location.reload();
  };

  // Only show the language that is NOT currently selected
  const alternativeLocale = currentLocale === "en" ? "fr" : "en";
  const alternativeLabel = alternativeLocale.toUpperCase();

  return (
    <button
      onClick={() => changeLanguage(alternativeLocale)}
      className="px-3 py-1.5 text-sm font-medium rounded transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
      disabled={isChanging}
    >
      {alternativeLabel}
    </button>
  );
};

export default LanguageSwitcher;
