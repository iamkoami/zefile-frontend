'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Check,
  Xmark,
  NavArrowDown,
  Search,
  Refresh,
  WarningTriangle,
  Clock,
  Eye,
  MessageText,
} from 'iconoir-react';
import {
  adminPayoutsApi,
  AdminRefundRequest,
  AdminPaginatedRefundsResponse,
  AdminListRefundsQuery,
  RefundStats,
} from '@/services/admin-payouts-api';
import { RefundRequestStatus, RefundReason, REFUND_STATUS_CONFIG, REFUND_REASON_CONFIG } from '@/services/refunds-api';
import LoadingPanel from '@/components/LoadingPanel';

/**
 * AdminRefundsQueue - Manage refund requests
 * Story 14-16: Admin Refunds Queue
 */
const AdminRefundsQueue: React.FC = () => {
  const t = useTranslations('adminRefunds');
  const locale = useLocale();

  // State
  const [refunds, setRefunds] = useState<AdminPaginatedRefundsResponse | null>(null);
  const [stats, setStats] = useState<RefundStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<RefundRequestStatus | 'all'>(RefundRequestStatus.PENDING);
  const [reasonFilter, setReasonFilter] = useState<RefundReason | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<AdminRefundRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Load data
  useEffect(() => {
    loadData();
  }, [statusFilter, reasonFilter, currentPage]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: AdminListRefundsQuery = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        reason: reasonFilter !== 'all' ? reasonFilter : undefined,
        search: searchQuery || undefined,
        page: currentPage,
        limit: pageSize,
      };

      const [refundsRes, statsRes] = await Promise.all([
        adminPayoutsApi.listRefunds(params),
        adminPayoutsApi.getRefundStats(),
      ]);

      if (refundsRes.data) {
        setRefunds(refundsRes.data);
      } else if (refundsRes.error) {
        setError(refundsRes.error.message);
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

  // Mark as under review
  const handleUnderReview = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminPayoutsApi.markUnderReview(id, { adminNotes });
      if (response.data) {
        setAdminNotes('');
        loadData();
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('actionError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Approve refund
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminPayoutsApi.approveRefund(id, { adminNotes });
      if (response.data) {
        setAdminNotes('');
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

  // Reject refund
  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) return;

    setProcessingId(id);
    try {
      const response = await adminPayoutsApi.rejectRefund(id, {
        reason: rejectReason,
        adminNotes,
      });
      if (response.data) {
        setShowRejectModal(null);
        setRejectReason('');
        setAdminNotes('');
        loadData();
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('rejectError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Retry failed refund
  const handleRetry = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await adminPayoutsApi.retryRefund(id);
      if (response.data) {
        loadData();
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t('retryError'));
    } finally {
      setProcessingId(null);
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
    { value: RefundRequestStatus.PENDING, label: t('statusPending') },
    { value: RefundRequestStatus.UNDER_REVIEW, label: t('statusUnderReview') },
    { value: RefundRequestStatus.APPROVED, label: t('statusApproved') },
    { value: RefundRequestStatus.PROCESSING, label: t('statusProcessing') },
    { value: RefundRequestStatus.REFUNDED, label: t('statusRefunded') },
    { value: RefundRequestStatus.REJECTED, label: t('statusRejected') },
    { value: RefundRequestStatus.FAILED, label: t('statusFailed') },
  ];

  // Reason options
  const reasonOptions = [
    { value: 'all', label: t('reasonAll') },
    ...Object.entries(REFUND_REASON_CONFIG).map(([key, config]) => ({
      value: key,
      label: config.label,
    })),
  ];

  if (isLoading && !refunds) {
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
              <span className="text-sm text-gray-600">{t('pending')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.pendingCount}</p>
            <p className="text-sm text-gray-500">
              {formatAmount(stats.pendingAmountMinorUnits, 'XOF')}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">{t('underReview')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.underReviewCount}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">{t('refundedThisMonth')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">{stats.refundedThisMonthCount}</p>
            <p className="text-sm text-gray-500">
              {formatAmount(stats.refundedThisMonthAmountMinorUnits, 'XOF')}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">{t('avgProcessingTime')}</span>
            </div>
            <p className="text-2xl font-bold text-[#171717]">
              {Math.round(stats.averageProcessingTimeHours)}h
            </p>
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
            onClick={() => {
              setIsStatusOpen(!isStatusOpen);
              setIsReasonOpen(false);
            }}
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
                    setStatusFilter(option.value as RefundRequestStatus | 'all');
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

        {/* Reason filter */}
        <div className="relative">
          <button
            onClick={() => {
              setIsReasonOpen(!isReasonOpen);
              setIsStatusOpen(false);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors min-w-[150px]"
          >
            <span className="flex-1 text-left text-sm">
              {reasonOptions.find((o) => o.value === reasonFilter)?.label}
            </span>
            <NavArrowDown
              className={`w-4 h-4 text-gray-500 transition-transform ${isReasonOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {isReasonOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-10">
              {reasonOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setReasonFilter(option.value as RefundReason | 'all');
                    setIsReasonOpen(false);
                    setCurrentPage(1);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                    reasonFilter === option.value ? 'bg-[#87E64B]/10 font-medium' : ''
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

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('reference')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('buyer')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('amount')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {t('reason')}
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
            {refunds?.refunds.map((refund) => {
              const statusConfig = REFUND_STATUS_CONFIG[refund.status];
              const reasonConfig = REFUND_REASON_CONFIG[refund.reason];
              const canReview =
                refund.status === RefundRequestStatus.PENDING ||
                refund.status === RefundRequestStatus.UNDER_REVIEW;
              const canRetry = refund.status === RefundRequestStatus.FAILED;

              return (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setShowDetailModal(refund)}
                      className="font-medium text-[#5E53E0] hover:underline"
                    >
                      {refund.reference}
                    </button>
                    {refund.transferTitle && (
                      <p className="text-xs text-gray-500">{refund.transferTitle}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{refund.email}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatAmount(refund.amountMinorUnits, refund.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{reasonConfig.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(refund.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowDetailModal(refund)}
                        className="p-1 text-gray-500 hover:text-[#171717] transition-colors"
                        title={t('viewDetails')}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {canReview && (
                        <>
                          <button
                            onClick={() => handleApprove(refund.id)}
                            disabled={processingId === refund.id}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title={t('approve')}
                          >
                            <Check className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setShowRejectModal(refund.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t('reject')}
                          >
                            <Xmark className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {canRetry && (
                        <button
                          onClick={() => handleRetry(refund.id)}
                          disabled={processingId === refund.id}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          title={t('retry')}
                        >
                          <Refresh className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {refunds?.refunds.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('noRefunds')}</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {refunds && refunds.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('previous')}
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {refunds.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(refunds.totalPages, p + 1))}
            disabled={currentPage === refunds.totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('next')}
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{t('refundDetails')}</h3>
              <button
                onClick={() => setShowDetailModal(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <Xmark className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('reference')}</p>
                  <p className="font-medium">{showDetailModal.reference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('status')}</p>
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${REFUND_STATUS_CONFIG[showDetailModal.status].bgColor} ${REFUND_STATUS_CONFIG[showDetailModal.status].color}`}
                  >
                    {REFUND_STATUS_CONFIG[showDetailModal.status].label}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('amount')}</p>
                  <p className="font-medium">
                    {formatAmount(showDetailModal.amountMinorUnits, showDetailModal.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('reason')}</p>
                  <p className="font-medium">
                    {REFUND_REASON_CONFIG[showDetailModal.reason].label}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('buyer')}</p>
                  <p className="font-medium">{showDetailModal.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('transfer')}</p>
                  <p className="font-medium">{showDetailModal.transferTitle || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">{t('description')}</p>
                <p className="bg-gray-50 p-3 rounded text-sm">{showDetailModal.description}</p>
              </div>

              {showDetailModal.screenshotUrl && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('screenshot')}</p>
                  <img
                    src={showDetailModal.screenshotUrl}
                    alt="Evidence"
                    className="max-h-64 rounded border"
                  />
                </div>
              )}

              {showDetailModal.adminNotes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('adminNotes')}</p>
                  <p className="bg-yellow-50 p-3 rounded text-sm">{showDetailModal.adminNotes}</p>
                </div>
              )}

              {showDetailModal.rejectionReason && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('rejectionReason')}</p>
                  <p className="bg-red-50 p-3 rounded text-sm text-red-700">
                    {showDetailModal.rejectionReason}
                  </p>
                </div>
              )}

              {showDetailModal.failureReason && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">{t('failureReason')}</p>
                  <p className="bg-red-50 p-3 rounded text-sm text-red-700">
                    {showDetailModal.failureReason}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowDetailModal(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">{t('rejectTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rejectionReason')} *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('rejectionReasonPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#5E53E0] resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{t('rejectionReasonHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('adminNotes')} ({t('optional')})
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t('adminNotesPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#5E53E0] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                  setAdminNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectReason.trim() || processingId === showRejectModal}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                {processingId === showRejectModal ? t('rejecting') : t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRefundsQueue;
