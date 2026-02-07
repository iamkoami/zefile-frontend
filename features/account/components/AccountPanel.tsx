"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Settings,
  Page,
  Wallet,
  ShieldCheck,
  InfoCircle,
  RefreshDouble,
} from "iconoir-react";
import { useDrawerStore, AccountMenuItem } from "@/stores/drawer-store";
import TransactionsPanel from "./TransactionsPanel";
import PayoutsPanel from "./PayoutsPanel";
import SubscriptionSettingsPanel from "./SubscriptionSettingsPanel";
import AccountSettingsContent from "./AccountSettingsContent";
import { KYCFlowPanel } from "@/features/kyc/components/KYCFlowPanel";

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
 * HelpContent - Placeholder for help center
 * TODO: Implement help center with FAQ, contact support
 */
const HelpContent: React.FC = () => {
  const t = useTranslations("account");

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-semibold text-[#171717] mb-6">
        {t("helpTitle")}
      </h3>
      <p className="text-gray-500">{t("helpPlaceholder")}</p>
    </div>
  );
};

export default AccountPanel;
