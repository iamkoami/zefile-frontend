"use client";

import React, { useState, useEffect } from "react";
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
        className={`ze-auth-panel fixed top-0 right-0 h-full bg-white z-[9999] shadow-2xl transition-transform duration-500 ease-in-out ${
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
          className="ze-auth-close absolute top-6 left-8 w-12 h-12 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
          aria-label="Close"
        >
          <Xmark className="w-6 h-6 text-gray-600" />
        </button>

        {/* Content */}
        <div className="ze-auth-panel-content h-full flex flex-col pt-24 pb-12">
          {/* Title and Subtitle - centered */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {mode === "signup" ? t("joinTitle") : t("welcomeBackTitle")}
            </h1>
            <p className="text-base text-gray-500">
              {mode === "signup" ? t("joinSubtitle") : t("welcomeBackSubtitle")}
            </p>
          </div>

          {/* Tabs - centered */}
          <div className="ze-auth-tabs flex justify-center mt-6 mb-2">
            <div className="inline-flex bg-[#FFF5F0] rounded-lg p-1.5">
              <button
                onClick={() => setActiveTab("phone")}
                className={`ze-auth-tab px-10 py-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === "phone"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("phoneTab")}
              </button>
              <button
                onClick={() => setActiveTab("email")}
                className={`ze-auth-tab px-10 py-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === "email"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("emailTab")}
              </button>
            </div>
          </div>

          {/* Tab Content - full width with symmetric padding */}
          <div className="ze-auth-form-container flex-1 flex flex-col justify-center px-20 md:px-28 lg:px-36">
            {activeTab === "email" && <EmailAuthForm onSuccess={onClose} />}
            {activeTab === "phone" && <PhoneAuthForm onSuccess={onClose} />}

            {/* Privacy Notice (signup only) */}
            {mode === "signup" && (
              <p className="text-sm text-gray-500 mt-16 max-w-xl">
                {t("privacyNotice")}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPanel;
