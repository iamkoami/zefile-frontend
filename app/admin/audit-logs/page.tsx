'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Calendar,
  Filter,
  Xmark,
  Eye,
  Globe,
  Clock,
} from 'iconoir-react';
import {
  adminApi,
  AuditLogEntry,
  AuditLogQuery,
  PaginatedResponse,
  Admin,
} from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';

const actionTypeLabels: Record<string, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  TRANSFER_SEARCHED: 'Transfer Search',
  TRANSFER_VIEWED: 'Transfer Viewed',
  USER_SEARCHED: 'User Search',
  USER_VIEWED: 'User Viewed',
  USER_SUSPENDED: 'User Suspended',
  USER_UNSUSPENDED: 'User Unsuspended',
  USER_BLOCKED: 'User Blocked',
  USER_UNBLOCKED: 'User Unblocked',
  KYC_APPROVED: 'KYC Approved',
  KYC_REJECTED: 'KYC Rejected',
  DISPUTE_VIEWED: 'Dispute Viewed',
  DISPUTE_NOTE_ADDED: 'Dispute Note Added',
  DISPUTE_STATUS_CHANGED: 'Dispute Status Changed',
  ADMIN_CREATED: 'Admin Created',
  ADMIN_ROLE_CHANGED: 'Admin Role Changed',
  ADMIN_SUSPENDED: 'Admin Suspended',
  ADMIN_REACTIVATED: 'Admin Reactivated',
  PASSWORD_CHANGED: 'Password Changed',
  SESSION_REVOKED: 'Session Revoked',
};

const actionTypeColors: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  TRANSFER_SEARCHED: 'bg-blue-100 text-blue-700',
  TRANSFER_VIEWED: 'bg-blue-100 text-blue-700',
  USER_SEARCHED: 'bg-purple-100 text-purple-700',
  USER_VIEWED: 'bg-purple-100 text-purple-700',
  USER_SUSPENDED: 'bg-red-100 text-red-700',
  USER_UNSUSPENDED: 'bg-green-100 text-green-700',
  USER_BLOCKED: 'bg-red-100 text-red-700',
  USER_UNBLOCKED: 'bg-green-100 text-green-700',
  KYC_APPROVED: 'bg-green-100 text-green-700',
  KYC_REJECTED: 'bg-red-100 text-red-700',
  DISPUTE_VIEWED: 'bg-yellow-100 text-yellow-700',
  DISPUTE_NOTE_ADDED: 'bg-yellow-100 text-yellow-700',
  DISPUTE_STATUS_CHANGED: 'bg-yellow-100 text-yellow-700',
  ADMIN_CREATED: 'bg-indigo-100 text-indigo-700',
  ADMIN_ROLE_CHANGED: 'bg-indigo-100 text-indigo-700',
  ADMIN_SUSPENDED: 'bg-red-100 text-red-700',
  ADMIN_REACTIVATED: 'bg-green-100 text-green-700',
  PASSWORD_CHANGED: 'bg-orange-100 text-orange-700',
  SESSION_REVOKED: 'bg-red-100 text-red-700',
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminId, setAdminId] = useState('');
  const [actionType, setActionType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Details modal
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const fetchLogs = useCallback(async (query: AuditLogQuery) => {
    setIsLoading(true);
    setError('');

    const response = await adminApi.getAuditLogs(query);

    if (response.data) {
      const data = response.data as PaginatedResponse<AuditLogEntry>;
      setLogs(data.items);
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

  const fetchAdmins = useCallback(async () => {
    const response = await adminApi.listAdmins();
    if (response.data) {
      setAdmins(response.data);
    }
  }, []);

  useEffect(() => {
    fetchLogs({ page: 1, limit: 50 });
    fetchAdmins();
  }, [fetchLogs, fetchAdmins]);

  const handleSearch = () => {
    fetchLogs({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      adminId: adminId || undefined,
      actionType: actionType || undefined,
      page: 1,
      limit: 50,
    });
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setAdminId('');
    setActionType('');
    fetchLogs({ page: 1, limit: 50 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionLabel = (type: string) => {
    return actionTypeLabels[type] || type.replace(/_/g, ' ');
  };

  const getActionColor = (type: string) => {
    return actionTypeColors[type] || 'bg-gray-100 text-gray-700';
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLog) {
        setSelectedLog(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedLog]);

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Audit logs are immutable and retained for 2 years. All admin actions are automatically logged.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Date range */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start date"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End date"
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              />
            </div>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
              showFilters ? 'border-[#5E53E0] text-[#5E53E0]' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-5 h-5" />
            More Filters
          </button>

          {/* Search button */}
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-[#5E53E0] text-white font-medium rounded-lg hover:bg-[#4d44c7] transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
              <select
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              >
                <option value="">All admins</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.firstName} {admin.lastName} ({admin.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
              >
                <option value="">All actions</option>
                {Object.keys(actionTypeLabels).map((type) => (
                  <option key={type} value={type}>
                    {actionTypeLabels[type]}
                  </option>
                ))}
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
            {pagination.total} log entries found
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Timestamp</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Admin</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Action</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Target</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">IP Address</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {formatDate(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#5E53E0] rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {log.admin.firstName?.[0] || ''}{log.admin.lastName?.[0] || ''}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.admin.firstName || ''} {log.admin.lastName || ''}
                            </p>
                            <p className="text-xs text-gray-500">{log.admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.actionType)}`}
                        >
                          {getActionLabel(log.actionType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.targetType && log.targetId ? (
                          <div>
                            <span className="capitalize">{log.targetType}</span>
                            <span className="text-gray-400 ml-1 font-mono text-xs">
                              {log.targetId.slice(0, 8)}...
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Globe className="w-4 h-4" />
                          {log.ipAddress}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.details ? (
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="flex items-center gap-1 text-[#5E53E0] hover:text-[#4d44c7] font-medium text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
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
                    fetchLogs({
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                      adminId: adminId || undefined,
                      actionType: actionType || undefined,
                      page: pagination.page - 1,
                      limit: 50,
                    })
                  }
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    fetchLogs({
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                      adminId: adminId || undefined,
                      actionType: actionType || undefined,
                      page: pagination.page + 1,
                      limit: 50,
                    })
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

      {/* Details modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Xmark className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Admin</p>
                  <p className="font-medium">
                    {selectedLog.admin.firstName || ''} {selectedLog.admin.lastName || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Action</p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionColor(
                      selectedLog.actionType
                    )}`}
                  >
                    {getActionLabel(selectedLog.actionType)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IP Address</p>
                  <p className="font-medium">{selectedLog.ipAddress}</p>
                </div>
                {selectedLog.targetType && (
                  <div>
                    <p className="text-sm text-gray-500">Target Type</p>
                    <p className="font-medium capitalize">{selectedLog.targetType}</p>
                  </div>
                )}
                {selectedLog.targetId && (
                  <div>
                    <p className="text-sm text-gray-500">Target ID</p>
                    <p className="font-medium font-mono text-sm">{selectedLog.targetId}</p>
                  </div>
                )}
              </div>

              {selectedLog.userAgent && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">User Agent</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded font-mono break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Details</p>
                  <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
