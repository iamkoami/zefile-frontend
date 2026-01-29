'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Xmark,
  Eye,
  ArrowLeft,
  Page,
  Download,
  User,
  Clock,
  Check,
  WarningCircle,
} from 'iconoir-react';
import {
  adminApi,
  TransferListItem,
  TransferDetails,
  TransferSearchQuery,
  PaginatedResponse,
} from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';

type ViewMode = 'list' | 'details';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
};

export default function AdminTransfersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [transfers, setTransfers] = useState<TransferListItem[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferDetails | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  // Search filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransfers = useCallback(async (query: TransferSearchQuery) => {
    setIsLoading(true);
    setError('');

    const response = await adminApi.searchTransfers(query);

    if (response.data) {
      const data = response.data as PaginatedResponse<TransferListItem>;
      setTransfers(data.items);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      });
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTransfers({ page: 1, limit: 20 });
  }, [fetchTransfers]);

  const handleSearch = () => {
    fetchTransfers({
      search: search || undefined,
      status: status || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
      limit: 20,
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    fetchTransfers({ page: 1, limit: 20 });
  };

  const handleViewDetails = async (transferId: string) => {
    setIsLoadingDetails(true);
    const response = await adminApi.getTransferDetails(transferId);

    if (response.data) {
      setSelectedTransfer(response.data);
      setViewMode('details');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsLoadingDetails(false);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedTransfer(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (viewMode === 'details' && selectedTransfer) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to transfers
        </button>

        {/* Transfer header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedTransfer.title}</h2>
              <p className="text-gray-500 mt-1">Short code: {selectedTransfer.shortCode}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusColors[selectedTransfer.status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {selectedTransfer.status}
            </span>
          </div>

          {selectedTransfer.message && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-600">{selectedTransfer.message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{formatDate(selectedTransfer.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Expires</p>
              <p className="font-medium">{formatDate(selectedTransfer.expiresAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sender Status</p>
              <p className="font-medium">{selectedTransfer.sender.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">KYC Status</p>
              <p className="font-medium">{selectedTransfer.sender.kycStatus}</p>
            </div>
          </div>
        </div>

        {/* Sender info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Sender Information
          </h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#5E53E0] rounded-full flex items-center justify-center text-white font-medium">
              {selectedTransfer.sender.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{selectedTransfer.sender.email}</p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded ${statusColors[selectedTransfer.sender.status] || 'bg-gray-100'}`}>
                  {selectedTransfer.sender.status}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                  KYC: {selectedTransfer.sender.kycStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Recipients ({selectedTransfer.recipients.length})
          </h3>
          <div className="space-y-3">
            {selectedTransfer.recipients.map((recipient, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                    {recipient.email[0].toUpperCase()}
                  </div>
                  <span className="text-gray-900">{recipient.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  {recipient.hasDownloaded ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">
                        Downloaded {recipient.downloadedAt && formatDate(recipient.downloadedAt)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">Not downloaded</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment info */}
        {selectedTransfer.payment && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium text-lg">
                  {selectedTransfer.payment.amount.toLocaleString()} {selectedTransfer.payment.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    paymentStatusColors[selectedTransfer.payment.status] || 'bg-gray-100'
                  }`}
                >
                  {selectedTransfer.payment.status}
                </span>
              </div>
              {selectedTransfer.payment.paidAt && (
                <div>
                  <p className="text-sm text-gray-500">Paid At</p>
                  <p className="font-medium">{formatDate(selectedTransfer.payment.paidAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Page className="w-5 h-5" />
            Files ({selectedTransfer.files.length})
          </h3>
          <div className="space-y-2">
            {selectedTransfer.files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Page className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{file.type}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4 flex items-center gap-2">
            <WarningCircle className="w-4 h-4" />
            File content is not accessible for privacy protection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by short code, title, sender, or recipient email..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
              showFilters ? 'border-[#5E53E0] text-[#5E53E0]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-[#5E53E0] text-white font-medium rounded-lg hover:bg-[#4d44c7] transition-colors"
          >
            Search
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <Xmark className="w-4 h-4" />
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && <LoadingPanel />}

      {/* Results */}
      {!isLoading && !error && (
        <>
          <div className="text-sm text-gray-500">
            {pagination.total} transfers found
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Short Code</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Title</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Sender</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Files</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Created</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No transfers found
                    </td>
                  </tr>
                ) : (
                  transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">
                        {transfer.shortCode}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 truncate max-w-xs">
                          {transfer.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transfer.sender.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[transfer.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {transfer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transfer.fileCount} files ({formatFileSize(transfer.totalSize)})
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(transfer.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(transfer.id)}
                          disabled={isLoadingDetails}
                          className="flex items-center gap-1 text-[#5E53E0] hover:text-[#4d44c7] font-medium text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    fetchTransfers({ ...{ search, status, dateFrom, dateTo }, page: pagination.page - 1, limit: 20 })
                  }
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    fetchTransfers({ ...{ search, status, dateFrom, dateTo }, page: pagination.page + 1, limit: 20 })
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
