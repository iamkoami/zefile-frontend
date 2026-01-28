'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Wallet, Calendar, NavArrowDown, InfoCircle } from 'iconoir-react';
import { transactionsApi, TransactionDto, TransactionStatus } from '@/services/transactions-api';
import { getCurrentUserId } from '@/utils/auth';
import LoadingPanel from '@/components/LoadingPanel';

// Payout status type (for future implementation)
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Period filter options
type PeriodFilter = 'all' | '7days' | '30days' | '90days' | 'year';

/**
 * PayoutsPanel - Displays payout/withdrawal status and history
 * Story 1-8: Payout status visibility
 */
const PayoutsPanel: React.FC = () => {
  const t = useTranslations('payouts');
  const locale = useLocale();

  // State
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  // Load transactions to calculate available balance
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

  // Calculate available balance (total received - already withdrawn)
  // For now, this is a simplified calculation based on successful transactions
  const { availableBalance, pendingBalance, totalEarned } = useMemo(() => {
    let total = 0;
    transactions.forEach((tx) => {
      if (tx.transactionStatus === TransactionStatus.SUCCESS) {
        total += tx.amountPaid;
      }
    });

    // In a real implementation, we would subtract already withdrawn amounts
    // For now, showing total as available
    return {
      totalEarned: total,
      availableBalance: total, // Would be: total - withdrawn
      pendingBalance: 0, // Payouts in processing
    };
  }, [transactions]);

  // Format currency
  const formatAmount = (amount: number, currency: string = 'XOF'): string => {
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

  // Period options
  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'all', label: t('periodAll') },
    { value: '7days', label: t('period7days') },
    { value: '30days', label: t('period30days') },
    { value: '90days', label: t('period90days') },
    { value: 'year', label: t('periodYear') },
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
        <p className="text-gray-500 text-sm">{t('subtitle')}</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-[#87E64B]/10 to-[#87E64B]/5 border border-[#87E64B]/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-[#87E64B]" />
            <span className="text-sm text-gray-600">{t('availableBalance')}</span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {formatAmount(availableBalance)}
          </p>
        </div>

        {/* Pending Payouts */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">{t('pendingPayouts')}</span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {formatAmount(pendingBalance)}
          </p>
        </div>

        {/* Total Earned */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">{t('totalEarned')}</span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {formatAmount(totalEarned)}
          </p>
        </div>
      </div>

      {/* Withdrawal Section */}
      <div className="bg-[#FDF8F0] border border-[#E8E0D5] rounded-lg p-6 mb-8">
        <div className="flex items-start gap-3">
          <InfoCircle className="w-5 h-5 text-[#5E53E0] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-[#171717] mb-1">{t('withdrawalInfo')}</h4>
            <p className="text-sm text-gray-600">{t('withdrawalDescription')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('minimumWithdrawal')}: {formatAmount(100000)}</p>
          </div>
        </div>
      </div>

      {/* Request Withdrawal Button */}
      <button
        disabled={availableBalance < 100000} // Minimum 1000 XOF
        className="w-full md:w-auto px-6 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-8"
      >
        {t('requestWithdrawal')}
      </button>

      {/* Payout History Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-[#171717]">{t('payoutHistory')}</h4>

          {/* Period Filter */}
          <div className="relative">
            <button
              onClick={() => setIsPeriodOpen(!isPeriodOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[140px]"
            >
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="flex-1 text-left text-sm">
                {periodOptions.find((o) => o.value === periodFilter)?.label}
              </span>
              <NavArrowDown className={`w-4 h-4 text-gray-500 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
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
                      periodFilter === option.value ? 'bg-[#87E64B]/10 text-[#171717] font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('noPayouts')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('noPayoutsHint')}</p>
        </div>
      </div>
    </div>
  );
};

export default PayoutsPanel;
