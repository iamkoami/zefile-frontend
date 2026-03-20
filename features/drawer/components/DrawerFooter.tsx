"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  NavArrowDown,
  Tiktok,
  Instagram,
  Threads,
  Facebook,
  Linkedin,
  Youtube,
  X,
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
    { icon: Tiktok, href: "https://tiktok.com/@zefilehq", label: "TikTok" },
    { icon: Instagram, href: "https://instagram.com/zefilehq", label: "Instagram" },
    { icon: Threads, href: "https://threads.net/@zefilehq", label: "Threads" },
    { icon: Facebook, href: "https://facebook.com/zefilehq", label: "Facebook" },
    { icon: Linkedin, href: "https://linkedin.com/company/zefilehq", label: "LinkedIn" },
    { icon: Youtube, href: "https://youtube.com/@zefilehq", label: "YouTube" },
    { icon: X, href: "https://x.com/zefilehq", label: "X" },
  ];

  return (
    <footer className="ze-drawer-footer flex-shrink-0 bg-white dark:bg-[oklch(0.24_0_0)] py-4 px-16">
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-[oklch(0.30_0_0)] pt-4">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLanguageLabel}</span>
            <NavArrowDown className="w-4 h-4" />
          </button>

          {showLanguageDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-[oklch(0.22_0_0)] rounded-lg shadow-lg dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-[oklch(0.30_0_0)] py-1 z-50">
              <button
                onClick={() => changeLanguage("en")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors ${
                  currentLocale === "en" ? "font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]" : "text-gray-600 dark:text-[oklch(0.75_0_0)]"
                }`}
              >
                English
              </button>
              <button
                onClick={() => changeLanguage("fr")}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors ${
                  currentLocale === "fr" ? "font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]" : "text-gray-600 dark:text-[oklch(0.75_0_0)]"
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
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 dark:text-[oklch(0.75_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors"
              >
                {link.label}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-gray-400 dark:text-[oklch(0.60_0_0)] mx-1">-</span>
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
              className="text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors"
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
