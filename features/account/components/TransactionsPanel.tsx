"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, Filter, User, Search, NavArrowDown, Download } from "iconoir-react";
import {
  transactionsApi,
  TransactionDto,
  TransactionStatus,
  PaymentMethod,
} from "@/services/transactions-api";
import { invoicesApi } from "@/services/invoices-api";
import { getCurrentUserId } from "@/utils/auth";
import LoadingPanel from "@/components/LoadingPanel";
import Pagination from "@/components/shared/Pagination";
import { useCurrentCurrency } from "@/stores/currency-store";
import { convertCurrency, formatCurrencyAmount } from "@/lib/currency";

// Pagination constants
const ITEMS_PER_PAGE = 7;

// Period filter options
type PeriodFilter = "all" | "7days" | "30days" | "90days" | "year";

// Category filter options
type CategoryFilter = "all" | "payment" | "refund";

/**
 * TransactionsPanel - Displays transaction history with filters
 * Story 1-7: Sender payment history view
 */
const TransactionsPanel: React.FC = () => {
  const t = useTranslations("transactions");
  const locale = useLocale();
  const { currency: displayCurrency } = useCurrentCurrency();

  // State
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [contactFilter, setContactFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Download state - tracks which transaction is currently downloading
  const [downloadingTxId, setDownloadingTxId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Dropdown open states
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Load transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setError(t("authRequired"));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await transactionsApi.getPaymentHistory(userId);
        if (response.data) {
          setTransactions(response.data);
        } else if (response.error) {
          setError(response.error.message);
        }
      } catch (err) {
        setError(t("loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [t]);

  // Get unique payers (users who made payments) from transactions
  const uniqueContacts = useMemo(() => {
    const contacts = new Set<string>();
    transactions.forEach((tx) => {
      // Use the payer's email (user who made the payment)
      if (tx.user?.email) {
        contacts.add(tx.user.email);
      }
    });
    return Array.from(contacts).sort();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Period filter
      if (periodFilter !== "all") {
        const txDate = new Date(tx.transactionDate);
        const now = new Date();
        const diffDays = Math.floor(
          (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        switch (periodFilter) {
          case "7days":
            if (diffDays > 7) return false;
            break;
          case "30days":
            if (diffDays > 30) return false;
            break;
          case "90days":
            if (diffDays > 90) return false;
            break;
          case "year":
            if (diffDays > 365) return false;
            break;
        }
      }

      // Category filter
      if (categoryFilter !== "all") {
        if (
          categoryFilter === "payment" &&
          tx.transactionStatus !== TransactionStatus.SUCCESS
        ) {
          return false;
        }
        if (
          categoryFilter === "refund" &&
          tx.transactionStatus !== TransactionStatus.REFUNDED
        ) {
          return false;
        }
      }

      // Contact filter - filter by payer email (user who made the payment)
      if (contactFilter) {
        if (tx.user?.email !== contactFilter) {
          return false;
        }
      }

      // Search query (searches in description, reference, payer email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = tx.transferId?.title
          ?.toLowerCase()
          .includes(query);
        const matchesRef = tx.paymentReference?.toLowerCase().includes(query);
        const matchesPayer = tx.user?.email?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesRef && !matchesPayer) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, periodFilter, categoryFilter, contactFilter, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, categoryFilter, contactFilter, searchQuery]);

  // Paginated transactions
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Calculate total balance (sum of successful transactions, converted to display currency)
  const totalBalance = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      if (tx.transactionStatus === TransactionStatus.SUCCESS) {
        // Convert amount from minor units to major units, then to display currency
        const amountInMajorUnits = tx.amountPaid / 100;
        const convertedAmount = convertCurrency(
          amountInMajorUnits,
          tx.currency || "XOF",
          displayCurrency,
        );
        return sum + convertedAmount;
      }
      return sum;
    }, 0);
  }, [transactions, displayCurrency]);

  // Format currency with conversion to display currency
  const formatAmount = (
    amountMinorUnits: number,
    originalCurrency: string,
  ): string => {
    const amount = amountMinorUnits / 100;
    const converted = convertCurrency(
      amount,
      originalCurrency,
      displayCurrency,
    );
    return formatCurrencyAmount(converted, displayCurrency, locale);
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

  // Get payment method label
  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CARD:
        return t("methodCard");
      case PaymentMethod.MOBILE_MONEY:
        return t("methodMobileMoney");
      case PaymentMethod.BANK_TRANSFER:
        return t("methodBankTransfer");
      default:
        return method;
    }
  };

  // Get status badge classes
  const getStatusBadge = (
    status: TransactionStatus,
  ): { label: string; className: string } => {
    switch (status) {
      case TransactionStatus.SUCCESS:
        return {
          label: t("statusSuccess"),
          className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        };
      case TransactionStatus.PENDING:
        return {
          label: t("statusPending"),
          className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
      case TransactionStatus.FAILED:
        return {
          label: t("statusFailed"),
          className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        };
      case TransactionStatus.REFUNDED:
        return {
          label: t("statusRefunded"),
          className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        };
      case TransactionStatus.CANCELLED:
        return {
          label: t("statusCancelled"),
          className: "bg-gray-100 text-gray-700 dark:bg-[oklch(0.28_0_0)] dark:text-[oklch(0.75_0_0)]",
        };
      default:
        return { label: status, className: "bg-gray-100 text-gray-700 dark:bg-[oklch(0.28_0_0)] dark:text-[oklch(0.75_0_0)]" };
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

  // Category options
  const categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: "all", label: t("categoryAll") },
    { value: "payment", label: t("categoryPayment") },
    { value: "refund", label: t("categoryRefund") },
  ];

  // Handle invoice download for a transaction
  const handleDownloadReceipt = async (transactionId: string) => {
    if (downloadingTxId) return;
    setDownloadingTxId(transactionId);
    setDownloadError(null);

    try {
      // Step 1: Find invoice for this transaction
      const listResponse = await invoicesApi.listInvoices({
        transactionId,
        limit: 1,
      });

      if (listResponse.error || !listResponse.data?.data?.length) {
        setDownloadError(t("noReceiptAvailable"));
        setTimeout(() => setDownloadError(null), 3000);
        return;
      }

      const invoiceId = listResponse.data.data[0].id;

      // Step 2: Get presigned download URL
      const downloadResponse = await invoicesApi.downloadInvoice(invoiceId);

      if (downloadResponse.error || !downloadResponse.data?.downloadUrl) {
        setDownloadError(t("downloadError"));
        setTimeout(() => setDownloadError(null), 3000);
        return;
      }

      // Step 3: Redirect to download
      window.location.href = downloadResponse.data.downloadUrl;
    } catch {
      setDownloadError(t("downloadError"));
      setTimeout(() => setDownloadError(null), 3000);
    } finally {
      setDownloadingTxId(null);
    }
  };

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
        <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
          {t("title")}
        </h3>
        {/* Balance display */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-[oklch(0.75_0_0)]">
          <span>{t("availableBalance")}:</span>
          <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
            {formatCurrencyAmount(totalBalance, displayCurrency, locale)}
          </span>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Period Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsPeriodOpen(!isPeriodOpen);
              setIsCategoryOpen(false);
              setIsContactOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[oklch(0.30_0_0)] rounded bg-white dark:bg-[oklch(0.22_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.40_0_0)] transition-colors min-w-[140px]"
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
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded shadow-lg dark:shadow-black/30 z-10">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPeriodFilter(option.value);
                    setIsPeriodOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] ${
                    periodFilter === option.value
                      ? "bg-[#87E64B]/10 text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
                      : "text-gray-700 dark:text-[oklch(0.75_0_0)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsCategoryOpen(!isCategoryOpen);
              setIsPeriodOpen(false);
              setIsContactOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[oklch(0.30_0_0)] rounded bg-white dark:bg-[oklch(0.22_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.40_0_0)] transition-colors min-w-[140px]"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="flex-1 text-left text-sm">
              {categoryOptions.find((o) => o.value === categoryFilter)?.label}
            </span>
            <NavArrowDown
              className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded shadow-lg dark:shadow-black/30 z-10">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setCategoryFilter(option.value);
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] ${
                    categoryFilter === option.value
                      ? "bg-[#87E64B]/10 text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
                      : "text-gray-700 dark:text-[oklch(0.75_0_0)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact Filter */}
        {uniqueContacts.length > 0 && (
          <div className="relative">
            <button
              onClick={() => {
                setIsContactOpen(!isContactOpen);
                setIsPeriodOpen(false);
                setIsCategoryOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-[oklch(0.30_0_0)] rounded bg-white dark:bg-[oklch(0.22_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.40_0_0)] transition-colors min-w-[180px]"
            >
              <User className="w-4 h-4 text-gray-500" />
              <span className="flex-1 text-left text-sm truncate">
                {contactFilter || t("contactAll")}
              </span>
              <NavArrowDown
                className={`w-4 h-4 text-gray-500 transition-transform ${isContactOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isContactOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded shadow-lg dark:shadow-black/30 z-10 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setContactFilter("");
                    setIsContactOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] ${
                    !contactFilter
                      ? "bg-[#87E64B]/10 text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
                      : "text-gray-700 dark:text-[oklch(0.75_0_0)]"
                  }`}
                >
                  {t("contactAll")}
                </button>
                {uniqueContacts.map((email) => (
                  <button
                    key={email}
                    onClick={() => {
                      setContactFilter(email);
                      setIsContactOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] truncate ${
                      contactFilter === email
                        ? "bg-[#87E64B]/10 text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
                        : "text-gray-700 dark:text-[oklch(0.75_0_0)]"
                    }`}
                  >
                    {email}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-[oklch(0.30_0_0)] rounded bg-white dark:bg-[oklch(0.22_0_0)] text-sm dark:text-[oklch(0.91_0_0)] dark:placeholder-[oklch(0.60_0_0)] focus:outline-none hover:border-[#171717] dark:hover:border-[oklch(0.40_0_0)] focus:border-[#171717] dark:focus:border-[oklch(0.91_0_0)]"
          />
        </div>
      </div>

      {/* Download error banner (inline, doesn't replace table) */}
      {downloadError && (
        <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded">
          {downloadError}
        </div>
      )}

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-[oklch(0.75_0_0)]">
          {searchQuery ||
          periodFilter !== "all" ||
          categoryFilter !== "all" ||
          contactFilter
            ? t("noResultsFiltered")
            : t("noTransactions")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {t("colDate")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {t("colType")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {t("colDescription")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {t("colContact")}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {t("colAmount")}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-[oklch(0.60_0_0)]">
                  {t("colRefId")}
                </th>
                <th className="w-12 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => {
                const statusBadge = getStatusBadge(tx.transactionStatus);
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-gray-100 dark:border-[oklch(0.30_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)]"
                  >
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-[oklch(0.91_0_0)]">
                      {formatDate(tx.transactionDate)}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-[oklch(0.91_0_0)]">
                      <div>
                        <p className="font-medium">
                          {tx.transferId?.title || t("untitledTransfer")}
                        </p>
                        <p className="text-gray-500 dark:text-[oklch(0.60_0_0)] text-xs">
                          {getPaymentMethodLabel(tx.paymentMethod)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-[oklch(0.75_0_0)]">
                      {tx.user?.email || "-"}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-medium text-gray-900 dark:text-[oklch(0.91_0_0)]">
                      {formatAmount(tx.amountPaid, tx.currency)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500 dark:text-[oklch(0.60_0_0)] font-mono">
                      {tx.paymentReference?.slice(0, 12) || "-"}
                    </td>
                    <td className="py-4 px-4">
                      {tx.transactionStatus === TransactionStatus.SUCCESS ||
                      tx.transactionStatus === TransactionStatus.REFUNDED ? (
                        <button
                          onClick={() => handleDownloadReceipt(tx.id)}
                          disabled={downloadingTxId === tx.id}
                          title={t("downloadReceipt")}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] transition-colors text-gray-500 dark:text-[oklch(0.60_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.91_0_0)] disabled:opacity-50 disabled:cursor-wait"
                        >
                          <Download
                            className={`w-4 h-4 ${downloadingTxId === tx.id ? "animate-pulse" : ""}`}
                          />
                        </button>
                      ) : tx.transactionStatus ===
                        TransactionStatus.PENDING ? (
                        <span
                          title={t("receiptGenerating")}
                          className="p-1.5 inline-block text-gray-300 cursor-not-allowed"
                        >
                          <Download className="w-4 h-4" />
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredTransactions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredTransactions.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          className="mt-4 border-t border-gray-200 dark:border-[oklch(0.30_0_0)]"
        />
      )}
    </div>
  );
};

export default TransactionsPanel;
