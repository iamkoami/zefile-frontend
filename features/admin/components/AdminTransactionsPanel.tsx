'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  NavArrowDown,
  Search,
  Refresh,
  Download,
  Calendar,
  CreditCard,
  InfoCircle,
  Xmark,
} from 'iconoir-react';
import {
  adminTransactionsApi,
  Transaction,
  TransactionFilters,
  PaginatedTransactionsResponse,
  TransactionStatsResponse,
  TransactionStatus,
  PaymentMethod,
  Currency,
  TRANSACTION_STATUS_CONFIG,
  PAYMENT_METHOD_CONFIG,
} from '@/services/admin-transactions-api';
import LoadingPanel from '@/components/LoadingPanel';

/**
 * AdminTransactionsPanel - View all platform transactions (read-only)
 * Story 14-14: Admin Transactions List (Read-Only) with Filters & Export
 */
const AdminTransactionsPanel: React.FC = () => {
  const t = useTranslations('adminTransactions');
  const locale = useLocale();

  // State
  const [transactions, setTransactions] = useState<PaginatedTransactionsResponse | null>(null);
  const [stats, setStats] = useState<TransactionStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<Currency | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Dropdown states
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isMethodOpen, setIsMethodOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  // Detail modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, paymentMethodFilter, currencyFilter, currentPage]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: TransactionFilters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
        currency: currencyFilter !== 'all' ? currencyFilter : undefined,
        userEmail: searchQuery || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minAmount: minAmount ? parseFloat(minAmount) * 100 : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) * 100 : undefined,
        page: currentPage,
        limit: pageSize,
      };

      const [transactionsRes, statsRes] = await Promise.all([
        adminTransactionsApi.listTransactions(filters),
        adminTransactionsApi.getStats({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      ]);

      if (transactionsRes.data) {
        setTransactions(transactionsRes.data);
      } else if (transactionsRes.error) {
        setError(transactionsRes.error.message);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  // Handle export
  const handleExport = () => {
    adminTransactionsApi.exportToCsv({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paymentMethod: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
      currency: currencyFilter !== 'all' ? currencyFilter : undefined,
      userEmail: searchQuery || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      minAmount: minAmount ? parseFloat(minAmount) * 100 : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) * 100 : undefined,
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setCurrencyFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };

  // View transaction details
  const handleViewDetails = async (id: string) => {
    try {
      const response = await adminTransactionsApi.getTransaction(id);
      if (response.data) {
        setSelectedTransaction(response.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      setError(t('loadError'));
    }
  };

  // Format amount
  const formatAmount = (amount: number, currency: string) => {
    return adminTransactionsApi.formatAmount(amount, currency);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return adminTransactionsApi.formatDate(dateString);
  };

  // Status options
  const statusOptions = [
    { value: 'all', label: t('allStatuses') },
    ...Object.values(TransactionStatus).map((status) => ({
      value: status,
      label: TRANSACTION_STATUS_CONFIG[status].label,
    })),
  ];

  // Payment method options
  const methodOptions = [
    { value: 'all', label: t('allMethods') },
    ...Object.values(PaymentMethod).map((method) => ({
      value: method,
      label: PAYMENT_METHOD_CONFIG[method].label,
    })),
  ];

  // Currency options
  const currencyOptions = [
    { value: 'all', label: t('allCurrencies') },
    ...Object.values(Currency).map((currency) => ({
      value: currency,
      label: currency,
    })),
  ];

  if (isLoading && !transactions) {
    return <LoadingPanel className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#171717]">{t('title')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#171717] bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            {t('exportCsv')}
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#171717] bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <Refresh className="w-4 h-4" />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">{t('totalTransactions')}</p>
            <p className="text-2xl font-bold text-[#171717]">
              {stats.totalCount.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">{t('totalVolume')}</p>
            <p className="text-2xl font-bold text-[#171717]">
              {formatAmount(stats.totalVolume, 'XOF')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">{t('payments')}</p>
            <p className="text-2xl font-bold text-[#171717]">
              {stats.byType.payments.count.toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">{t('paymentVolume')}</p>
            <p className="text-2xl font-bold text-[#171717]">
              {formatAmount(stats.byType.payments.volume, 'XOF')}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#5E53E0] focus:border-[#5E53E0]"
            />
            <span className="text-gray-500">{t('to')}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#5E53E0] focus:border-[#5E53E0]"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <span>
                {statusFilter === 'all'
                  ? t('allStatuses')
                  : TRANSACTION_STATUS_CONFIG[statusFilter].label}
              </span>
              <NavArrowDown className="w-4 h-4" />
            </button>
            {isStatusOpen && (
              <div className="absolute z-10 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value as TransactionStatus | 'all');
                      setIsStatusOpen(false);
                      setCurrentPage(1);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMethodOpen(!isMethodOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {paymentMethodFilter === 'all'
                  ? t('allMethods')
                  : PAYMENT_METHOD_CONFIG[paymentMethodFilter].label}
              </span>
              <NavArrowDown className="w-4 h-4" />
            </button>
            {isMethodOpen && (
              <div className="absolute z-10 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg">
                {methodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPaymentMethodFilter(option.value as PaymentMethod | 'all');
                      setIsMethodOpen(false);
                      setCurrentPage(1);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Currency Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              <span>
                {currencyFilter === 'all' ? t('allCurrencies') : currencyFilter}
              </span>
              <NavArrowDown className="w-4 h-4" />
            </button>
            {isCurrencyOpen && (
              <div className="absolute z-10 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {currencyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setCurrencyFilter(option.value as Currency | 'all');
                      setIsCurrencyOpen(false);
                      setCurrentPage(1);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchEmail')}
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#5E53E0] focus:border-[#5E53E0]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#5E53E0] rounded hover:bg-[#4d44c7]"
            >
              {t('search')}
            </button>
          </form>

          {/* Reset */}
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {t('reset')}
          </button>
        </div>

        {/* Amount Range */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-gray-500">{t('amountRange')}:</span>
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder={t('min')}
            className="w-28 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#5E53E0] focus:border-[#5E53E0]"
          />
          <span className="text-gray-500">-</span>
          <input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder={t('max')}
            className="w-28 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-[#5E53E0] focus:border-[#5E53E0]"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('date')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('userEmail')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('transfer')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('method')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('reference')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions?.transactions.map((tx) => {
              const statusConfig = TRANSACTION_STATUS_CONFIG[tx.transactionStatus];
              const methodConfig = PAYMENT_METHOD_CONFIG[tx.paymentMethod];

              return (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(tx.transactionDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.user?.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tx.transferId?.title || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatAmount(tx.amountPaid, tx.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {methodConfig?.label || tx.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-medium rounded"
                      style={{
                        color: statusConfig?.color || '#6B7280',
                        backgroundColor: statusConfig?.bgColor || '#F3F4F6',
                      }}
                    >
                      {statusConfig?.label || tx.transactionStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tx.paymentReference || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleViewDetails(tx.id)}
                      className="text-[#5E53E0] hover:text-[#4d44c7]"
                    >
                      <InfoCircle className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {transactions?.transactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  {t('noTransactions')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {transactions && transactions.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('showing', {
              start: (currentPage - 1) * pageSize + 1,
              end: Math.min(currentPage * pageSize, transactions.total),
              total: transactions.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t('previous')}
            </button>
            <span className="text-sm text-gray-600">
              {t('pageOf', { current: currentPage, total: transactions.totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(transactions.totalPages, p + 1))}
              disabled={currentPage === transactions.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailOpen && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#171717]">
                {t('transactionDetails')}
              </h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Xmark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('date')}</p>
                  <p className="font-medium">{formatDate(selectedTransaction.transactionDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('status')}</p>
                  <span
                    className="inline-flex px-2 py-1 text-xs font-medium rounded"
                    style={{
                      color: TRANSACTION_STATUS_CONFIG[selectedTransaction.transactionStatus]?.color,
                      backgroundColor: TRANSACTION_STATUS_CONFIG[selectedTransaction.transactionStatus]?.bgColor,
                    }}
                  >
                    {TRANSACTION_STATUS_CONFIG[selectedTransaction.transactionStatus]?.label}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t('userEmail')}</p>
                <p className="font-medium">{selectedTransaction.user?.email || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t('transfer')}</p>
                <p className="font-medium">{selectedTransaction.transferId?.title || 'N/A'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('amount')}</p>
                  <p className="font-medium text-lg">
                    {formatAmount(selectedTransaction.amountPaid, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('method')}</p>
                  <p className="font-medium">
                    {PAYMENT_METHOD_CONFIG[selectedTransaction.paymentMethod]?.label}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">{t('reference')}</p>
                <p className="font-mono text-sm">
                  {selectedTransaction.paymentReference || '-'}
                </p>
              </div>

              {selectedTransaction.paymentAccessCode && (
                <div>
                  <p className="text-sm text-gray-500">{t('accessCode')}</p>
                  <p className="font-mono text-sm">{selectedTransaction.paymentAccessCode}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[#171717] bg-gray-100 rounded hover:bg-gray-200"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactionsPanel;
