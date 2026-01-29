'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Filter,
  Eye,
  ArrowLeft,
  MessageText,
  Clock,
  Check,
  Xmark,
  WarningTriangle,
  RefreshCircle,
} from 'iconoir-react';
import {
  adminApi,
  DisputeListItem,
  DisputeDetails,
  DisputeStatus,
  DisputeListQuery,
  PaginatedResponse,
} from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';

type ViewMode = 'list' | 'details';

const statusColors: Record<DisputeStatus, string> = {
  [DisputeStatus.OPEN]: 'bg-red-100 text-red-700',
  [DisputeStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-700',
  [DisputeStatus.RESOLVED]: 'bg-green-100 text-green-700',
  [DisputeStatus.REFUND_REQUESTED]: 'bg-purple-100 text-purple-700',
  [DisputeStatus.ACCOUNT_ACTION]: 'bg-orange-100 text-orange-700',
};

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.OPEN]: 'Open',
  [DisputeStatus.UNDER_REVIEW]: 'Under Review',
  [DisputeStatus.RESOLVED]: 'Resolved',
  [DisputeStatus.REFUND_REQUESTED]: 'Refund Requested',
  [DisputeStatus.ACCOUNT_ACTION]: 'Account Action',
};

const timelineIcons: Record<string, React.ReactNode> = {
  created: <Clock className="w-4 h-4" />,
  viewed: <Eye className="w-4 h-4" />,
  paid: <Check className="w-4 h-4 text-green-600" />,
  downloaded: <Check className="w-4 h-4 text-blue-600" />,
  dispute_opened: <WarningTriangle className="w-4 h-4 text-red-600" />,
  status_changed: <RefreshCircle className="w-4 h-4" />,
};

export default function AdminDisputesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetails | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | ''>('');

  // Notes
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Status update
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<DisputeStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchDisputes = useCallback(async (query: DisputeListQuery) => {
    setIsLoading(true);
    setError('');

    const response = await adminApi.listDisputes(query);

    if (response.data) {
      const data = response.data as PaginatedResponse<DisputeListItem>;
      setDisputes(data.items);
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
    fetchDisputes({ page: 1, limit: 20 });
  }, [fetchDisputes]);

  const handleFilter = () => {
    fetchDisputes({
      status: statusFilter || undefined,
      page: 1,
      limit: 20,
    });
  };

  const handleViewDetails = async (disputeId: string) => {
    setIsLoadingDetails(true);
    const response = await adminApi.getDisputeDetails(disputeId);

    if (response.data) {
      setSelectedDispute(response.data);
      setViewMode('details');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsLoadingDetails(false);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDispute(null);
    setNewNote('');
  };

  const handleAddNote = async () => {
    if (!selectedDispute || !newNote.trim()) return;

    setIsAddingNote(true);
    const response = await adminApi.addDisputeNote(selectedDispute.id, {
      content: newNote.trim(),
    });

    if (response.data) {
      // Refresh dispute details
      const refreshResponse = await adminApi.getDisputeDetails(selectedDispute.id);
      if (refreshResponse.data) {
        setSelectedDispute(refreshResponse.data);
      }
      setNewNote('');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsAddingNote(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedDispute || !newStatus) return;

    setIsUpdatingStatus(true);
    const response = await adminApi.updateDisputeStatus(selectedDispute.id, {
      status: newStatus,
      note: statusNote || undefined,
    });

    if (response.data) {
      // Refresh dispute details
      const refreshResponse = await adminApi.getDisputeDetails(selectedDispute.id);
      if (refreshResponse.data) {
        setSelectedDispute(refreshResponse.data);
      }
      setShowStatusModal(false);
      setNewStatus('');
      setStatusNote('');
    } else if (response.error) {
      setError(response.error.message);
    }

    setIsUpdatingStatus(false);
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

  if (viewMode === 'details' && selectedDispute) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to disputes
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dispute header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Dispute #{selectedDispute.id.slice(0, 8)}
                  </h2>
                  <p className="text-gray-500 mt-1">
                    Transfer: {selectedDispute.transfer.shortCode} - {selectedDispute.transfer.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[selectedDispute.status]
                    }`}
                  >
                    {statusLabels[selectedDispute.status]}
                  </span>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-3 py-1 text-sm text-[#5E53E0] hover:bg-[#5E53E0]/10 rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>

              {selectedDispute.description && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{selectedDispute.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{formatDate(selectedDispute.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">{formatDate(selectedDispute.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Event Timeline</h3>
              <div className="space-y-4">
                {selectedDispute.timeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      {timelineIcons[event.type] || <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-900">{event.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">{formatDate(event.timestamp)}</p>
                        {event.actor && (
                          <span className="text-sm text-gray-400">by {event.actor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer info summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Transfer Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Sender</p>
                  <p className="font-medium">{selectedDispute.transfer.sender.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="font-medium">{selectedDispute.transfer.status}</p>
                </div>
                {selectedDispute.transfer.payment && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Payment Amount</p>
                      <p className="font-medium">
                        {selectedDispute.transfer.payment.amount.toLocaleString()}{' '}
                        {selectedDispute.transfer.payment.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Status</p>
                      <p className="font-medium">{selectedDispute.transfer.payment.status}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-sm text-gray-500">Recipients</p>
                  <p className="font-medium">{selectedDispute.transfer.recipients.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Files</p>
                  <p className="font-medium">{selectedDispute.transfer.files.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageText className="w-5 h-5" />
                Case Notes ({selectedDispute.notes.length})
              </h3>

              {/* Add note form */}
              <div className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                  placeholder="Add a note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0] text-sm"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAddingNote}
                  className="mt-2 w-full py-2 bg-[#5E53E0] text-white rounded-lg hover:bg-[#4d44c7] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  {isAddingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>

              {/* Notes list */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {selectedDispute.notes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
                ) : (
                  selectedDispute.notes.map((note) => (
                    <div key={note.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <p className="text-sm text-gray-900">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {note.admin.firstName} {note.admin.lastName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status update modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Dispute Status</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as DisputeStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  >
                    <option value="">Select status</option>
                    {Object.values(DisputeStatus).map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note (optional)
                  </label>
                  <textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    rows={3}
                    placeholder="Add a note about this status change..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setNewStatus('');
                    setStatusNote('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || isUpdatingStatus}
                  className="px-4 py-2 bg-[#5E53E0] text-white rounded-lg hover:bg-[#4d44c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update Status'}
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
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DisputeStatus | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
            >
              <option value="">All statuses</option>
              {Object.values(DisputeStatus).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleFilter}
              className="px-6 py-2 bg-[#5E53E0] text-white font-medium rounded-lg hover:bg-[#4d44c7] transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setStatusFilter('');
                fetchDisputes({ page: 1, limit: 20 });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <Xmark className="w-5 h-5" />
            </button>
          </div>
        </div>
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
            {pagination.total} disputes found
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Transfer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Notes</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Created</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Updated</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No disputes found
                    </td>
                  </tr>
                ) : (
                  disputes.map((dispute) => (
                    <tr key={dispute.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">
                        {dispute.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{dispute.transfer.title}</div>
                        <div className="text-sm text-gray-500">{dispute.transfer.shortCode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[dispute.status]
                          }`}
                        >
                          {statusLabels[dispute.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {dispute.notesCount} notes
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(dispute.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(dispute.updatedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(dispute.id)}
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
                    fetchDisputes({ status: statusFilter || undefined, page: pagination.page - 1, limit: 20 })
                  }
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    fetchDisputes({ status: statusFilter || undefined, page: pagination.page + 1, limit: 20 })
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
