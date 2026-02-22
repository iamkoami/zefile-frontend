"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Cookie } from "iconoir-react";

const STORAGE_KEY = "zefile_cookie_consent";
const LEGAL_VERSION = process.env.NEXT_PUBLIC_LEGAL_VERSION || "2026-02-22";
const MAX_AGE_MONTHS = 13;

interface CookieConsent {
  version: string;
  essential: boolean;
  analytics: boolean;
  consentDate: string;
  policyVersion: string;
}

function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function isConsentValid(consent: CookieConsent): boolean {
  if (consent.policyVersion !== LEGAL_VERSION) return false;

  const consentDate = new Date(consent.consentDate);
  const maxAge = new Date();
  maxAge.setMonth(maxAge.getMonth() - MAX_AGE_MONTHS);
  if (consentDate < maxAge) return false;

  return true;
}

export function saveConsent(analytics: boolean): void {
  const consent: CookieConsent = {
    version: "1",
    essential: true,
    analytics,
    consentDate: new Date().toISOString(),
    policyVersion: LEGAL_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));

  // Dispatch event so PostHogProvider can react
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: consent }));
}

export function getAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  if (!consent || !isConsentValid(consent)) return false;
  return consent.analytics;
}

interface CookieConsentBannerProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsToggle, setAnalyticsToggle] = useState(false);

  const dismissingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      const outer = requestAnimationFrame(() => {
        const inner = requestAnimationFrame(() => setEntered(true));
        rafRef.current = inner;
      });
      rafRef.current = outer;
    };

    if (forceOpen) {
      const consent = getStoredConsent();
      setAnalyticsToggle(consent?.analytics ?? false);
      show();
      return;
    }

    const consent = getStoredConsent();
    if (!consent || !isConsentValid(consent)) {
      show();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [forceOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const dismiss = useCallback(() => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    setEntered(false);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setShowCustomize(false);
      dismissingRef.current = false;
      onClose?.();
    }, 300);
  }, [onClose]);

  const handleAcceptAll = useCallback(() => {
    saveConsent(true);
    dismiss();
  }, [dismiss]);

  const handleRefuse = useCallback(() => {
    saveConsent(false);
    dismiss();
  }, [dismiss]);

  const handleSavePreferences = useCallback(() => {
    saveConsent(analyticsToggle);
    dismiss();
  }, [analyticsToggle, dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9000] p-4 md:p-6 transition-all duration-300 ease-out ${
        entered
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      }`}
    >
      <div
        className={`max-w-4xl mx-auto bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-[border-radius] duration-300 ease-in-out ${
          showCustomize
            ? "rounded-2xl"
            : "rounded-2xl md:rounded-[60px]"
        }`}
      >
        {/* Compact banner row */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 px-5 py-3.5 md:px-7 md:py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Cookie className="w-6 h-6 text-[#171717] shrink-0" strokeWidth={1.5} />
            <p className="text-sm text-[#171717]">
              {t("bannerText")}{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 text-gray-500 hover:text-[#171717] transition-colors"
              >
                {t("privacyPolicyLink")}
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="text-sm font-medium text-[#171717] underline underline-offset-4 hover:no-underline transition-all whitespace-nowrap px-1 py-1.5"
            >
              {t("customize")}
            </button>
            <button
              onClick={handleRefuse}
              className="text-sm font-medium text-[#171717] border border-gray-300 hover:border-[#171717] px-5 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              {t("essentialOnly")}
            </button>
            <button
              onClick={handleAcceptAll}
              className="text-sm font-semibold text-[#171717] bg-[#87E64B] hover:bg-[#78d43f] px-5 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              {t("acceptAll")}
            </button>
          </div>
        </div>

        {/* Preferences panel — smooth expand via CSS grid */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: showCustomize ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden min-h-0">
            <div className="px-5 md:px-7 pb-5 md:pb-6">
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-base font-semibold text-[#171717] mb-4">
                  {t("preferencesTitle")}
                </h3>

                {/* Essential cookies — always on */}
                <div className="flex items-start justify-between py-3 border-b border-gray-100">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-[#171717]">
                      {t("essentialLabel")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("essentialDescription")}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-medium mt-0.5">
                    {t("essentialAlwaysOn")}
                  </span>
                </div>

                {/* Analytics cookies — toggleable */}
                <div className="flex items-start justify-between py-3">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-[#171717]">
                      {t("analyticsLabel")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("analyticsDescription")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t("analyticsProvider")}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={analyticsToggle}
                    aria-label={t("analyticsLabel")}
                    onClick={() => setAnalyticsToggle(!analyticsToggle)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 mt-0.5 shrink-0 ${
                      analyticsToggle ? "bg-[#87E64B]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                        analyticsToggle ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    href="/privacy"
                    className="text-xs text-gray-500 underline hover:text-[#171717] transition-colors"
                  >
                    {t("privacyPolicyLink")}
                  </Link>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowCustomize(false)}
                      className="text-sm text-gray-500 hover:text-[#171717] transition-colors px-3 py-2"
                    >
                      {t("back")}
                    </button>
                    <button
                      onClick={handleSavePreferences}
                      className="text-sm font-semibold text-[#171717] bg-[#87E64B] hover:bg-[#78d43f] px-5 py-2 rounded-full transition-colors"
                    >
                      {t("savePreferences")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
