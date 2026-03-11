"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  StatsReport,
  Download,
  Eye,
  Coins,
  GraphUp,
  Calendar,
  NavArrowDown,
} from "iconoir-react";
import {
  analyticsApi,
  AnalyticsOverview,
  TransferAnalytics,
  AnalyticsTrends,
  TrendDataPoint,
} from "@/services/analytics-api";
import { toast } from "@/components/shared/Toast";
import LoadingPanel from "@/components/LoadingPanel";
import { useCurrentCurrency } from "@/stores/currency-store";
import { formatInDisplayCurrency } from "@/lib/currency";

type TimePeriod = "week" | "month";

/**
 * AnalyticsPanel - Analytics dashboard in the drawer
 * Shows overview metrics, per-transfer analytics, and trend charts
 */
const AnalyticsPanel: React.FC = () => {
  const t = useTranslations("analytics");
  const locale = useLocale();

  // Get global currency from store
  const { currency: globalCurrency } = useCurrentCurrency();

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [transfers, setTransfers] = useState<TransferAnalytics[]>([]);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

  // Format number
  const formatNumber = useCallback(
    (num: number) => {
      return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(
        num,
      );
    },
    [locale],
  );

  // Format date
  const formatDate = useCallback(
    (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
        month: "short",
        day: "numeric",
      });
    },
    [locale],
  );

  // Load analytics data
  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [overviewRes, transfersRes, trendsRes] = await Promise.all([
        analyticsApi.getOverview(),
        analyticsApi.getTransferAnalytics(5, 0),
        analyticsApi.getTrends(period),
      ]);

      if (overviewRes.data) setOverview(overviewRes.data);
      if (transfersRes.data) setTransfers(transfersRes.data.transfers);
      if (trendsRes.data) setTrends(trendsRes.data);

      if (overviewRes.error || transfersRes.error || trendsRes.error) {
        toast.error(t("loadError"));
      }
    } catch (error) {
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle period change
  const handlePeriodChange = (newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    setIsPeriodDropdownOpen(false);
  };

  // Calculate max value for chart scaling
  const getMaxValue = (
    data: TrendDataPoint[],
    key: keyof TrendDataPoint,
  ): number => {
    const max = Math.max(...data.map((d) => d[key] as number));
    return max > 0 ? max : 1;
  };

  if (isLoading) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold text-gray-900 mt-12 mb-10">
            {t("title")}
          </h1>
        </div>

        {/* Period Selector */}
        <div className="relative">
          <button
            onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              {period === "week" ? t("lastWeek") : t("lastMonth")}
            </span>
            <NavArrowDown className="w-4 h-4" />
          </button>

          {isPeriodDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <button
                onClick={() => handlePeriodChange("week")}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  period === "week" ? "text-[#5E53E0] font-medium" : ""
                }`}
              >
                {t("lastWeek")}
              </button>
              <button
                onClick={() => handlePeriodChange("month")}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                  period === "month" ? "text-[#5E53E0] font-medium" : ""
                }`}
              >
                {t("lastMonth")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Transfers */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraphUp className="w-5 h-5 text-[#5E53E0]" />
              <span className="text-sm font-medium text-gray-500">
                {t("totalTransfers")}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(overview.totalTransfers)}
            </p>
          </div>

          {/* Total Downloads */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-[#87E64B]" />
              <span className="text-sm font-medium text-gray-500">
                {t("totalDownloads")}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatNumber(overview.totalDownloads)}
            </p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-gray-500">
                {t("totalRevenue")}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatInDisplayCurrency(overview.totalRevenue, overview.currency, globalCurrency, { showFreeForZero: false })}
            </p>
          </div>

          {/* Avg Downloads */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-500">
                {t("avgDownloads")}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {overview.avgDownloadsPerTransfer.toFixed(1)}
            </p>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {trends && trends.data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {t("downloadsTrend")}
          </h2>

          {/* Simple bar chart */}
          <div className="flex flex-col">
            {/* Bars container */}
            <div className="flex items-end gap-1 h-32">
              {trends.data.map((point) => {
                const maxDownloads = getMaxValue(trends.data, "downloads");
                const barHeight = maxDownloads > 0 ? (point.downloads / maxDownloads) * 100 : 0;

                return (
                  <div
                    key={point.date}
                    className="flex-1 h-full flex items-end"
                    title={`${formatDate(point.date)}: ${point.downloads} ${t("downloads")}`}
                  >
                    <div
                      className="w-full bg-[#87E64B] rounded-t hover:bg-[#78d43f] transition-colors cursor-pointer min-h-[2px]"
                      style={{ height: `${Math.max(barHeight, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Date labels container */}
            <div className="flex gap-1 mt-2">
              {trends.data.map((point, index) => (
                <div key={`label-${point.date}`} className="flex-1 text-center">
                  {(index === 0 ||
                    index === trends.data.length - 1 ||
                    index === Math.floor(trends.data.length / 2)) && (
                    <span className="text-xs font-medium text-gray-400">
                      {formatDate(point.date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm font-medium text-gray-500">
              {t("periodTotal", {
                period: period === "week" ? t("lastWeek") : t("lastMonth"),
              })}
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatNumber(trends.totals.downloads)} {t("downloads")}
            </span>
          </div>
        </div>
      )}

      {/* Top Transfers */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {t("topTransfers")}
        </h2>

        {transfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <StatsReport className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t("noTransfers")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div
                key={transfer.transferId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {transfer.title}
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    {transfer.shortCode}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Eye className="w-4 h-4" />
                    <span className="font-medium">{transfer.views}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Download className="w-4 h-4" />
                    <span className="font-medium">{transfer.downloads}</span>
                  </div>
                  {transfer.revenue > 0 && (
                    <span className="text-[#5E53E0] font-medium">
                      {formatInDisplayCurrency(transfer.revenue, transfer.currency, globalCurrency)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPanel;
