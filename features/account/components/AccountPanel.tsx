"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  Page,
  Wallet,
  ShieldCheck,
  InfoCircle,
  RefreshDouble,
  Globe,
} from "iconoir-react";
import AccordionItem from "@/components/shared/AccordionItem";
import { useDrawerStore, AccountMenuItem } from "@/stores/drawer-store";
import TransactionsPanel from "./TransactionsPanel";
import PayoutsPanel from "./PayoutsPanel";
import SubscriptionSettingsPanel from "./SubscriptionSettingsPanel";
import AccountSettingsContent from "./AccountSettingsContent";
import { KYCFlowPanel } from "@/features/kyc/components/KYCFlowPanel";
import CustomDomainPanel from "./CustomDomainPanel";

interface MenuItem {
  id: AccountMenuItem;
  icon: React.ReactNode;
  labelKey: string;
}

/**
 * AccountPanel - Main account/settings panel with sidebar navigation
 * Uses a sidebar layout (not stack-based) for navigating between account sections
 * Matches design reference: 90vw width, left sidebar with green active indicator
 */
const AccountPanel: React.FC = () => {
  const t = useTranslations("account");
  const { activeAccountMenu, setActiveAccountMenu } = useDrawerStore();

  const menuItems: MenuItem[] = [
    {
      id: "settings",
      icon: <Settings className="w-5 h-5" />,
      labelKey: "settings",
    },
    {
      id: "subscription",
      icon: <RefreshDouble className="w-5 h-5" />,
      labelKey: "subscription",
    },
    {
      id: "transactions",
      icon: <Page className="w-5 h-5" />,
      labelKey: "transactions",
    },
    {
      id: "payouts",
      icon: <Wallet className="w-5 h-5" />,
      labelKey: "payouts",
    },
    {
      id: "verification",
      icon: <ShieldCheck className="w-5 h-5" />,
      labelKey: "verification",
    },
    {
      id: "custom-domain",
      icon: <Globe className="w-5 h-5" />,
      labelKey: "customDomain",
    },
    { id: "help", icon: <InfoCircle className="w-5 h-5" />, labelKey: "help" },
  ];

  const renderContent = () => {
    switch (activeAccountMenu) {
      case "settings":
        return <AccountSettingsContent />;
      case "subscription":
        return <SubscriptionSettingsPanel />;
      case "transactions":
        return <TransactionsPanel />;
      case "payouts":
        return <PayoutsPanel />;
      case "verification":
        return <VerificationContent />;
      case "custom-domain":
        return <CustomDomainPanel />;
      case "help":
        return <HelpContent />;
      default:
        return <AccountSettingsContent />;
    }
  };

  return (
    <div className="flex h-full -mx-16 -my-8">
      {/* Left Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200 py-8 px-6 sticky top-0 self-start">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-[#171717] mb-8 px-4">
          {t("title")}
        </h2>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeAccountMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveAccountMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors relative ${
                  isActive
                    ? "text-sm bg-[#87E64B]/10 text-[#171717] font-bold"
                    : "text-sm text-gray-600 hover:bg-gray-50 font-medium hover:text-[#171717]"
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#87E64B] rounded-r" />
                )}
                <span className={isActive ? "text-[#87E64B]" : "text-gray-400"}>
                  {item.icon}
                </span>
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right Content Area */}
      <main className="flex-1 overflow-y-auto py-8 px-12">
        {renderContent()}
      </main>
    </div>
  );
};

/**
 * VerificationContent - KYC identity verification
 * Story 4.2: KYC Document Submission
 * Story 16.5 & 16.6: BVN Verification & Multi-Step Flow
 */
const VerificationContent: React.FC = () => {
  return <KYCFlowPanel />;
};

/**
 * HelpContent - FAQ search + accordion sections
 * Mirrors the public /help page using the same pages.help translation namespace
 */
const HelpContent: React.FC = () => {
  const t = useTranslations("pages.help");
  const [search, setSearch] = useState("");

  const sections = useMemo(
    () => [
      {
        title: t("gettingStartedTitle"),
        faqs: [
          { q: t("faq1Q"), a: t("faq1A") },
          { q: t("faq2Q"), a: t("faq2A") },
          { q: t("faq3Q"), a: t("faq3A") },
        ],
      },
      {
        title: t("transfersTitle"),
        faqs: [
          { q: t("faq4Q"), a: t("faq4A") },
          { q: t("faq5Q"), a: t("faq5A") },
          { q: t("faq6Q"), a: t("faq6A") },
        ],
      },
      {
        title: t("paymentsTitle"),
        faqs: [
          { q: t("faq7Q"), a: t("faq7A") },
          { q: t("faq8Q"), a: t("faq8A") },
          { q: t("faq9Q"), a: t("faq9A") },
        ],
      },
      {
        title: t("securityTitle"),
        faqs: [
          { q: t("faq10Q"), a: t("faq10A") },
          { q: t("faq11Q"), a: t("faq11A") },
        ],
      },
    ],
    [t],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((s) => ({
        ...s,
        faqs: s.faqs.filter(
          (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.faqs.length > 0);
  }, [search, sections]);

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-semibold text-[#171717] mb-6">
        {t("title")}
      </h3>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-lg border border-gray-200 text-sm text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
          />
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-10">
        {filtered.map((section, sIdx) => (
          <div key={sIdx}>
            <h4 className="text-lg font-bold text-[#171717] mb-4">
              {section.title}
            </h4>
            <div className="space-y-2">
              {section.faqs.map((faq, fIdx) => (
                <AccordionItem key={fIdx} question={faq.q} answer={faq.a} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          {t("noResults")}
        </p>
      )}

      {/* Contact */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h4 className="text-lg font-semibold text-[#171717] mb-2">
          {t("contactTitle")}
        </h4>
        <p className="text-sm text-gray-600">
          {t("contactContent")}{" "}
          <a
            href={`mailto:${t("contactEmail")}`}
            className="text-[#171717] underline font-medium"
          >
            {t("contactEmail")}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AccountPanel;
