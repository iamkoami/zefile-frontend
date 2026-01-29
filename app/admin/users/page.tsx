'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Xmark,
  Eye,
  ArrowLeft,
  SendDiagonal,
  Download,
  DollarCircle,
  Prohibition,
  Check,
} from 'iconoir-react';
import {
  adminApi,
  UserListItem,
  UserProfile,
  UserSearchQuery,
  PaginatedResponse,
} from '@/services/admin-api';
import { useAdminStore } from '@/stores/admin-store';
import { AdminRole } from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';

type ViewMode = 'list' | 'details';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  DELETED: 'bg-gray-100 text-gray-600',
};

const kycStatusColors: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
  NOT_SUBMITTED: 'bg-gray-100 text-gray-600',
};

const suspensionReasons = [
  { value: 'POLICY_VIOLATION', label: 'Policy violation' },
  { value: 'FRAUD_DETECTED', label: 'Fraud detected' },
  { value: 'KYC_FAILURE', label: 'KYC failure' },
  { value: 'USER_REQUEST', label: 'User request' },
  { value: 'OTHER', label: 'Other (requires note)' },
];

export default function AdminUsersPage() {
  const { hasRole } = useAdminStore();
  const canSuspend = hasRole(AdminRole.MODERATOR);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  // Search filters
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [kycStatus, setKycStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Suspension modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionNote, setSuspensionNote] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  // Unsuspend modal
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [unsuspendNote, setUnsuspendNote] = useState('');
  const [isUnsuspending, setIsUnsuspending] = useState(false);

  const fetchUsers = useCallback(async (query: UserSearchQuery) => {
    setIsLoading(true);
    setError('');

    const response = await adminApi.searchUsers(query);

    if (response.data) {
      const data = response.data as PaginatedResponse<UserListItem>;
      setUsers(data.items);
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
    fetchUsers({ page: 1, limit: 20 });
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers({
      email: email || undefined,
      phone: phone || undefined,
      status: status || undefined,
      kycStatus: kycStatus || undefined,
      page: 1,
      limit: 20,
    });
  };

  const handleClearFilters = () => {
    setEmail('');
    setPhone('');
    setStatus('');
    setKycStatus('');
    fetchUsers({ page: 1, limit: 20 });
  };

  const handleViewDetails = async (userId: string) => {
    setIsLoadingDetails(true);
    const response = await adminApi.getUserProfile(userId);

    if (response.data) {
      setSelectedUser(response.data);
      setViewMode('details');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsLoadingDetails(false);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedUser(null);
  };

  const handleSuspend = async () => {
    if (!selectedUser || !suspensionReason || !suspensionNote) return;

    setIsSuspending(true);
    const response = await adminApi.suspendUser(selectedUser.id, {
      reason: suspensionReason,
      note: suspensionNote,
    });

    if (response.data) {
      // Refresh user details
      const refreshResponse = await adminApi.getUserProfile(selectedUser.id);
      if (refreshResponse.data) {
        setSelectedUser(refreshResponse.data);
      }
      setShowSuspendModal(false);
      setSuspensionReason('');
      setSuspensionNote('');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsSuspending(false);
  };

  const handleUnsuspend = async () => {
    if (!selectedUser || !unsuspendNote) return;

    setIsUnsuspending(true);
    const response = await adminApi.unsuspendUser(selectedUser.id, {
      note: unsuspendNote,
    });

    if (response.data) {
      // Refresh user details
      const refreshResponse = await adminApi.getUserProfile(selectedUser.id);
      if (refreshResponse.data) {
        setSelectedUser(refreshResponse.data);
      }
      setShowUnsuspendModal(false);
      setUnsuspendNote('');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsUnsuspending(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (viewMode === 'details' && selectedUser) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to users
        </button>

        {/* User header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#5E53E0] rounded-full flex items-center justify-center text-white text-xl font-medium">
                {selectedUser.email[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedUser.email}</h2>
                {selectedUser.phone && (
                  <p className="text-gray-500 mt-1">{selectedUser.phone}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[selectedUser.status] || 'bg-gray-100'
                    }`}
                  >
                    {selectedUser.status}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      kycStatusColors[selectedUser.kycStatus] || 'bg-gray-100'
                    }`}
                  >
                    KYC: {selectedUser.kycStatus}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    {selectedUser.tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Suspension actions */}
            {canSuspend && (
              <div>
                {selectedUser.status === 'SUSPENDED' ? (
                  <button
                    onClick={() => setShowUnsuspendModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    Unsuspend Account
                  </button>
                ) : selectedUser.status === 'ACTIVE' ? (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Prohibition className="w-5 h-5" />
                    Suspend Account
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
            </div>
            {selectedUser.lastActiveAt && (
              <div>
                <p className="text-sm text-gray-500">Last Active</p>
                <p className="font-medium">{formatDate(selectedUser.lastActiveAt)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <SendDiagonal className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-500">Transfers Sent</span>
            </div>
            <p className="text-2xl font-bold">{selectedUser.stats.transfersSent}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Download className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-500">Transfers Received</span>
            </div>
            <p className="text-2xl font-bold">{selectedUser.stats.transfersReceived}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-500">Total Received</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(selectedUser.stats.totalReceived)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-500">Total Paid Out</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(selectedUser.stats.totalPaidOut)}</p>
          </div>
        </div>

        {/* Suspend Modal */}
        {showSuspendModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Suspend Account</h3>
              <p className="text-gray-600 mb-4">
                You are about to suspend {selectedUser.email}. This will prevent them from creating
                transfers and receiving payouts.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <select
                    value={suspensionReason}
                    onChange={(e) => setSuspensionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  >
                    <option value="">Select a reason</option>
                    {suspensionReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note *
                  </label>
                  <textarea
                    value={suspensionNote}
                    onChange={(e) => setSuspensionNote(e.target.value)}
                    rows={3}
                    placeholder="Explain the reason for suspension..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSuspensionReason('');
                    setSuspensionNote('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={!suspensionReason || !suspensionNote || isSuspending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSuspending ? 'Suspending...' : 'Suspend Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unsuspend Modal */}
        {showUnsuspendModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Unsuspend Account</h3>
              <p className="text-gray-600 mb-4">
                You are about to unsuspend {selectedUser.email}. This will restore their account
                access.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note *
                </label>
                <textarea
                  value={unsuspendNote}
                  onChange={(e) => setUnsuspendNote(e.target.value)}
                  rows={3}
                  placeholder="Explain the reason for unsuspension..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUnsuspendModal(false);
                    setUnsuspendNote('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnsuspend}
                  disabled={!unsuspendNote || isUnsuspending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUnsuspending ? 'Unsuspending...' : 'Unsuspend Account'}
                </button>
              </div>
            </div>
          </div>
        )}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by email..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING">Pending</option>
                <option value="DELETED">Deleted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KYC Status</label>
              <select
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              >
                <option value="">All KYC statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Rejected</option>
                <option value="NOT_SUBMITTED">Not Submitted</option>
              </select>
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
            {pagination.total} users found
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Tier</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">KYC</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Created</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Last Active</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[user.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.tier}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            kycStatusColors[user.kycStatus] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {user.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.lastActiveAt ? formatDate(user.lastActiveAt) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(user.id)}
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
                    fetchUsers({ email, phone, status, kycStatus, page: pagination.page - 1, limit: 20 })
                  }
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    fetchUsers({ email, phone, status, kycStatus, page: pagination.page + 1, limit: 20 })
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
