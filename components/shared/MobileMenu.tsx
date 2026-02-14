"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Xmark, NavArrowRight } from "iconoir-react";
import LanguageSwitcher from "./LanguageSwitcher";
import CurrencySwitcher from "./CurrencySwitcher";
import { SubscriptionTier } from "@/services/subscription-api";

interface MenuItem {
  label: string;
  href?: string;
  action?: () => void;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: any;
  subscriptionTier: SubscriptionTier;
  mainMenuItems: MenuItem[];
  loggedInMenuItems: MenuItem[];
  resourcesMenuItems: MenuItem[];
  onOpenAuth: (mode: "login" | "signup") => void;
  onLogout: () => void;
  onOpenAccountSettings: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  user,
  subscriptionTier,
  mainMenuItems,
  loggedInMenuItems,
  resourcesMenuItems,
  onOpenAuth: _onOpenAuth,
  onLogout,
  onOpenAccountSettings,
}) => {
  const t = useTranslations("header");
  const tCommon = useTranslations("common");

  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Mount/unmount animation (same pattern as AuthPanel)
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      setShouldRender(true);
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 300);
    } else {
      setIsAnimating(false);
      document.body.style.overflow = "unset";
      setShowResources(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        previousActiveElement.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC key handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  // Focus trap
  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || event.key !== "Tab") return;
      const focusableElements = menuRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements || focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleTabKey);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleTabKey);
    };
  }, [handleKeyDown, handleTabKey]);

  // Handle menu item click (closes menu, then executes action)
  const handleItemClick = (item: MenuItem) => {
    onClose();
    if (item.action) {
      setTimeout(() => item.action!(), 100);
    }
  };

  if (!shouldRender) return null;

  const tierLabel =
    subscriptionTier === "free"
      ? t("freePlan")
      : subscriptionTier === "starter"
        ? t("starterPlan")
        : t("proPlan");

  return (
    <div
      ref={menuRef}
      id="ze-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={t("openMenu")}
      className={`fixed inset-0 bg-white z-[10000] flex flex-col transition-opacity duration-300 ease-in-out ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header: Logo left, Close button right */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-gray-200 flex-shrink-0">
        <Link href="/" onClick={onClose} className="flex items-center">
          <Image
            src="/zefile-logo.svg"
            alt={tCommon("appName")}
            width={120}
            height={33}
          />
        </Link>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center"
          aria-label={t("closeMenu")}
        >
          <Xmark className="w-6 h-6 text-[#171717]" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* User info section (if authenticated) */}
        {isAuthenticated && user && (
          <div className="px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#171717]">{user.email}</p>
                <p className="text-xs text-gray-500">{tierLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation items */}
        <nav className="py-2">
          {isAuthenticated ? (
            <>
              {/* Logged-in menu: Transfers, Contacts, Pricing */}
              {loggedInMenuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item)}
                  className="w-full px-6 py-4 text-left text-base font-medium text-[#171717] hover:bg-gray-50 transition-colors"
                >
                  {item.label}
                </button>
              ))}

              {/* Resources with expandable submenu */}
              <div>
                <button
                  onClick={() => setShowResources(!showResources)}
                  className="w-full px-6 py-4 text-left text-base font-medium text-[#171717] hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  {t("resources")}
                  <NavArrowRight
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      showResources ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {showResources && (
                  <div className="bg-gray-50">
                    {resourcesMenuItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href!}
                        onClick={onClose}
                        className="block px-10 py-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="mx-6 my-2 border-t border-gray-200" />

              {/* Account Settings */}
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => onOpenAccountSettings(), 100);
                }}
                className="w-full px-6 py-4 text-left text-base font-medium text-[#171717] hover:bg-gray-50 transition-colors"
              >
                {t("accountSettings")}
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => onLogout(), 100);
                }}
                className="w-full px-6 py-4 text-left text-base font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                {t("logout")}
              </button>
            </>
          ) : (
            <>
              {/* Not-logged-in menu items */}
              {mainMenuItems.map((item) =>
                item.action ? (
                  <button
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="w-full px-6 py-4 text-left text-base font-medium text-[#171717] hover:bg-gray-50 transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href!}
                    onClick={onClose}
                    className="block px-6 py-4 text-base font-medium text-[#171717] hover:bg-gray-50 transition-colors"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </>
          )}
        </nav>
      </div>

      {/* Footer: Language/Currency + Copyright */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200">
        <div className="flex items-center gap-1 mb-3">
          <LanguageSwitcher />
          <span className="text-gray-300">|</span>
          <CurrencySwitcher dropDirection="up" dropAlign="left" />
        </div>
        <p className="text-xs text-gray-400">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
};

export default MobileMenu;
