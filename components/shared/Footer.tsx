"use client";

import React, { useState, useEffect, useRef, type ReactNode } from "react";
import CookieConsentBanner from "@/components/shared/CookieConsentBanner";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { apiClient } from "@/services/api-client";
import {
  Mail,
  Tiktok,
  Instagram,
  Threads,
  Facebook,
  Linkedin,
  Youtube,
  X,
} from "iconoir-react";

function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const Footer: React.FC = () => {
  const t = useTranslations("footer");
  const tCommon = useTranslations("common");

  const currentYear = new Date().getFullYear();

  const [email, setEmail] = useState("");
  const [hasSignedUp, setHasSignedUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [emailError, setEmailError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("zefile_newsletter_signup");
    if (stored) setHasSignedUp(true);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/newsletter/subscribe", {
        email: trimmed,
      });
      if (!response.error) {
        localStorage.setItem("zefile_newsletter_signup", trimmed);
        setHasSignedUp(true);
        setShowSuccess(true);
      }
    } catch {
      // Silent fail — still mark as signed up to avoid frustration
      localStorage.setItem("zefile_newsletter_signup", trimmed);
      setHasSignedUp(true);
      setShowSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const socialLinks = [
    { icon: Tiktok, href: "https://tiktok.com/@zefilehq", label: "TikTok" },
    {
      icon: Instagram,
      href: "https://instagram.com/zefilehq",
      label: "Instagram",
    },
    { icon: Threads, href: "https://threads.net/@zefilehq", label: "Threads" },
    {
      icon: Facebook,
      href: "https://facebook.com/zefilehq",
      label: "Facebook",
    },
    {
      icon: Linkedin,
      href: "https://linkedin.com/company/zefilehq",
      label: "LinkedIn",
    },
    { icon: Youtube, href: "https://youtube.com/@zefilehq", label: "YouTube" },
    { icon: X, href: "https://x.com/zefilehq", label: "X" },
  ];

  const navLinks = [
    { label: t("howItWorks"), href: "/how-it-works" },
    { label: t("pricing"), href: "/pricing" },
    { label: t("helpCenter"), href: "/help" },
    { label: t("blog"), href: "/blog" },
    { label: t("about"), href: "/about" },
    { label: t("contact"), href: "/contact-us" },
  ];

  return (
    <footer className="bg-[#171717] text-white">
      <div className="max-w-7xl mx-auto mt-10 px-6 py-16">
        {/* Newsletter Section */}
        <Reveal>
          <div className="text-center pb-12">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-wide mb-3">
              {t("newsletterHeadline")}
            </h2>
            <p className="text-sm font-medium text-gray-400 mb-10 max-w-lg mx-auto">
              {t("newsletterSubtext")}
            </p>

            {hasSignedUp ? (
              <p className="text-sm text-[#87E64B]">
                {showSuccess
                  ? t("newsletterSuccess")
                  : t("newsletterAlreadySignedUp")}
              </p>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto"
              >
                <div className="flex-1 w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(false);
                    }}
                    placeholder={t("newsletterPlaceholder")}
                    className={`w-full bg-transparent border-b ${
                      emailError
                        ? "border-red-400"
                        : "border-gray-600 focus:border-white"
                    } pb-2 text-white placeholder-gray-500 outline-none transition-colors text-sm`}
                    aria-label={t("newsletterPlaceholder")}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-sm font-semibold text-[#171717] bg-[#87E64B] hover:bg-[#78d43f] px-6 py-2 rounded transition-colors uppercase tracking-wider whitespace-nowrap disabled:opacity-60"
                >
                  {isSubmitting ? "..." : t("newsletterButton")}
                </button>
              </form>
            )}
          </div>
        </Reveal>

        {/* Contact & Social Row */}
        <Reveal delay={100}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-8 py-8">
            {/* Logo */}
            <Link href="/" className="inline-block">
              <Image
                src="/zefile-logo-white.svg"
                alt={tCommon("logoAlt")}
                width={90}
                height={28}
              />
            </Link>

            {/* Email */}
            <a
              href="mailto:hello@zefile.io"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Mail width={16} height={16} />
              <span>{t("email")}</span>
            </a>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  <social.icon width={20} height={20} />
                </a>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Navigation Links */}
        <Reveal delay={200}>
          <nav className="py-8">
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>

        {/* Copyright Bar */}
        <Reveal delay={300}>
          <div className="border-t border-gray-800 pt-10 mt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500">
                &copy; {currentYear} ZeFile. {t("allRightsReserved")}
              </p>
              <div className="flex items-center gap-6">
                <Link
                  href="/terms"
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {t("terms")}
                </Link>
                <Link
                  href="/privacy"
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {t("privacy")}
                </Link>
                <button
                  onClick={() => setShowCookieSettings(true)}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  {t("cookieSettings")}
                </button>
              </div>
              {showCookieSettings && (
                <CookieConsentBanner
                  forceOpen
                  onClose={() => setShowCookieSettings(false)}
                />
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  );
};

export default Footer;
