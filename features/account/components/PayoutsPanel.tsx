"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Wallet,
  Calendar,
  NavArrowDown,
  InfoCircle,
  Refresh,
  WarningCircle,
  Check,
  Clock,
  Send,
  CreditCard,
  Xmark,
} from "iconoir-react";
import {
  payoutsApi,
  PayoutStatus,
  PayoutMethod,
  SenderPayoutsResponse,
} from "@/services/payouts-api";
import { withdrawalsApi, BalanceResponse } from "@/services/withdrawals-api";
import { payoutMethodsApi } from "@/services/payout-methods-api";
import LoadingPanel from "@/components/LoadingPanel";
import { useCurrentCurrency } from "@/stores/currency-store";
import { convertCurrency, formatCurrencyAmount } from "@/lib/currency";
import PayoutMethodsPanel from "./PayoutMethodsPanel";
import WithdrawalRequestPanel from "./WithdrawalRequestPanel";

// Period filter options
type PeriodFilter = "all" | "7days" | "30days" | "90days" | "year";

// Tab options
type PayoutsTab = "history" | "methods";

/**
 * PayoutsPanel - Displays payout/withdrawal status and history
 * Story 1-8: Payout status visibility
 * Stories 14-2, 14-3, 14-6, 14-7: Payout methods and withdrawals
 */
const PayoutsPanel: React.FC = () => {
  const t = useTranslations("payouts");
  const tMethods = useTranslations("payoutMethods");
  const locale = useLocale();
  const { currency: displayCurrency } = useCurrentCurrency();

  // Tab state
  const [activeTab, setActiveTab] = useState<PayoutsTab>("history");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Balance state
  const [balance, setBalance] = useState<BalanceResponse | null>(null);

  // Payout methods count (for auto-switching to methods tab on initial load only)
  const [hasPayoutMethods, setHasPayoutMethods] = useState<boolean | null>(
    null,
  );
  const [hasInitialRedirect, setHasInitialRedirect] = useState(false);

  // State
  const [payoutsData, setPayoutsData] = useState<SenderPayoutsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "all">("all");
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load payouts, balance, and payout methods count
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [payoutsRes, balanceRes, methodsRes] = await Promise.all([
          payoutsApi.getSenderPayouts({
            status: statusFilter !== "all" ? statusFilter : undefined,
            page: currentPage,
            limit: pageSize,
          }),
          withdrawalsApi.getBalance(),
          payoutMethodsApi.getPayoutMethods(),
        ]);

        if (payoutsRes.data) {
          setPayoutsData(payoutsRes.data);
        } else if (payoutsRes.error) {
          setError(payoutsRes.error.message);
        }

        if (balanceRes.data) {
          setBalance(balanceRes.data);
        }

        // Track if user has any payout methods
        if (methodsRes.data) {
          setHasPayoutMethods(methodsRes.data.length > 0);
        }
      } catch (err) {
        setError(t("loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [t, statusFilter, currentPage]);

  // Auto-switch to "methods" tab when no payout methods exist (only on initial load)
  useEffect(() => {
    if (!isLoading && hasPayoutMethods === false && !hasInitialRedirect) {
      setActiveTab("methods");
      setHasInitialRedirect(true);
    }
  }, [isLoading, hasPayoutMethods, hasInitialRedirect]);

  // Handle withdrawal success
  const handleWithdrawalSuccess = async () => {
    // Refresh balance after successful withdrawal
    const balanceRes = await withdrawalsApi.getBalance();
    if (balanceRes.data) {
      setBalance(balanceRes.data);
    }
  };

  // Filter by period (client-side for now)
  const filteredPayouts = useMemo(() => {
    if (!payoutsData?.payouts) return [];

    return payoutsData.payouts.filter((payout) => {
      if (periodFilter === "all") return true;

      const payoutDate = new Date(payout.createdAt);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - payoutDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      switch (periodFilter) {
        case "7days":
          return diffDays <= 7;
        case "30days":
          return diffDays <= 30;
        case "90days":
          return diffDays <= 90;
        case "year":
          return diffDays <= 365;
        default:
          return true;
      }
    });
  }, [payoutsData, periodFilter]);

  // Calculate summary from payouts
  const { availableBalance, pendingBalance, totalEarned } = useMemo(() => {
    if (!payoutsData?.payouts) {
      return { availableBalance: 0, pendingBalance: 0, totalEarned: 0 };
    }

    let completed = 0;
    let pending = 0;

    payoutsData.payouts.forEach((payout) => {
      if (payout.status === PayoutStatus.COMPLETED) {
        completed += payout.amountMinorUnits;
      } else if (
        payout.status === PayoutStatus.PENDING ||
        payout.status === PayoutStatus.APPROVED ||
        payout.status === PayoutStatus.PROCESSING
      ) {
        pending += payout.amountMinorUnits;
      }
    });

    return {
      totalEarned: completed + pending,
      availableBalance: completed,
      pendingBalance: pending,
    };
  }, [payoutsData]);

  // Handle retry payout
  const handleRetryPayout = async (payoutId: string) => {
    setIsRetrying(payoutId);
    try {
      const response = await payoutsApi.retryPayout(payoutId);
      if (response.data) {
        // Refresh the list
        const refreshResponse = await payoutsApi.getSenderPayouts({
          status: statusFilter !== "all" ? statusFilter : undefined,
          page: currentPage,
          limit: pageSize,
        });
        if (refreshResponse.data) {
          setPayoutsData(refreshResponse.data);
        }
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t("retryError"));
    } finally {
      setIsRetrying(null);
    }
  };

  // Format currency with conversion to display currency (without "Free" for zero)
  const formatAmount = (
    amountMinorUnits: number,
    originalCurrency: string = "XOF",
  ): string => {
    const amount = amountMinorUnits / 100;
    const converted = convertCurrency(
      amount,
      originalCurrency,
      displayCurrency,
    );
    return formatCurrencyAmount(converted, displayCurrency);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (
    status: PayoutStatus,
  ): { label: string; className: string; icon: React.ReactNode } => {
    switch (status) {
      case PayoutStatus.COMPLETED:
        return {
          label: t("statusCompleted"),
          className: "bg-green-100 text-green-700",
          icon: <Check className="w-3 h-3" />,
        };
      case PayoutStatus.PENDING:
        return {
          label: t("statusPending"),
          className: "bg-yellow-100 text-yellow-700",
          icon: <Clock className="w-3 h-3" />,
        };
      case PayoutStatus.APPROVED:
        return {
          label: t("statusApproved"),
          className: "bg-purple-100 text-purple-700",
          icon: <Check className="w-3 h-3" />,
        };
      case PayoutStatus.PROCESSING:
        return {
          label: t("statusProcessing"),
          className: "bg-blue-100 text-blue-700",
          icon: <Clock className="w-3 h-3 animate-pulse" />,
        };
      case PayoutStatus.FAILED:
        return {
          label: t("statusFailed"),
          className: "bg-red-100 text-red-700",
          icon: <WarningCircle className="w-3 h-3" />,
        };
      case PayoutStatus.REJECTED:
        return {
          label: t("statusRejected"),
          className: "bg-red-100 text-red-700",
          icon: <WarningCircle className="w-3 h-3" />,
        };
      default:
        return {
          label: String(status),
          className: "bg-gray-100 text-gray-700",
          icon: null,
        };
    }
  };

  // Get payout method label
  const getMethodLabel = (method: PayoutMethod): string => {
    switch (method) {
      case PayoutMethod.MOBILE_MONEY:
        return t("methodMobileMoney");
      case PayoutMethod.BANK_TRANSFER:
        return t("methodBankTransfer");
      default:
        return method;
    }
  };

  // Period options
  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: "all", label: t("periodAll") },
    { value: "7days", label: t("period7days") },
    { value: "30days", label: t("period30days") },
    { value: "90days", label: t("period90days") },
    { value: "year", label: t("periodYear") },
  ];

  // Status options
  const statusOptions: { value: PayoutStatus | "all"; label: string }[] = [
    { value: "all", label: t("statusAll") },
    { value: PayoutStatus.PENDING, label: t("statusPending") },
    { value: PayoutStatus.APPROVED, label: t("statusApproved") },
    { value: PayoutStatus.PROCESSING, label: t("statusProcessing") },
    { value: PayoutStatus.COMPLETED, label: t("statusCompleted") },
    { value: PayoutStatus.FAILED, label: t("statusFailed") },
    { value: PayoutStatus.REJECTED, label: t("statusRejected") },
  ];

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h3 className="text-2xl font-semibold text-[#171717] mb-2">
          {t("title")}
        </h3>
        <p className="text-gray-500 text-sm">{t("subtitle")}</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-[#87E64B]/10 to-[#87E64B]/5 border border-[#87E64B]/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-[#87E64B]" />
            <span className="text-sm text-gray-600">
              {t("availableBalance")}
            </span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {formatAmount(
              balance?.availableMinorUnits || 0,
              balance?.currency || "XOF",
            )}
          </p>
        </div>

        {/* Pending Payouts */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">{t("pendingPayouts")}</span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {formatAmount(
              balance?.pendingMinorUnits || 0,
              balance?.currency || "XOF",
            )}
          </p>
        </div>

        {/* Total Earned */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">{t("totalEarned")}</span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {formatAmount(
              (balance?.availableMinorUnits || 0) +
                (balance?.pendingMinorUnits || 0),
              balance?.currency || "XOF",
            )}
          </p>
        </div>
      </div>

      {/* Request Withdrawal Button */}
      <button
        onClick={() => setShowWithdrawModal(true)}
        disabled={(balance?.availableMinorUnits || 0) < 100000}
        className="w-full md:w-auto px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        {t("requestWithdrawal")}
      </button>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 mt-10">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-md font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-[#87E64B] text-[#171717]"
              : "border-transparent text-gray-500 hover:text-[#171717]"
          }`}
        >
          {t("payoutHistory")}
        </button>
        <button
          onClick={() => setActiveTab("methods")}
          className={`px-4 py-2 text-md font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "methods"
              ? "border-[#87E64B] text-[#171717]"
              : "border-transparent text-gray-500 hover:text-[#171717]"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {tMethods("title")}
        </button>
      </div>

      {/* Payout Methods Tab */}
      {activeTab === "methods" && <PayoutMethodsPanel />}

      {/* Payout History Tab */}
      {activeTab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-[#171717]">
              {t("payoutHistory")}
            </h4>

            <div className="flex items-center gap-3">
              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsStatusOpen(!isStatusOpen);
                    setIsPeriodOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[140px]"
                >
                  <span className="flex-1 text-left text-sm">
                    {statusOptions.find((o) => o.value === statusFilter)?.label}
                  </span>
                  <NavArrowDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${isStatusOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isStatusOpen && (
                  <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setIsStatusOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          statusFilter === option.value
                            ? "bg-[#87E64B]/10 text-[#171717] font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Period Filter */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsPeriodOpen(!isPeriodOpen);
                    setIsStatusOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[140px]"
                >
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="flex-1 text-left text-sm">
                    {periodOptions.find((o) => o.value === periodFilter)?.label}
                  </span>
                  <NavArrowDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${isPeriodOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isPeriodOpen && (
                  <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10">
                    {periodOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPeriodFilter(option.value);
                          setIsPeriodOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          periodFilter === option.value
                            ? "bg-[#87E64B]/10 text-[#171717] font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payouts List */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t("noPayouts")}</p>
              <p className="text-sm text-gray-400 mt-1">{t("noPayoutsHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayouts.map((payout) => {
                const statusBadge = getStatusBadge(payout.status);
                const canRetry =
                  payout.status === PayoutStatus.FAILED &&
                  payout.retryCount < 3;

                return (
                  <div
                    key={payout.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Transfer Title */}
                        <p className="font-medium text-[#171717] mb-1">
                          {payout.paymentId?.transferId?.title ||
                            t("untitledTransfer")}
                        </p>

                        {/* Details Row */}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatDate(payout.createdAt)}</span>
                          {payout.payoutMethod?.type && (
                            <>
                              <span>•</span>
                              <span>
                                {payout.payoutMethod.type === "bank_account"
                                  ? t("methodBankTransfer")
                                  : t("methodMobileMoney")}
                              </span>
                            </>
                          )}
                          {(payout.payoutMethod?.accountNumber ||
                            payout.payoutMethod?.phoneNumber) && (
                            <>
                              <span>•</span>
                              <span>
                                {payout.payoutMethod.accountNumber ||
                                  payout.payoutMethod.phoneNumber}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Failure Reason */}
                        {payout.status === PayoutStatus.FAILED &&
                          payout.failureReason && (
                            <p className="text-sm text-red-500 mt-2">
                              {payout.failureReason}
                            </p>
                          )}

                        {/* Estimated Arrival */}
                        {(payout.status === PayoutStatus.PENDING ||
                          payout.status === PayoutStatus.APPROVED ||
                          payout.status === PayoutStatus.PROCESSING) &&
                          payout.estimatedArrival && (
                            <p className="text-sm text-gray-500 mt-2">
                              {t("estimatedArrival")}:{" "}
                              {formatDate(payout.estimatedArrival)}
                            </p>
                          )}
                      </div>

                      {/* Right Side: Amount + Status */}
                      <div className="text-right ml-4">
                        <p className="font-semibold text-[#171717] mb-2">
                          {formatAmount(
                            payout.amountMinorUnits,
                            payout.currency,
                          )}
                        </p>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${statusBadge.className}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>

                        {/* Retry Button */}
                        {canRetry && (
                          <button
                            onClick={() => handleRetryPayout(payout.id)}
                            disabled={isRetrying === payout.id}
                            className="mt-2 flex items-center gap-1 text-sm text-[#5E53E0] hover:underline disabled:opacity-50"
                          >
                            <Refresh
                              className={`w-4 h-4 ${isRetrying === payout.id ? "animate-spin" : ""}`}
                            />
                            {t("retryPayout")}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reference */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {t("reference")}: {payout.reference}
                      </span>
                      {payout.retryCount > 0 && (
                        <span>
                          {t("retryCount")}: {payout.retryCount}/3
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {payoutsData && payoutsData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("previous")}
              </button>
              <span className="text-sm text-gray-600">
                {currentPage} / {payoutsData.totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(payoutsData.totalPages, p + 1))
                }
                disabled={currentPage === payoutsData.totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("next")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {t("requestWithdrawal")}
              </h2>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Xmark className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <WithdrawalRequestPanel
                onClose={() => setShowWithdrawModal(false)}
                onSuccess={handleWithdrawalSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutsPanel;
