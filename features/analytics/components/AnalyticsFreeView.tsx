"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Lock } from "iconoir-react";
import { analyticsApi, AnalyticsOverview } from "@/services/analytics-api";
import { useDrawerStore } from "@/stores/drawer-store";
import { toast } from "@/components/shared/Toast";
import LoadingPanel from "@/components/LoadingPanel";

const AnalyticsFreeView: React.FC = () => {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const { setActiveAccountMenu } = useDrawerStore();

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [hasError, setHasError] = useState(false);

  const fmt = useCallback(
    (num: number) =>
      new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(num),
    [locale],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await analyticsApi.getOverview("all");
        if (res.data) setOverview(res.data);
        if (res.error) {
          setHasError(true);
          toast.error(t("loadError"));
        }
      } catch {
        setHasError(true);
        toast.error(t("loadError"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [t]);

  if (isLoading) return <LoadingPanel className="py-12" />;

  return (
    <div className="w-full">
      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mt-12 mb-10">
        {t("title")}
      </h1>

      {/* Error state */}
      {hasError && !overview && (
        <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-8">
          {t("loadError")}
        </p>
      )}

      {/* 3 KPI cards -- all-time, no deltas */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {/* Card: Transfers */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate block mb-2">
              {t("freeTransfers")}
            </span>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {fmt(overview.totalTransfersDelta.value)}
            </p>
          </div>

          {/* Card: Views */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate block mb-2">
              {t("freeViews")}
            </span>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {fmt(overview.totalViewsDelta.value)}
            </p>
          </div>

          {/* Card: Downloads */}
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate block mb-2">
              {t("freeDownloads")}
            </span>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {fmt(overview.totalDownloadsDelta.value)}
            </p>
          </div>
        </div>
      )}

      {/* Locked upgrade section */}
      <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.02]">
        <Lock className="w-8 h-8 text-gray-400 dark:text-[oklch(0.55_0_0)] mx-auto mb-3" />
        <h4 className="text-lg font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
          {t("unlockTitle")}
        </h4>
        <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-6 max-w-md mx-auto">
          {t("unlockBody")}
        </p>
        <button
          onClick={() => setActiveAccountMenu("subscription")}
          className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
        >
          {t("unlockCta")}
        </button>
      </div>
    </div>
  );
};

export default AnalyticsFreeView;
