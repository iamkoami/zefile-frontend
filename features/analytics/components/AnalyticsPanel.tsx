"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  StatsReport,
  Download,
  Eye,
  Calendar,
  NavArrowDown,
  NavArrowRight,
  StatUp,
  StatDown,
} from "iconoir-react";
import {
  analyticsApi,
  AnalyticsOverview,
  AnalyticsTrends,
  TrendDataPoint,
  AnalyticsPeriod,
  TopTransfer,
  MetricWithDelta,
} from "@/services/analytics-api";
import { toast } from "@/components/shared/Toast";
import LoadingPanel from "@/components/LoadingPanel";
import AnalyticsTipBanner from "./AnalyticsTipBanner";
import {
  selectAnalyticsTip,
  dismissTip,
  TipCandidate,
} from "../utils/analytics-tips";
import { useCurrentCurrency } from "@/stores/currency-store";
import { useDrawerStore } from "@/stores/drawer-store";
import { formatInDisplayCurrency } from "@/lib/currency";
import { transferApi } from "@/services/transfer-api";

const PERIOD_OPTIONS: AnalyticsPeriod[] = ["7d", "30d", "90d", "year", "all"];

const PERIOD_LABEL_KEYS: Record<AnalyticsPeriod, string> = {
  "7d": "last7d",
  "30d": "last30d",
  "90d": "last90d",
  year: "lastYear",
  all: "allTime",
};

const AnalyticsPanel: React.FC = () => {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const { currency: globalCurrency } = useCurrentCurrency();
  const { openDrawerToView, setActiveAccountMenu } = useDrawerStore();

  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [transfers, setTransfers] = useState<TopTransfer[]>([]);
  const [trends, setTrends] = useState<AnalyticsTrends | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [activeTip, setActiveTip] = useState<TipCandidate | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  const fmt = useCallback(
    (num: number) =>
      new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(num),
    [locale],
  );

  const fmtDate = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "short",
      });
    },
    [locale],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewRes, transfersRes, trendsRes] = await Promise.all([
        analyticsApi.getOverview(period),
        analyticsApi.getTransferAnalytics(5, 0, period),
        analyticsApi.getTrends(period),
      ]);
      if (overviewRes.data) setOverview(overviewRes.data);
      if (transfersRes.data)
        setTransfers(transfersRes.data.transfers as TopTransfer[]);
      if (trendsRes.data) setTrends(trendsRes.data);
      if (overviewRes.error || transfersRes.error || trendsRes.error) {
        toast.error(t("loadError"));
      }
    } catch {
      toast.error(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (overview) {
      setActiveTip(selectAnalyticsTip(overview, transfers, period));
    }
  }, [overview, transfers, period]);

  const handleDismissTip = (tipKey: string) => {
    // Animate out before removing
    if (tipRef.current) {
      tipRef.current.style.opacity = "0";
      tipRef.current.style.maxHeight = "0";
      tipRef.current.style.marginBottom = "0";
      tipRef.current.style.overflow = "hidden";
      setTimeout(() => {
        dismissTip(tipKey);
        if (overview) {
          setActiveTip(selectAnalyticsTip(overview, transfers, period));
        }
      }, 200);
    } else {
      dismissTip(tipKey);
      if (overview) {
        setActiveTip(selectAnalyticsTip(overview, transfers, period));
      }
    }
  };

  const handlePeriodChange = (p: AnalyticsPeriod) => {
    setPeriod(p);
    setIsPeriodDropdownOpen(false);
  };

  const handleTransferClick = async (tr: TopTransfer) => {
    try {
      const res = await transferApi.getTransferById(tr.transferId);
      if (res.data) {
        openDrawerToView("transfers", "transfer-details", res.data, "sender");
      }
    } catch {
      toast.error(t("loadError"));
    }
  };

  // --- Helpers ---

  const deltaInfo = (d: MetricWithDelta | null | undefined) => {
    if (!d || d.percentChange === null) return null;
    const sign = d.trend === "up" ? "+" : "";
    return { text: `${sign}${d.percentChange.toFixed(1)}%`, trend: d.trend };
  };

  const VS_KEYS: Record<string, string> = {
    "7d": "vsWeek",
    "30d": "vsMonth",
    "90d": "vsQuarter",
    year: "vsYear",
  };

  const comparisonLabel =
    period !== "all" && VS_KEYS[period] ? t(VS_KEYS[period]) : null;

  const deltaClr = (trend: "up" | "down" | "flat") =>
    trend === "up"
      ? "text-green-600 dark:text-green-400"
      : trend === "down"
        ? "text-red-500 dark:text-red-400"
        : "text-gray-400";

  if (isLoading) return <LoadingPanel fullHeight />;

  // Chart helpers
  const chartMax = (
    data: TrendDataPoint[],
    ...keys: (keyof TrendDataPoint)[]
  ) => {
    const max = Math.max(
      ...data.flatMap((d) => keys.map((k) => d[k] as number)),
    );
    return max > 0 ? max : 1;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-12 mb-10">
          {t("title")}
        </h1>

        {/* Period Selector */}
        <div className="relative">
          <button
            onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 rounded transition-colors"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t(PERIOD_LABEL_KEYS[period])}
            </span>
            <NavArrowDown className="w-4 h-4" />
          </button>

          {isPeriodDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded shadow-lg z-50 min-w-[160px]">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handlePeriodChange(opt)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-700 ${
                    period === opt
                      ? "text-[#5E53E0] font-medium"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t(PERIOD_LABEL_KEYS[opt])}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards — 5 cards, 3+2 grid on mobile */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <KpiCard
            label={t("totalTransfers")}
            value={fmt(overview.totalTransfersDelta.value)}
            delta={
              period !== "all" ? deltaInfo(overview.totalTransfersDelta) : null
            }
            deltaColor={deltaClr(overview.totalTransfersDelta.trend)}
            periodLabel={comparisonLabel}
          />
          <KpiCard
            label={t("totalViews")}
            value={fmt(overview.totalViewsDelta.value)}
            delta={
              period !== "all" ? deltaInfo(overview.totalViewsDelta) : null
            }
            deltaColor={deltaClr(overview.totalViewsDelta.trend)}
            periodLabel={comparisonLabel}
          />
          <KpiCard
            label={t("totalDownloads")}
            value={fmt(overview.totalDownloadsDelta.value)}
            delta={
              period !== "all" ? deltaInfo(overview.totalDownloadsDelta) : null
            }
            deltaColor={deltaClr(overview.totalDownloadsDelta.trend)}
            periodLabel={comparisonLabel}
          />
          <KpiCard
            label={t("conversionRate")}
            value={
              overview.conversionRate !== null
                ? `${overview.conversionRate.toFixed(0)}%`
                : t("na")
            }
            delta={
              period !== "all" && overview.conversionRateDelta
                ? deltaInfo(overview.conversionRateDelta)
                : null
            }
            deltaColor={
              overview.conversionRateDelta
                ? deltaClr(overview.conversionRateDelta.trend)
                : "text-gray-400"
            }
            periodLabel={comparisonLabel}
          />
          <KpiCard
            label={t("totalRevenue")}
            value={formatInDisplayCurrency(
              overview.totalRevenueDelta.value,
              overview.currency,
              globalCurrency,
              { showFreeForZero: false },
            )}
            delta={
              period !== "all" ? deltaInfo(overview.totalRevenueDelta) : null
            }
            deltaColor={deltaClr(overview.totalRevenueDelta.trend)}
            periodLabel={comparisonLabel}
          >
            {overview.totalRevenueDelta.value > 0 && (
              <button
                type="button"
                onClick={() => setActiveAccountMenu("payouts")}
                className="text-xs text-[#5E53E0] dark:text-[#8B83F0] hover:underline cursor-pointer mt-1"
              >
                {t("viewPayouts")}
              </button>
            )}
          </KpiCard>
        </div>
      )}

      {/* Contextual tip -- Starter+ only */}
      {overview && activeTip && (
        <div
          ref={tipRef}
          className="mb-8 transition-all duration-200 ease-out"
          style={{ maxHeight: 200, opacity: 1 }}
        >
          <AnalyticsTipBanner
            tipKey={activeTip.key}
            messageKey={activeTip.messageKey}
            messageParams={activeTip.messageParams}
            onDismiss={handleDismissTip}
          />
        </div>
      )}

      {/* Dual-line Chart: Views + Downloads */}
      {trends && trends.data.length > 0 && (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("viewsAndDownloads")}
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-[#5E53E0] inline-block" />
                <span className="text-gray-500 dark:text-gray-400">
                  {t("views")}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-[#16A34A] inline-block" />
                <span className="text-gray-500 dark:text-gray-400">
                  {t("downloads")}
                </span>
              </span>
            </div>
          </div>

          {/* SVG dual-line chart */}
          <DualLineChart
            data={trends.data}
            maxY={chartMax(trends.data, "views", "downloads")}
            formatDate={fmtDate}
          />

          {/* Totals */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("periodTotal", { period: t(PERIOD_LABEL_KEYS[period]) })}
            </span>
            <div className="flex gap-4">
              <span className="text-sm font-bold text-[#5E53E0]">
                {fmt(trends.totals.views)} {t("views")}
              </span>
              <span className="text-sm font-bold text-[#16A34A]">
                {fmt(trends.totals.downloads)} {t("downloads")}
              </span>
            </div>
          </div>

          {/* Revenue Bar Chart */}
          <div className="border-t border-gray-100 dark:border-white/10 mt-4 pt-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t("totalRevenue")}
            </h3>
            <RevenueBarChart
              data={trends.data}
              formatDate={fmtDate}
              formatRevenue={(amount) =>
                formatInDisplayCurrency(
                  amount,
                  overview?.currency ?? globalCurrency,
                  globalCurrency,
                  { showFreeForZero: false },
                )
              }
            />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              {formatInDisplayCurrency(
                trends.totals.revenue,
                overview?.currency ?? globalCurrency,
                globalCurrency,
                { showFreeForZero: false },
              )}{" "}
              {t("totalForPeriod")}
            </p>
          </div>
        </div>
      )}

      {/* Top Transfers */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {t("topTransfers")}
        </h2>

        {transfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <StatsReport className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t("noTransfers")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.map((tr) => (
              <div
                key={tr.transferId}
                role="button"
                tabIndex={0}
                aria-label={t("viewTransferDetails", { name: tr.displayName })}
                onClick={() => handleTransferClick(tr)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTransferClick(tr);
                  }
                }}
                className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5E53E0] focus-visible:ring-offset-1 outline-none"
              >
                {/* Left: name + meta */}
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {tr.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t("sent", { date: fmtDate(tr.createdAt) })}
                    {tr.recipientCount > 0 && (
                      <>
                        {" "}
                        &middot; {t("recipient", { count: tr.recipientCount })}
                      </>
                    )}
                  </p>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-3 text-sm shrink-0">
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-medium">{tr.views}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <Download className="w-3.5 h-3.5" />
                    <span className="font-medium">{tr.downloads}</span>
                  </div>
                  {tr.revenue > 0 && (
                    <span className="text-[#5E53E0] font-medium text-xs">
                      {formatInDisplayCurrency(
                        tr.revenue,
                        tr.currency,
                        globalCurrency,
                      )}
                    </span>
                  )}
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[32px] text-right">
                    {tr.conversionRate !== null
                      ? `${tr.conversionRate.toFixed(0)}%`
                      : "-"}
                  </span>
                  <NavArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---

function KpiCard({
  label,
  value,
  delta,
  deltaColor,
  periodLabel,
  children,
}: {
  label: string;
  value: string;
  delta: { text: string; trend: "up" | "down" | "flat" } | null;
  deltaColor: string;
  periodLabel: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate block mb-2">
        {label}
      </span>
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      {delta && (
        <div className="flex items-center gap-1.5 mt-1">
          {delta.trend === "up" && (
            <StatUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
          )}
          {delta.trend === "down" && (
            <StatDown className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
          )}
          <span className={`text-xs font-medium ${deltaColor}`}>
            {delta.text}
          </span>
          {periodLabel && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {periodLabel}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function DualLineChart({
  data,
  maxY,
  formatDate,
}: {
  data: TrendDataPoint[];
  maxY: number;
  formatDate: (d: string) => string;
}) {
  const W = 600;
  const H = 120;
  const PAD = 2;

  if (data.length < 2) return null;

  const toPath = (key: "views" | "downloads") => {
    const points = data.map((d, i) => {
      const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
      const y = H - PAD - ((d[key] as number) / maxY) * (H - PAD * 2);
      return `${x},${y}`;
    });
    return `M${points.join("L")}`;
  };

  // Show ~5 date labels evenly spread
  const labelCount = Math.min(5, data.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (data.length - 1)),
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD - frac * (H - PAD * 2)}
            y2={H - PAD - frac * (H - PAD * 2)}
            stroke="currentColor"
            className="text-gray-100 dark:text-white/5"
            strokeWidth="1"
          />
        ))}
        {/* Views line (purple) */}
        <path
          d={toPath("views")}
          fill="none"
          stroke="#5E53E0"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Downloads line (green) */}
        <path
          d={toPath("downloads")}
          fill="none"
          stroke="#16A34A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Date labels */}
      <div className="flex justify-between mt-1 px-0.5">
        {labelIndices.map((idx) => (
          <span key={idx} className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(data[idx].date)}
          </span>
        ))}
      </div>
    </div>
  );
}

function RevenueBarChart({
  data,
  formatDate,
  formatRevenue,
}: {
  data: TrendDataPoint[];
  formatDate: (d: string) => string;
  formatRevenue: (amount: number) => string;
}) {
  const W = 600;
  const H = 80;
  const PAD = 2;

  if (data.length < 2) return null;

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const barCount = data.length;
  const gap = 2;
  const totalWidth = W - PAD * 2;
  const slotWidth = totalWidth / barCount;
  const barWidth = Math.max(1, slotWidth - gap);

  // Reuse same label logic as DualLineChart
  const labelCount = Math.min(5, data.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (data.length - 1)),
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-20"
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const barH = Math.max(1, (d.revenue / maxRevenue) * (H - PAD * 2));
          const x = PAD + i * slotWidth;
          const y = H - PAD - barH;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill="#87E64B"
              rx={2}
              ry={2}
            >
              <title>{`${formatDate(d.date)}: ${formatRevenue(d.revenue)}`}</title>
            </rect>
          );
        })}
      </svg>
      {/* Date labels */}
      <div className="flex justify-between mt-1 px-0.5">
        {labelIndices.map((idx) => (
          <span key={idx} className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(data[idx].date)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default AnalyticsPanel;
