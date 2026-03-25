"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Xmark } from "iconoir-react";
import EmailAuthForm from "./EmailAuthForm";
import PhoneAuthForm from "./PhoneAuthForm";

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "email" | "phone";
  mode?: "login" | "signup";
}

const AuthPanel: React.FC<AuthPanelProps> = ({
  isOpen,
  onClose,
  defaultTab = "email",
  mode = "signup",
}) => {
  const t = useTranslations("auth");
  const [activeTab, setActiveTab] = useState<"email" | "phone">(defaultTab);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = "hidden";
      // Trigger animation after mounting - use double requestAnimationFrame for reliability
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      document.body.style.overflow = "unset";
      // Delay unmounting to allow exit animation
      const timer = setTimeout(() => setShouldRender(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        id="ze-auth-backdrop"
        className={`ze-auth-backdrop fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        style={{ pointerEvents: isAnimating ? "auto" : "none" }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        id="ze-auth-panel"
        className={`ze-auth-panel fixed top-0 right-0 h-full bg-white dark:bg-background z-[9999] shadow-2xl transition-transform duration-500 ease-in-out ${
          isAnimating ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "calc(100% - 60px)" }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="ze-auth-close absolute top-6 left-8 w-12 h-12 rounded-lg border border-gray-300 dark:border-border flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors z-10"
          aria-label="Close"
        >
          <Xmark className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Content */}
        <div className="ze-auth-panel-content h-full flex flex-col pt-24 pb-12">
          {/* Title and Subtitle - centered */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {mode === "signup" ? t("joinTitle") : t("welcomeBackTitle")}
            </h1>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {mode === "signup" ? t("joinSubtitle") : t("welcomeBackSubtitle")}
            </p>
          </div>

          {/* Auth Form - full width with symmetric padding */}
          <div className="ze-auth-form-container flex-1 flex flex-col justify-center px-20 md:px-28 lg:px-36 mt-6">
            {/* Tab Switcher */}
            <div className="flex justify-center mb-16">
              <div className="flex bg-[#FDF8F0] dark:bg-white/5 rounded-md p-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("email")}
                  className={`px-14 py-2.5 text-sm rounded-md transition-colors ${
                    activeTab === "email"
                      ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white font-bold shadow-sm"
                      : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {t("emailTab")}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("phone")}
                  className={`px-14 py-2.5 text-sm rounded-md transition-colors ${
                    activeTab === "phone"
                      ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white font-bold shadow-sm"
                      : "text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {t("phoneTab")}
                </button>
              </div>
            </div>

            {activeTab === "email" ? (
              <EmailAuthForm
                onSuccess={onClose}
                termsAccepted={mode === "signup" ? termsAccepted : undefined}
                consentRequired={mode === "signup"}
              />
            ) : (
              <PhoneAuthForm
                onSuccess={onClose}
                termsAccepted={mode === "signup" ? termsAccepted : undefined}
                consentRequired={mode === "signup"}
              />
            )}

            {/* Terms & Privacy Checkbox (signup) / Passive notice (login) */}
            {mode === "signup" ? (
              <label className="flex items-start gap-3 mt-10 max-w-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-border text-[#87E64B] focus:ring-[#87E64B] accent-[#87E64B] flex-shrink-0"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t("termsAgreement")}{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#171717] dark:text-white font-medium underline hover:opacity-80 transition-opacity"
                  >
                    {t("termsOfService")}
                  </Link>{" "}
                  {t("and")}{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#171717] dark:text-white font-medium underline hover:opacity-80 transition-opacity"
                  >
                    {t("privacyPolicy")}
                  </Link>
                </span>
              </label>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-10 max-w-xl">
                {t("termsNotice")}{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#171717] dark:text-white font-medium underline hover:opacity-80 transition-opacity"
                >
                  {t("termsOfService")}
                </Link>{" "}
                {t("and")}{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#171717] dark:text-white font-medium underline hover:opacity-80 transition-opacity"
                >
                  {t("privacyPolicy")}
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPanel;
