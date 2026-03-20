"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Copy, ShareIos } from "iconoir-react";
import LoadingPanel from "@/components/LoadingPanel";
import Pagination from "@/components/shared/Pagination";
import {
  referralsApi,
  ReferralStats,
  ReferralHistoryItem,
  ShareMessage,
  RewardInfo,
} from "@/services/referrals-api";
import { copyToClipboard } from "@/utils/clipboard";

const HISTORY_PAGE_SIZE = 10;

/**
 * ReferralsPanel - Referral dashboard in Account Settings
 * Shows referral link, share buttons, how it works, stats cards, and paginated history
 */
const ReferralsPanel: React.FC = () => {
  const t = useTranslations("referrals");

  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [shareMessages, setShareMessages] = useState<ShareMessage | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [rewardInfo, setRewardInfo] = useState<RewardInfo | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [codeRes, statsRes, historyRes, rewardRes] = await Promise.allSettled([
      referralsApi.getMyCode(),
      referralsApi.getStats(),
      referralsApi.getHistory(1, HISTORY_PAGE_SIZE),
      referralsApi.getRewardInfo(),
    ]);

    if (codeRes.status === "fulfilled" && codeRes.value.data) {
      setReferralCode(codeRes.value.data.code);
      setShareUrl(codeRes.value.data.shareUrl);
    } else {
      setReferralCode(null);
      setShareUrl("");
    }

    if (statsRes.status === "fulfilled" && statsRes.value.data) {
      setStats(statsRes.value.data);
    }

    if (historyRes.status === "fulfilled" && historyRes.value.data) {
      setHistory(historyRes.value.data.data);
      setHistoryTotal(historyRes.value.data.total);
    }

    if (rewardRes.status === "fulfilled" && rewardRes.value.data) {
      setRewardInfo(rewardRes.value.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadData();

    referralsApi.getShareMessage().then((res) => {
      if (!cancelled && res.data) {
        setShareMessages(res.data);
      }
    }).catch(() => {});

    referralsApi.getAiInsight().then((res) => {
      if (!cancelled && res.data?.insight) {
        setAiInsight(res.data.insight);
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [loadData]);

  const loadHistoryPage = useCallback(async (page: number) => {
    try {
      const res = await referralsApi.getHistory(page, HISTORY_PAGE_SIZE);
      if (res.data) {
        setHistory(res.data.data);
        setHistoryTotal(res.data.total);
        setHistoryPage(page);
      }
    } catch {
      // Keep current page on error
    }
  }, []);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await copyToClipboard(shareUrl, {
      successMessage: t("linkCopied"),
      errorMessage: t("copyError"),
    });
  };

  const handleShare = (network: "whatsapp" | "twitter" | "email") => {
    if (!shareUrl) return;
    const staticMessage = t("shareMessage");

    let url: string;
    switch (network) {
      case "whatsapp": {
        const text = shareMessages?.whatsapp || `${staticMessage} ${shareUrl}`;
        url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        break;
      }
      case "twitter": {
        const text = shareMessages?.twitter || `${staticMessage} ${shareUrl}`;
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        break;
      }
      case "email": {
        const subject = shareMessages?.email?.subject || "ZeFile";
        const body = shareMessages?.email?.body || `${staticMessage}\n\n${shareUrl}`;
        url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
        return;
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <LoadingPanel className="py-12" />;
  }

  const programEnabled = rewardInfo?.enabled ?? false;
  const isDisabled = !referralCode;
  const showShareSection = programEnabled && !isDisabled;
  const isEmpty = stats && stats.invitedCount === 0;
  const maxTransfers = rewardInfo?.maxTransfers || 3;
  const bonusPercent = rewardInfo?.bonusPercent || 10;

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-bold text-[#171717] mb-6">{t("title")}</h3>

      {/* Referral link + share section — only when program is enabled */}
      {showShareSection && (
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            {t("yourLink")}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded px-4 py-3 text-sm text-[#171717] truncate select-all">
              {shareUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-3 bg-[#87E64B] text-[#171717] font-bold text-sm rounded hover:bg-[#78d43f] transition-colors"
            >
              <Copy className="w-4 h-4" />
              {t("copyLink")}
            </button>
          </div>

          {/* Share buttons */}
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-3">{t("shareVia")}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleShare("whatsapp")}
                className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded hover:bg-[#20bd5a] transition-colors"
              >
                WhatsApp
              </button>
              <button
                onClick={() => handleShare("twitter")}
                className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2] text-white text-sm font-medium rounded hover:bg-[#1a91da] transition-colors"
              >
                Twitter
              </button>
              <button
                onClick={() => handleShare("email")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded hover:bg-gray-600 transition-colors"
              >
                {t("email")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How it works — only when program is enabled */}
      {showShareSection && (
        <div className="bg-[#FDFAF4] border border-gray-100 rounded-lg p-6 mb-8">
          <h4 className="text-sm font-bold text-[#171717] mb-4">
            {t("howItWorksTitle")}
          </h4>
          <div className="flex flex-col sm:flex-row gap-4">
            <HowItWorksStep number={1} text={t("howItWorksStep1")} />
            <HowItWorksStep number={2} text={t("howItWorksStep2")} />
            <HowItWorksStep
              number={3}
              text={t("howItWorksStep3", { max: String(maxTransfers), percent: String(bonusPercent) })}
            />
          </div>
        </div>
      )}

      {/* Stats cards — visible even when program is disabled */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            label={t("statsFriendsJoined")}
            value={stats.invitedCount}
          />
          <StatCard
            label={t("statsEarningForYou")}
            value={stats.activeCount}
          />
          <StatCard
            label={t("statsEarned")}
            value={formatEarnings(stats.earnedPerCurrency)}
            isHero
          />
        </div>
      )}

      {/* AI insight */}
      {aiInsight && stats && stats.invitedCount > 0 && (
        <div className="bg-[#F5F3FF] border border-[#E0DAFB] rounded-lg px-4 py-3 mb-8">
          <p className="text-sm text-[#5E53E0]">{aiInsight}</p>
        </div>
      )}

      {/* Empty state — always visible when no referrals */}
      {isEmpty && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <ShareIos className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-[#171717] mb-2">
            {t("emptyTitle")}
          </h4>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
            {t("emptyDescription", { percent: String(bonusPercent) })}
          </p>
        </div>
      )}

      {/* Referral history with progress */}
      {!isEmpty && history.length > 0 && (
        <div>
          <h4 className="text-lg font-bold text-[#171717] mb-4">
            {t("recentReferrals")}
          </h4>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    {t("emailColumn")}
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    {t("statusColumn")}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    {t("profitColumn")}
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">
                    {t("progressColumn")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-sm text-[#171717]">
                      {item.maskedEmail}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-[#171717]">
                        {item.earnedMinorUnits > 0
                          ? `${item.earnedMinorUnits.toLocaleString()} ${item.currency}`
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar
                        current={item.paidTransferCount}
                        max={maxTransfers}
                        label={t("progressLabel", {
                          current: String(item.paidTransferCount),
                          max: String(maxTransfers),
                        })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={historyPage}
            totalPages={Math.ceil(historyTotal / HISTORY_PAGE_SIZE)}
            totalItems={historyTotal}
            itemsPerPage={HISTORY_PAGE_SIZE}
            onPageChange={loadHistoryPage}
            className="mt-4"
          />
        </div>
      )}
    </div>
  );
};

/** Format multi-currency earnings for display */
function formatEarnings(
  earnedPerCurrency: { currency: string; totalMinorUnits: number }[]
): string {
  if (!earnedPerCurrency || earnedPerCurrency.length === 0) return "0";
  return earnedPerCurrency
    .filter((e) => e.totalMinorUnits > 0)
    .map((e) => {
      const amount = e.totalMinorUnits.toLocaleString();
      return `${amount} ${e.currency}`;
    })
    .join(" \u00B7 ") || "0";
}

/** How it works step */
const HowItWorksStep: React.FC<{ number: number; text: string }> = ({
  number,
  text,
}) => (
  <div className="flex-1 flex items-start gap-3">
    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#87E64B] text-[#171717] text-sm font-bold flex items-center justify-center">
      {number}
    </span>
    <p className="text-sm text-gray-600 leading-snug pt-0.5">{text}</p>
  </div>
);

/** Stat card component */
const StatCard: React.FC<{
  label: string;
  value: number | string;
  isHero?: boolean;
}> = ({ label, value, isHero }) => (
  <div
    className={`rounded-lg p-4 ${
      isHero
        ? "bg-gradient-to-br from-[#87E64B]/10 to-[#87E64B]/5 border border-[#87E64B]/30"
        : "bg-gray-50"
    }`}
  >
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`font-bold text-[#171717] ${isHero ? "text-2xl" : "text-xl"}`}>
      {value}
    </p>
  </div>
);

/** Progress bar for transfer count */
const ProgressBar: React.FC<{
  current: number;
  max: number;
  label: string;
}> = ({ current, max, label }) => {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#87E64B] rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 font-medium w-8 text-right">
        {label}
      </span>
    </div>
  );
};

/** Status badge for referral history */
const StatusBadge: React.FC<{
  status: "ACTIVE" | "COMPLETED" | "SUSPENDED";
}> = ({ status }) => {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    SUSPENDED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${colors[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

export default ReferralsPanel;
