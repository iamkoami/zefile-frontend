"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  Page,
  Wallet,
  ShieldCheck,
  InfoCircle,
  RefreshDouble,
  Globe,
  GraphUp,
  Palette,
  Gift,
  AtSign,
} from "iconoir-react";
import AccordionItem from "@/components/shared/AccordionItem";
import { useDrawerStore, AccountMenuItem } from "@/stores/drawer-store";
import TransactionsPanel from "./TransactionsPanel";
import PayoutsPanel from "./PayoutsPanel";
import SubscriptionSettingsPanel from "./SubscriptionSettingsPanel";
import AccountSettingsContent from "./AccountSettingsContent";
import { KYCFlowPanel } from "@/features/kyc/components/KYCFlowPanel";
import CustomDomainPanel from "./CustomDomainPanel";
import HandlePanel from "./HandlePanel";
import BrandingPanel from "./BrandingPanel";
import AnalyticsPanel from "@/features/analytics/components/AnalyticsPanel";
import LoadingPanel from "@/components/LoadingPanel";
import ReferralsPanel from "./ReferralsPanel";
import { subscriptionApi } from "@/services/subscription-api";
import { referralsApi } from "@/services/referrals-api";

interface MenuItem {
  id: AccountMenuItem;
  icon: React.ReactNode;
  labelKey: string;
}

/** Menu item definitions — stable across renders (icons are stateless) */
const MENU_ITEMS: MenuItem[] = [
  { id: "settings", icon: <Settings className="w-5 h-5" />, labelKey: "settings" },
  { id: "subscription", icon: <RefreshDouble className="w-5 h-5" />, labelKey: "subscription" },
  { id: "transactions", icon: <Page className="w-5 h-5" />, labelKey: "transactions" },
  { id: "payouts", icon: <Wallet className="w-5 h-5" />, labelKey: "payouts" },
  { id: "handle", icon: <AtSign className="w-5 h-5" />, labelKey: "handle" },
  { id: "branding", icon: <Palette className="w-5 h-5" />, labelKey: "branding" },
  { id: "analytics", icon: <GraphUp className="w-5 h-5" />, labelKey: "analytics" },
  { id: "referrals", icon: <Gift className="w-5 h-5" />, labelKey: "referrals" },
  { id: "verification", icon: <ShieldCheck className="w-5 h-5" />, labelKey: "verification" },
  { id: "custom-domain", icon: <Globe className="w-5 h-5" />, labelKey: "customDomain" },
  { id: "help", icon: <InfoCircle className="w-5 h-5" />, labelKey: "help" },
];

/**
 * AccountPanel - Main account/settings panel with sidebar navigation
 * Uses a sidebar layout (not stack-based) for navigating between account sections
 * Matches design reference: 90vw width, left sidebar with green active indicator
 */
const AccountPanel: React.FC = () => {
  const t = useTranslations("account");
  const { activeAccountMenu, setActiveAccountMenu } = useDrawerStore();
  const [userTier, setUserTier] = useState<string>("free");
  const [referralsEnabled, setReferralsEnabled] = useState(false);
  const [tierLoading, setTierLoading] = useState(true);

  // Fetch user tier and referral status on mount for menu filtering
  const loadConfig = useCallback(async () => {
    try {
      const [tierRes, rewardRes] = await Promise.allSettled([
        subscriptionApi.getCurrentSubscription(),
        referralsApi.getRewardInfo(),
      ]);
      if (tierRes.status === "fulfilled") {
        setUserTier(tierRes.value.data?.tier || "free");
      }
      if (rewardRes.status === "fulfilled" && rewardRes.value.data) {
        setReferralsEnabled(rewardRes.value.data.enabled);
      }
    } catch {
      setUserTier("free");
    } finally {
      setTierLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Hide menu items based on tier and feature flags
  const menuItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      if (item.id === "handle" && userTier === "free") return false;
      if (item.id === "branding" && userTier === "free") return false;
      if (item.id === "analytics" && userTier === "free") return false;
      return true;
    });
  }, [userTier, referralsEnabled]);

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
      case "branding":
        return <BrandingPanel />;
      case "analytics":
        // Tier-gate: FREE users see upgrade prompt instead of AnalyticsPanel
        if (userTier === "free") {
          return <AnalyticsUpgradePrompt />;
        }
        return <AnalyticsPanel />;
      case "referrals":
        return <ReferralsPanel />;
      case "verification":
        return <VerificationContent />;
      case "handle":
        return <HandlePanel />;
      case "custom-domain":
        return <CustomDomainPanel />;
      case "help":
        return <HelpContent />;
      default:
        return <AccountSettingsContent />;
    }
  };

  if (tierLoading) {
    return <LoadingPanel className="py-12" />;
  }

  return (
    <div className="flex h-full -mx-16 -my-8">
      {/* Left Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-[oklch(0.30_0_0)] py-8 px-6 sticky top-0 self-start">
        {/* Section Title */}
        <h2 className="text-3xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-8 px-4">
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
                    ? "text-sm bg-[#87E64B]/10 text-[#171717] dark:text-[oklch(0.91_0_0)] font-bold"
                    : "text-sm text-gray-600 dark:text-[oklch(0.75_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] font-medium hover:text-[#171717] dark:hover:text-[oklch(0.91_0_0)]"
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#87E64B] rounded-r" />
                )}
                <span className={isActive ? "text-[#87E64B]" : "text-gray-400 dark:text-[oklch(0.60_0_0)]"}>
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
 * AnalyticsUpgradePrompt - Shown to FREE users who navigate to analytics
 * Follows the CustomDomainPanel tier-gate pattern
 */
const AnalyticsUpgradePrompt: React.FC = () => {
  const t = useTranslations("account");
  const { setActiveAccountMenu } = useDrawerStore();

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-6">
        {t("analytics")}
      </h3>
      <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-8 text-center">
        <GraphUp className="w-12 h-12 text-gray-300 dark:text-[oklch(0.60_0_0)] mx-auto mb-4" />
        <h4 className="text-lg font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
          {t("analyticsUpgradeTitle")}
        </h4>
        <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-6 max-w-md mx-auto">
          {t("analyticsUpgradeDescription")}
        </p>
        <button
          onClick={() => setActiveAccountMenu("subscription")}
          className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
        >
          {t("analyticsUpgradeCta")}
        </button>
      </div>
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
      <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-6">
        {t.rich("title", { highlight: (chunks) => chunks })}
      </h3>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-[oklch(0.60_0_0)]"
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
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-[oklch(0.22_0_0)] rounded-lg border border-gray-200 dark:border-[oklch(0.30_0_0)] text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:border-[#171717] dark:focus:border-[oklch(0.91_0_0)] focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)] transition-colors"
          />
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="space-y-10">
        {filtered.map((section, sIdx) => (
          <div key={sIdx}>
            <h4 className="text-lg font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-4">
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
        <p className="text-center text-gray-500 dark:text-[oklch(0.75_0_0)] mt-8">
          {t("noResults")}
        </p>
      )}

      {/* Contact */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <h4 className="text-lg font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
          {t("contactTitle")}
        </h4>
        <p className="text-sm text-gray-600 dark:text-[oklch(0.75_0_0)]">
          {t("contactContent")}{" "}
          <a
            href={`mailto:${t("contactEmail")}`}
            className="text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium"
          >
            {t("contactEmail")}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AccountPanel;
