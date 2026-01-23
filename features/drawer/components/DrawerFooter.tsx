"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Globe, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

// Social media icons as SVG components
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

/**
 * DrawerFooter - Footer component for the SideDrawer
 * Contains language selector, footer links, and social media icons
 */
const DrawerFooter: React.FC = () => {
  const t = useTranslations("footer");
  const currentLocale = useLocale();
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
    { icon: TikTokIcon, href: "https://tiktok.com/@zefile", label: "TikTok" },
    { icon: InstagramIcon, href: "https://instagram.com/zefile", label: "Instagram" },
    { icon: FacebookIcon, href: "https://facebook.com/zefile", label: "Facebook" },
    { icon: LinkedInIcon, href: "https://linkedin.com/company/zefile", label: "LinkedIn" },
    { icon: YouTubeIcon, href: "https://youtube.com/@zefile", label: "YouTube" },
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
            <ChevronDown className="w-4 h-4" />
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
              <social.icon />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default DrawerFooter;
