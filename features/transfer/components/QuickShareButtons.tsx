"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { openShareDialog, ShareNetwork } from "@/utils/clipboard";
import { Whatsapp, Telegram, Mail } from "iconoir-react";

interface QuickShareButtonsProps {
  shortCode: string;
  title?: string;
  message?: string;
  className?: string;
}

const QUICK_NETWORKS: Array<{
  network: ShareNetwork;
  labelKey: string;
  color: string;
  icon: React.ReactNode;
}> = [
  {
    network: "whatsapp",
    labelKey: "whatsapp",
    color: "text-gray-600",
    icon: <Whatsapp className="w-5 h-5" />,
  },
  {
    network: "telegram",
    labelKey: "telegram",
    color: "text-gray-600",
    icon: <Telegram className="w-5 h-5" />,
  },
  {
    network: "email",
    labelKey: "email",
    color: "text-gray-600",
    icon: <Mail className="w-5 h-5" />,
  },
];

const QuickShareButtons: React.FC<QuickShareButtonsProps> = ({
  shortCode,
  title,
  message,
  className = "",
}) => {
  const t = useTranslations("shareButtons");

  const handleShare = (network: ShareNetwork) => {
    openShareDialog(shortCode, network, { title, message });
  };

  if (!shortCode) return null;

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      {QUICK_NETWORKS.map(({ network, labelKey, color, icon }) => (
        <button
          key={network}
          type="button"
          onClick={() => handleShare(network)}
          className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors"
          aria-label={t(labelKey)}
          title={t(labelKey)}
        >
          <span className={color}>{icon}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickShareButtons;
