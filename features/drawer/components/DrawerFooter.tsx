"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  NavArrowDown,
  Tiktok,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
} from "iconoir-react";
import { useLocale, useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";

/**
 * DrawerFooter - Footer component for the SideDrawer
 * Contains language selector, footer links, and social media icons
 */
const DrawerFooter: React.FC = () => {
  const t = useTranslations("footer");
  const currentLocale = useLocale();
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const changeLanguage = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  const currentLanguageLabel = currentLocale === "en" ? "English" : "Français";

  const footerLinks = [
    { label: t("termsOfService"), href: "/terms" },
    { label: t("privacyPolicy"), href: "/privacy" },
    { label: t("press"), href: "/press" },
    { label: t("jobs"), href: "/jobs" },
  ];

  const socialLinks = [
    { icon: Tiktok, href: "https://tiktok.com/@zefile", label: "TikTok" },
    { icon: Instagram, href: "https://instagram.com/zefile", label: "Instagram" },
    { icon: Facebook, href: "https://facebook.com/zefile", label: "Facebook" },
    { icon: Linkedin, href: "https://linkedin.com/company/zefile", label: "LinkedIn" },
    { icon: Youtube, href: "https://youtube.com/@zefile", label: "YouTube" },
  ];

  return (
    <footer className="ze-drawer-footer flex-shrink-0 bg-white py-4 px-16">
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLanguageLabel}</span>
            <NavArrowDown className="w-4 h-4" />
          </button>

          {showLanguageDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => changeLanguage("en")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                  currentLocale === "en" ? "font-semibold text-gray-900" : "text-gray-600"
                }`}
              >
                English
              </button>
              <button
                onClick={() => changeLanguage("fr")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                  currentLocale === "fr" ? "font-semibold text-gray-900" : "text-gray-600"
                }`}
              >
                Français
              </button>
            </div>
          )}
        </div>

        {/* Footer Links */}
        <nav className="flex items-center gap-1">
          {footerLinks.map((link, index) => (
            <React.Fragment key={link.href}>
              <Link
                href={link.href}
                onClick={closeDrawer}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-gray-400 mx-1">-</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        {/* Social Icons */}
        <div className="flex items-center gap-3">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              aria-label={social.label}
            >
              <social.icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default DrawerFooter;
