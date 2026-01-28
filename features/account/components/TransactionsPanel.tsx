'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Calendar, Filter, User, Search, NavArrowDown } from 'iconoir-react';
import { transactionsApi, TransactionDto, TransactionStatus, PaymentMethod } from '@/services/transactions-api';
import { getCurrentUserId } from '@/utils/auth';
import LoadingPanel from '@/components/LoadingPanel';

// Period filter options
type PeriodFilter = 'all' | '7days' | '30days' | '90days' | 'year';

// Category filter options
type CategoryFilter = 'all' | 'payment' | 'refund';

/**
 * TransactionsPanel - Displays transaction history with filters
 * Story 1-7: Sender payment history view
 */
const TransactionsPanel: React.FC = () => {
  const t = useTranslations('transactions');
  const locale = useLocale();

  // State
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [contactFilter, setContactFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown open states
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Load transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setError(t('authRequired'));
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
        setError(t('loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [t]);

  // Get unique contacts from transactions
  const uniqueContacts = useMemo(() => {
    const contacts = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.transferId?.recipientEmails) {
        tx.transferId.recipientEmails.forEach((email) => contacts.add(email));
      }
    });
    return Array.from(contacts).sort();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Period filter
      if (periodFilter !== 'all') {
        const txDate = new Date(tx.transactionDate);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (periodFilter) {
          case '7days':
            if (diffDays > 7) return false;
            break;
          case '30days':
            if (diffDays > 30) return false;
            break;
          case '90days':
            if (diffDays > 90) return false;
            break;
          case 'year':
            if (diffDays > 365) return false;
            break;
        }
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'payment' && tx.transactionStatus !== TransactionStatus.SUCCESS) {
          return false;
        }
        if (categoryFilter === 'refund' && tx.transactionStatus !== TransactionStatus.REFUNDED) {
          return false;
        }
      }

      // Contact filter
      if (contactFilter && tx.transferId?.recipientEmails) {
        if (!tx.transferId.recipientEmails.includes(contactFilter)) {
          return false;
        }
      }

      // Search query (searches in description, reference, contact)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = tx.transferId?.title?.toLowerCase().includes(query);
        const matchesRef = tx.paymentReference?.toLowerCase().includes(query);
        const matchesContact = tx.transferId?.recipientEmails?.some((e) =>
          e.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesRef && !matchesContact) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, periodFilter, categoryFilter, contactFilter, searchQuery]);

  // Calculate total balance (sum of successful transactions)
  const totalBalance = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      if (tx.transactionStatus === TransactionStatus.SUCCESS) {
        return sum + tx.amountPaid;
      }
      return sum;
    }, 0);
  }, [transactions]);

  // Format currency
  const formatAmount = (amount: number, currency: string): string => {
    const symbols: Record<string, string> = {
      XOF: 'Fr CFA',
      NGN: '₦',
      GHS: '₵',
      KES: 'KSh',
      ZAR: 'R',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    const symbol = symbols[currency] || currency;
    const formatted = (amount / 100).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US');
    return currency === 'XOF' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get payment method label
  const getPaymentMethodLabel = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CARD:
        return t('methodCard');
      case PaymentMethod.MOBILE_MONEY:
        return t('methodMobileMoney');
      case PaymentMethod.BANK_TRANSFER:
        return t('methodBankTransfer');
      default:
        return method;
    }
  };

  // Get status badge classes
  const getStatusBadge = (status: TransactionStatus): { label: string; className: string } => {
    switch (status) {
      case TransactionStatus.SUCCESS:
        return { label: t('statusSuccess'), className: 'bg-green-100 text-green-700' };
      case TransactionStatus.PENDING:
        return { label: t('statusPending'), className: 'bg-yellow-100 text-yellow-700' };
      case TransactionStatus.FAILED:
        return { label: t('statusFailed'), className: 'bg-red-100 text-red-700' };
      case TransactionStatus.REFUNDED:
        return { label: t('statusRefunded'), className: 'bg-blue-100 text-blue-700' };
      case TransactionStatus.CANCELLED:
        return { label: t('statusCancelled'), className: 'bg-gray-100 text-gray-700' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-700' };
    }
  };

  // Period options
  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'all', label: t('periodAll') },
    { value: '7days', label: t('period7days') },
    { value: '30days', label: t('period30days') },
    { value: '90days', label: t('period90days') },
    { value: 'year', label: t('periodYear') },
  ];

  // Category options
  const categoryOptions: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: t('categoryAll') },
    { value: 'payment', label: t('categoryPayment') },
    { value: 'refund', label: t('categoryRefund') },
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
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-[#171717] mb-2">
          {t('title')}
        </h3>
        {/* Balance display */}
        <div className="flex items-center gap-2 text-gray-600">
          <span>{t('availableBalance')}:</span>
          <span className="font-semibold text-[#171717]">
            {formatAmount(totalBalance, 'XOF')}
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
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[140px]"
          >
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="flex-1 text-left text-sm">
              {periodOptions.find((o) => o.value === periodFilter)?.label}
            </span>
            <NavArrowDown className={`w-4 h-4 text-gray-500 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
          </button>
          {isPeriodOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10">
              {periodOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPeriodFilter(option.value);
                    setIsPeriodOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    periodFilter === option.value ? 'bg-[#87E64B]/10 text-[#171717] font-medium' : 'text-gray-700'
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
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[140px]"
          >
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="flex-1 text-left text-sm">
              {categoryOptions.find((o) => o.value === categoryFilter)?.label}
            </span>
            <NavArrowDown className={`w-4 h-4 text-gray-500 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
          </button>
          {isCategoryOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setCategoryFilter(option.value);
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    categoryFilter === option.value ? 'bg-[#87E64B]/10 text-[#171717] font-medium' : 'text-gray-700'
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
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[180px]"
            >
              <User className="w-4 h-4 text-gray-500" />
              <span className="flex-1 text-left text-sm truncate">
                {contactFilter || t('contactAll')}
              </span>
              <NavArrowDown className={`w-4 h-4 text-gray-500 transition-transform ${isContactOpen ? 'rotate-180' : ''}`} />
            </button>
            {isContactOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setContactFilter('');
                    setIsContactOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    !contactFilter ? 'bg-[#87E64B]/10 text-[#171717] font-medium' : 'text-gray-700'
                  }`}
                >
                  {t('contactAll')}
                </button>
                {uniqueContacts.map((email) => (
                  <button
                    key={email}
                    onClick={() => {
                      setContactFilter(email);
                      setIsContactOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 truncate ${
                      contactFilter === email ? 'bg-[#87E64B]/10 text-[#171717] font-medium' : 'text-gray-700'
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
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#5E53E0] text-sm"
          />
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery || periodFilter !== 'all' || categoryFilter !== 'all' || contactFilter
            ? t('noResultsFiltered')
            : t('noTransactions')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('colDate')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('colType')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('colDescription')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('colContact')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('colAmount')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('colRefId')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const statusBadge = getStatusBadge(tx.transactionStatus);
                return (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {formatDate(tx.transactionDate)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{tx.transferId?.title || t('untitledTransfer')}</p>
                        <p className="text-gray-500 text-xs">{getPaymentMethodLabel(tx.paymentMethod)}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {tx.transferId?.recipientEmails?.[0] || '-'}
                      {(tx.transferId?.recipientEmails?.length || 0) > 1 && (
                        <span className="text-gray-400 text-xs ml-1">
                          +{(tx.transferId?.recipientEmails?.length || 0) - 1}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-right font-medium text-gray-900">
                      {formatAmount(tx.amountPaid, tx.currency)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500 font-mono">
                      {tx.paymentReference?.slice(0, 12) || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionsPanel;
