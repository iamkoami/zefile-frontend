"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usersApi } from "@/services/users-api";
import { getAnalyticsConsent } from "@/components/shared/CookieConsentBanner";

interface LegalConsentModalProps {
  isOpen: boolean;
  onAccepted: () => void;
}

const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  isOpen,
  onAccepted,
}) => {
  const t = useTranslations("legalConsent");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!termsAccepted) return;

    setIsSubmitting(true);
    try {
      await usersApi.acceptLegalTerms({
        termsAccepted: true,
        privacyAccepted: true,
        cookieConsentAnalytics: getAnalyticsConsent(),
      });
      onAccepted();
    } catch {
      // If the API call fails, still allow the user to continue
      // The backend will prompt again next time
      onAccepted();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-8">
        <h2 className="text-xl font-bold text-[#171717] mb-3">
          {t("title")}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {t("description")}
        </p>

        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#87E64B] focus:ring-[#87E64B] accent-[#87E64B] flex-shrink-0"
          />
          <span className="text-sm text-gray-600">
            {t("checkboxLabel")}{" "}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#171717] font-medium underline hover:opacity-80 transition-opacity"
            >
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#171717] font-medium underline hover:opacity-80 transition-opacity"
            >
              {t("privacyPolicy")}
            </Link>
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!termsAccepted || isSubmitting}
          className="w-full bg-[#87E64B] text-[#171717] font-bold py-3 px-6 rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("accepting") : t("acceptButton")}
        </button>
      </div>
    </div>
  );
};

export default LegalConsentModal;
