'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Check,
  Xmark,
  NavArrowDown,
  Search,
  Refresh,
  WarningTriangle,
  Clock,
  CheckCircle,
} from 'iconoir-react';
import {
  adminPayoutsApi,
  AdminWithdrawal,
  AdminPaginatedWithdrawalsResponse,
  AdminListWithdrawalsQuery,
  WithdrawalStats,
} from '@/services/admin-payouts-api';
import { WithdrawalStatus, WITHDRAWAL_STATUS_CONFIG } from '@/services/withdrawals-api';
import LoadingPanel from '@/components/LoadingPanel';

/**
 * AdminWithdrawalsQueue - Manage withdrawal requests
 * Story 14-15: Admin Withdrawals Queue
 */
const AdminWithdrawalsQueue: React.FC = () => {
  const t = useTranslations('adminWithdrawals');
  const locale = useLocale();

  // State
  const [withdrawals, setWithdrawals] = useState<AdminPaginatedWithdrawalsResponse | null>(null);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'all'>(WithdrawalStatus.PENDING);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, currentPage]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: AdminListWithdrawalsQuery = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        userEmail: searchQuery || undefined,
        page: currentPage,
        limit: pageSize,
      };

      const [withdrawalsRes, statsRes] = await Promise.all([
        adminPayoutsApi.listWithdrawals(params),
        adminPayoutsApi.getWithdrawalStats(),
      ]);

      if (withdrawalsRes.data) {
        setWithdrawals(withdrawalsRes.data);
      } else if (withdrawalsRes.error) {
        setError(withdrawalsRes.error.message);
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

  // Approve withdrawal
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminPayoutsApi.approveWithdrawal(id);
      if (response.data) {
        loadData();
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('approveError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Reject withdrawal
  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;

    setRejectingId(id);
    try {
      const response = await adminPayoutsApi.rejectWithdrawal(id, rejectReason);
      if (response.data) {
        setShowRejectModal(null);
        setRejectReason('');
        loadData();
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('rejectError'));
    } finally {
      setRejectingId(null);
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkApproving(true);
    try {
      const response = await adminPayoutsApi.bulkApproveWithdrawals(selectedIds);
      if (response.data) {
        setSelectedIds([]);
        loadData();
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('bulkApproveError'));
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all on page
  const toggleSelectAll = () => {
    if (!withdrawals) return;
    const pageIds = withdrawals.withdrawals
      .filter((w) => w.status === WithdrawalStatus.PENDING)
      .map((w) => w.id);

    if (selectedIds.length === pageIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pageIds);
    }
  };

  // Format amount
  const formatAmount = (minorUnits: number, currency: string): string => {
    return adminPayoutsApi.formatAmount(minorUnits, currency);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Status options
  const statusOptions = [
    { value: 'all', label: t('statusAll') },
    { value: WithdrawalStatus.PENDING, label: t('statusPending') },
    { value: WithdrawalStatus.APPROVED, label: t('statusApproved') },
    { value: WithdrawalStatus.PROCESSING, label: t('statusProcessing') },
    { value: WithdrawalStatus.COMPLETED, label: t('statusCompleted') },
    { value: WithdrawalStatus.REJECTED, label: t('statusRejected') },
    { value: WithdrawalStatus.FAILED, label: t('statusFailed') },
  ];

  if (isLoading && !withdrawals) {
    return <LoadingPanel className="py-12" />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#171717] mb-2">{t('title')}</h1>
        <p className="text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-600">{t('pendingCount')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.pendingCount}</p>
            <p className="text-sm text-gray-500">{formatAmount(stats.pendingAmount, 'XOF')}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">{t('approvedToday')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.approvedToday}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Xmark className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-600">{t('rejectedToday')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.rejectedToday}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">{t('completedThisMonth')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.completedThisMonth}</p>
            <p className="text-sm text-gray-500">{formatAmount(stats.totalPayoutThisMonth, 'XOF')}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
          <WarningTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <Xmark className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#5E53E0]"
            />
          </div>
        </form>

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[150px]"
          >
            <span className="flex-1 text-left text-sm">
              {statusOptions.find((o) => o.value === statusFilter)?.label}
            </span>
            <NavArrowDown
              className={`w-4 h-4 text-gray-500 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isStatusOpen && (
            <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatusFilter(option.value as WithdrawalStatus | 'all');
                    setIsStatusOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    statusFilter === option.value ? 'bg-[#87E64B]/10 font-medium' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-[#171717] transition-colors"
        >
          <Refresh className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-[#5E53E0]/10 rounded flex items-center justify-between">
          <span className="text-sm">
            {t('selectedCount', { count: selectedIds.length })}
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={isBulkApproving}
            className="px-4 py-1 bg-[#87E64B] text-[#171717] text-sm font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isBulkApproving ? t('approving') : t('bulkApprove')}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {statusFilter === WithdrawalStatus.PENDING && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      withdrawals?.withdrawals.filter((w) => w.status === WithdrawalStatus.PENDING)
                        .length === selectedIds.length && selectedIds.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('user')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('amount')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('destination')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('status')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('date')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {withdrawals?.withdrawals.map((withdrawal) => {
              const statusConfig = WITHDRAWAL_STATUS_CONFIG[withdrawal.status];
              const isPending = withdrawal.status === WithdrawalStatus.PENDING;

              return (
                <tr key={withdrawal.id} className="hover:bg-gray-50">
                  {statusFilter === WithdrawalStatus.PENDING && (
                    <td className="px-4 py-3">
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(withdrawal.id)}
                          onChange={() => toggleSelection(withdrawal.id)}
                          className="rounded"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#171717]">{withdrawal.userEmail}</p>
                    {withdrawal.userName && (
                      <p className="text-sm text-gray-500">{withdrawal.userName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {formatAmount(withdrawal.amountMinorUnits, withdrawal.currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('fee')}: {formatAmount(withdrawal.feeMinorUnits, withdrawal.currency)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {withdrawal.payoutMethod ? (
                      <>
                        <p className="text-sm">{withdrawal.payoutMethod.bankName || withdrawal.payoutMethod.provider}</p>
                        <p className="text-xs text-gray-500">
                          {withdrawal.payoutMethod.accountNumber || withdrawal.payoutMethod.phoneNumber}
                        </p>
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                    {withdrawal.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1">{withdrawal.rejectionReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(withdrawal.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isPending && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(withdrawal.id)}
                          disabled={processingId === withdrawal.id}
                          className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          title={t('approve')}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowRejectModal(withdrawal.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={t('reject')}
                        >
                          <Xmark className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {withdrawals?.withdrawals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('noWithdrawals')}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {withdrawals && withdrawals.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('previous')}
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {withdrawals.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(withdrawals.totalPages, p + 1))}
            disabled={currentPage === withdrawals.totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">{t('rejectTitle')}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('rejectReasonPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#5E53E0] resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim() || rejectingId === showRejectModal}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {rejectingId === showRejectModal ? t('rejecting') : t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawalsQueue;
