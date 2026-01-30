"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

const Footer: React.FC = () => {
  const t = useTranslations("footer");
  const tCommon = useTranslations("common");

  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: t("howItWorks"), href: "/how-it-works" },
      { label: t("pricing"), href: "/pricing" },
    ],
    resources: [
      { label: t("helpCenter"), href: "/help" },
      { label: t("advertisers"), href: "/advertisers" },
    ],
    company: [
      { label: t("about"), href: "/about" },
      { label: t("contact"), href: "mailto:support@zefile.io" },
    ],
    legal: [
      { label: t("terms"), href: "/terms" },
      { label: t("privacy"), href: "/privacy" },
    ],
  };

  return (
    <footer className="bg-[#171717] text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/zefile-logo-white.svg"
                alt={tCommon("appName")}
                width={100}
                height={28}
              />
            </Link>
            <p className="text-sm text-gray-400 mt-3">{t("description")}</p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t("product")}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
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
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t("resources")}</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
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
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t("company")}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
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
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4">{t("legal")}</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
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
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {currentYear} ZeFile. {t("allRightsReserved")}
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t("terms")}
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t("privacy")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
