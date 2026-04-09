import type { AnalyticsOverview, TopTransfer, AnalyticsPeriod } from "@/services/analytics-api";

export interface TipCandidate {
  key: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
}

// --- localStorage helpers ---

const STORAGE_KEY = "zefile_dismissed_analytics_tips";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDismissedTips(): Record<string, number> {
  try {
    if (typeof window === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return {};
  }
}

function isTipDismissed(tipKey: string): boolean {
  const dismissed = getDismissedTips();
  const timestamp = dismissed[tipKey];
  if (!timestamp) return false;
  if (Date.now() - timestamp > DISMISS_DURATION_MS) {
    delete dismissed[tipKey];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    } catch {
      // ignore
    }
    return false;
  }
  return true;
}

export function dismissTip(tipKey: string): void {
  try {
    if (typeof window === "undefined") return;
    const dismissed = getDismissedTips();
    dismissed[tipKey] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
    if (tipKey === "tipFirstSale") {
      localStorage.setItem("zefile_first_sale_seen", "1");
    }
  } catch {
    // ignore
  }
}

// --- Tip selection ---

export function selectAnalyticsTip(
  overview: AnalyticsOverview,
  transfers: TopTransfer[],
  period: AnalyticsPeriod,
): TipCandidate | null {
  // Priority 1: Low conversion
  if (
    overview.conversionRate !== null &&
    overview.conversionRate < 20 &&
    overview.totalViewsDelta.value > 10 &&
    !isTipDismissed("tipLowConversion")
  ) {
    return { key: "tipLowConversion", messageKey: "tipLowConversion" };
  }

  // Priority 2: No views after 3+ days
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const hasStaleTransfer = transfers.some(
    (tr) => tr.views === 0 && new Date(tr.createdAt).getTime() < threeDaysAgo,
  );
  if (hasStaleTransfer && !isTipDismissed("tipNoViews")) {
    return { key: "tipNoViews", messageKey: "tipNoViews" };
  }

  // Priority 3: First sale
  try {
    const firstSaleSeen =
      typeof window !== "undefined"
        ? localStorage.getItem("zefile_first_sale_seen")
        : null;
    if (
      overview.totalRevenueDelta.value > 0 &&
      !firstSaleSeen &&
      !isTipDismissed("tipFirstSale")
    ) {
      return { key: "tipFirstSale", messageKey: "tipFirstSale" };
    }
  } catch {
    // ignore
  }

  // Priority 4: Revenue up
  if (
    overview.totalRevenueDelta.trend === "up" &&
    overview.totalRevenueDelta.percentChange !== null &&
    overview.totalRevenueDelta.percentChange > 20 &&
    !isTipDismissed("tipRevenueUp")
  ) {
    return {
      key: "tipRevenueUp",
      messageKey: "tipRevenueUp",
      messageParams: {
        percent: Math.round(overview.totalRevenueDelta.percentChange),
      },
    };
  }

  // Priority 5: Downloads up
  if (
    overview.totalDownloadsDelta.trend === "up" &&
    overview.totalDownloadsDelta.percentChange !== null &&
    overview.totalDownloadsDelta.percentChange > 30 &&
    !isTipDismissed("tipDownloadsUp")
  ) {
    return {
      key: "tipDownloadsUp",
      messageKey: "tipDownloadsUp",
      messageParams: {
        percent: Math.round(overview.totalDownloadsDelta.percentChange),
      },
    };
  }

  // Priority 6: Inactive (only for 30d period)
  if (
    overview.totalTransfersDelta.value === 0 &&
    period === "30d" &&
    !isTipDismissed("tipInactive")
  ) {
    return { key: "tipInactive", messageKey: "tipInactive" };
  }

  return null;
}
