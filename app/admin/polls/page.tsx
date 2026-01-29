'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  EditPencil,
  Trash,
  Eye,
  Play,
  Pause,
  Archive,
} from 'iconoir-react';
import {
  adminApi,
  Poll,
  PollStatus,
  PollType,
  PollTriggerType,
  DisplayFrequency,
  CreatePollDto,
  PollTargetingDto,
  PollScheduleDto,
  COUNTRY_OPTIONS,
  ACTIVITY_LEVEL_OPTIONS,
  AccountAgeTarget,
  ActivityLevelTarget,
} from '@/services/admin-api';
import LoadingPanel from '@/components/LoadingPanel';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { AdminSideDrawer } from '@/components/admin';

// Status badge colors
const statusColors: Record<PollStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
};

// Trigger type labels
const triggerLabels: Record<PollTriggerType, string> = {
  manual: 'Manual',
  after_transfer: 'After Transfer',
  after_download: 'After Download',
  after_payment: 'After Payment',
  on_login: 'On Login',
  scheduled: 'Scheduled',
  after_n_days_signup: 'Days After Signup',
  after_n_transfers: 'After N Transfers',
  after_subscription_upgrade: 'After Upgrade',
};

// Subscription tier options
const TIER_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

interface PollFormData {
  question: string;
  description: string;
  type: PollType;
  options: { text: string; emoji: string }[];
  allowOther: boolean;
  showAnonymousBadge: boolean;
  showVoteCounts: boolean;
  // Trigger
  triggerType: PollTriggerType;
  triggerDelaySeconds: number;
  triggerValue: number;
  // Schedule
  startAt: string;
  endAt: string;
  displayFrequency: DisplayFrequency;
  maxResponses: number | null;
  // Targeting
  targetAllUsers: boolean;
  targetTiers: string[];
  targetCountries: string[];
  targetMinTransfers: number | null;
  targetMaxTransfers: number | null;
  targetAccountAge: AccountAgeTarget | '';
  targetActivityLevel: ActivityLevelTarget | '';
}

const defaultFormData: PollFormData = {
  question: '',
  description: '',
  type: 'single_choice',
  options: [
    { text: '', emoji: '' },
    { text: '', emoji: '' },
  ],
  allowOther: false,
  showAnonymousBadge: true,
  showVoteCounts: false,
  triggerType: 'manual',
  triggerDelaySeconds: 0,
  triggerValue: 1,
  startAt: '',
  endAt: '',
  displayFrequency: 'once',
  maxResponses: null,
  targetAllUsers: true,
  targetTiers: [],
  targetCountries: [],
  targetMinTransfers: null,
  targetMaxTransfers: null,
  targetAccountAge: '',
  targetActivityLevel: '',
};

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PollStatus | ''>('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [formData, setFormData] = useState<PollFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'trigger' | 'targeting'>('basic');

  // Fetch polls
  const fetchPolls = useCallback(async () => {
    setIsLoading(true);
    const response = await adminApi.listPolls({
      search: searchQuery || undefined,
      status: statusFilter || undefined,
      includeArchived: showArchived,
      limit: 50,
    });

    if (response.data) {
      setPolls(response.data.items);
    } else if (response.error) {
      setError(response.error.message);
    }
    setIsLoading(false);
  }, [searchQuery, statusFilter, showArchived]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Create poll
  const handleCreate = async () => {
    if (!formData.question.trim()) return;

    setIsSubmitting(true);
    const createDto: CreatePollDto = {
      question: formData.question,
      description: formData.description || undefined,
      type: formData.type,
      options: formData.options
        .filter((o) => o.text.trim())
        .map((o, i) => ({
          text: o.text,
          emoji: o.emoji || undefined,
          displayOrder: i,
        })),
      allowOther: formData.allowOther,
      showAnonymousBadge: formData.showAnonymousBadge,
      showVoteCounts: formData.showVoteCounts,
    };

    const response = await adminApi.createPoll(createDto);

    if (response.data) {
      // Apply trigger and targeting
      const pollId = response.data.id;

      // Set trigger
      await adminApi.setPollTrigger(pollId, {
        triggerType: formData.triggerType,
        triggerDelaySeconds: formData.triggerDelaySeconds,
        triggerValue: formData.triggerValue || undefined,
      });

      // Set targeting
      const targetingDto: PollTargetingDto = {
        targetAllUsers: formData.targetAllUsers,
        targetTiers: formData.targetTiers.length > 0 ? formData.targetTiers : undefined,
        targetCountries: formData.targetCountries.length > 0 ? formData.targetCountries : undefined,
        targetMinTransfers: formData.targetMinTransfers ?? undefined,
        targetMaxTransfers: formData.targetMaxTransfers ?? undefined,
        targetAccountAge: formData.targetAccountAge || undefined,
        targetActivityLevel: formData.targetActivityLevel || undefined,
      };
      await adminApi.setPollTargeting(pollId, targetingDto);

      setShowCreateModal(false);
      setFormData(defaultFormData);
      fetchPolls();
    }
    setIsSubmitting(false);
  };

  // Update poll
  const handleUpdate = async () => {
    if (!selectedPoll || !formData.question.trim()) return;

    setIsSubmitting(true);
    const response = await adminApi.updatePoll(selectedPoll.id, {
      question: formData.question,
      description: formData.description || undefined,
      type: formData.type,
      options: formData.options
        .filter((o) => o.text.trim())
        .map((o, i) => ({
          text: o.text,
          emoji: o.emoji || undefined,
          displayOrder: i,
        })),
      allowOther: formData.allowOther,
      showAnonymousBadge: formData.showAnonymousBadge,
      showVoteCounts: formData.showVoteCounts,
    });

    if (response.data) {
      // Update trigger
      await adminApi.setPollTrigger(selectedPoll.id, {
        triggerType: formData.triggerType,
        triggerDelaySeconds: formData.triggerDelaySeconds,
        triggerValue: formData.triggerValue || undefined,
      });

      // Update targeting
      const targetingDto: PollTargetingDto = {
        targetAllUsers: formData.targetAllUsers,
        targetTiers: formData.targetTiers.length > 0 ? formData.targetTiers : undefined,
        targetCountries: formData.targetCountries.length > 0 ? formData.targetCountries : undefined,
        targetMinTransfers: formData.targetMinTransfers ?? undefined,
        targetMaxTransfers: formData.targetMaxTransfers ?? undefined,
        targetAccountAge: formData.targetAccountAge || undefined,
        targetActivityLevel: formData.targetActivityLevel || undefined,
      };
      await adminApi.setPollTargeting(selectedPoll.id, targetingDto);

      setShowEditModal(false);
      setSelectedPoll(null);
      setFormData(defaultFormData);
      fetchPolls();
    }
    setIsSubmitting(false);
  };

  // Delete poll
  const handleDelete = async () => {
    if (!selectedPoll) return;

    const response = await adminApi.deletePoll(selectedPoll.id);
    if (response.data) {
      setShowDeleteModal(false);
      setSelectedPoll(null);
      fetchPolls();
    }
  };

  // Publish poll
  const handlePublish = async (poll: Poll) => {
    const schedule: PollScheduleDto = {
      startAt: formData.startAt || undefined,
      endAt: formData.endAt || undefined,
      displayFrequency: formData.displayFrequency,
      maxResponses: formData.maxResponses ?? undefined,
    };
    await adminApi.publishPoll(poll.id, schedule);
    fetchPolls();
  };

  // Quick publish (without modal)
  const handleQuickPublish = async (poll: Poll) => {
    await adminApi.publishPoll(poll.id);
    fetchPolls();
  };

  // Pause/Resume/Close/Archive
  const handleStatusChange = async (poll: Poll, action: 'pause' | 'resume' | 'close' | 'archive') => {
    switch (action) {
      case 'pause':
        await adminApi.pausePoll(poll.id);
        break;
      case 'resume':
        await adminApi.resumePoll(poll.id);
        break;
      case 'close':
        await adminApi.closePoll(poll.id);
        break;
      case 'archive':
        await adminApi.archivePoll(poll.id);
        break;
    }
    fetchPolls();
  };

  // Open edit modal
  const openEditModal = (poll: Poll) => {
    setSelectedPoll(poll);
    setFormData({
      question: poll.question,
      description: poll.description || '',
      type: poll.type,
      options: poll.options.map((o) => ({ text: o.text, emoji: o.emoji || '' })),
      allowOther: poll.allowOther,
      showAnonymousBadge: poll.showAnonymousBadge,
      showVoteCounts: poll.showVoteCounts,
      triggerType: poll.triggerType,
      triggerDelaySeconds: poll.triggerDelaySeconds,
      triggerValue: poll.triggerValue || 1,
      startAt: poll.startAt || '',
      endAt: poll.endAt || '',
      displayFrequency: poll.displayFrequency,
      maxResponses: poll.maxResponses || null,
      targetAllUsers: poll.targetAllUsers,
      targetTiers: poll.targetTiers || [],
      targetCountries: poll.targetCountries || [],
      targetMinTransfers: poll.targetMinTransfers ?? null,
      targetMaxTransfers: poll.targetMaxTransfers ?? null,
      targetAccountAge: poll.targetAccountAge || '',
      targetActivityLevel: poll.targetActivityLevel || '',
    });
    setActiveTab('basic');
    setShowEditModal(true);
  };

  // Add option
  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData((prev) => ({
        ...prev,
        options: [...prev.options, { text: '', emoji: '' }],
      }));
    }
  };

  // Remove option
  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  // Toggle country
  const toggleCountry = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      targetCountries: prev.targetCountries.includes(code)
        ? prev.targetCountries.filter((c) => c !== code)
        : [...prev.targetCountries, code],
    }));
  };

  // Toggle tier
  const toggleTier = (tier: string) => {
    setFormData((prev) => ({
      ...prev,
      targetTiers: prev.targetTiers.includes(tier)
        ? prev.targetTiers.filter((t) => t !== tier)
        : [...prev.targetTiers, tier],
    }));
  };

  if (isLoading) {
    return <LoadingPanel />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Polls</h2>
          <p className="text-gray-500 mt-1">Create and manage user feedback polls</p>
        </div>
        <button
          onClick={() => {
            setFormData(defaultFormData);
            setActiveTab('basic');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#5E53E0] text-white rounded hover:bg-[#4f46c7] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Poll
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PollStatus | '')}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show archived
        </label>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Polls Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Question</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Trigger</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Responses</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {polls.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No polls found. Create your first poll to get started.
                </td>
              </tr>
            ) : (
              polls.map((poll) => (
                <tr key={poll.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 line-clamp-1">{poll.question}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {poll.type === 'single_choice' ? 'Single choice' : 'Multiple choice'} ·{' '}
                      {poll.options.length} options
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[poll.status]}`}>
                      {poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {triggerLabels[poll.triggerType]}
                    {poll.triggerValue && poll.triggerType.includes('n_') && (
                      <span className="ml-1 text-gray-400">({poll.triggerValue})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {poll.totalResponses}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {/* View Results */}
                      <button
                        onClick={() => {
                          setSelectedPoll(poll);
                          setShowResultsModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="View Results"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit (only for draft) */}
                      {poll.status === 'draft' && (
                        <button
                          onClick={() => openEditModal(poll)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <EditPencil className="w-4 h-4" />
                        </button>
                      )}

                      {/* Publish (draft) */}
                      {poll.status === 'draft' && (
                        <button
                          onClick={() => handleQuickPublish(poll)}
                          className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                          title="Publish"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      {/* Pause (active) */}
                      {poll.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(poll, 'pause')}
                          className="p-2 text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50 rounded"
                          title="Pause"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}

                      {/* Resume (paused) */}
                      {poll.status === 'paused' && (
                        <button
                          onClick={() => handleStatusChange(poll, 'resume')}
                          className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                          title="Resume"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      {/* Archive */}
                      {(poll.status === 'closed' || poll.status === 'paused') && (
                        <button
                          onClick={() => handleStatusChange(poll, 'archive')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete (only for draft) */}
                      {poll.status === 'draft' && (
                        <button
                          onClick={() => {
                            setSelectedPoll(poll);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Drawer */}
      <AdminSideDrawer
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedPoll(null);
          setFormData(defaultFormData);
        }}
        title={showCreateModal ? 'Create Poll' : 'Edit Poll'}
        width="xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                setSelectedPoll(null);
                setFormData(defaultFormData);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={showCreateModal ? handleCreate : handleUpdate}
              disabled={isSubmitting || !formData.question.trim() || formData.options.filter((o) => o.text.trim()).length < 2}
              className="px-4 py-2 bg-[#5E53E0] text-white rounded hover:bg-[#4f46c7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : showCreateModal ? 'Create Poll' : 'Save Changes'}
            </button>
          </div>
        }
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 -mx-6 px-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-[#5E53E0] text-[#5E53E0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('trigger')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'trigger'
                ? 'border-[#5E53E0] text-[#5E53E0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Trigger & Schedule
          </button>
          <button
            onClick={() => setActiveTab('targeting')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'targeting'
                ? 'border-[#5E53E0] text-[#5E53E0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Targeting
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <>
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question *
                </label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="What would you like to ask?"
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional context for the poll"
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0] resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pollType"
                      checked={formData.type === 'single_choice'}
                      onChange={() => setFormData((prev) => ({ ...prev, type: 'single_choice' }))}
                      className="text-[#5E53E0]"
                    />
                    <span className="text-sm text-gray-700">Single Choice</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pollType"
                      checked={formData.type === 'multiple_choice'}
                      onChange={() => setFormData((prev) => ({ ...prev, type: 'multiple_choice' }))}
                      className="text-[#5E53E0]"
                    />
                    <span className="text-sm text-gray-700">Multiple Choice</span>
                  </label>
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options (2-6)
                </label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option.emoji}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = { ...newOptions[index], emoji: e.target.value };
                          setFormData((prev) => ({ ...prev, options: newOptions }));
                        }}
                        placeholder="Emoji"
                        className="w-16 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0] text-center"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = { ...newOptions[index], text: e.target.value };
                          setFormData((prev) => ({ ...prev, options: newOptions }));
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                      />
                      {formData.options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.options.length < 6 && (
                  <button
                    onClick={addOption}
                    className="mt-2 text-sm text-[#5E53E0] hover:underline"
                  >
                    + Add option
                  </button>
                )}
              </div>

              {/* Display settings */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.allowOther}
                    onChange={(e) => setFormData((prev) => ({ ...prev, allowOther: e.target.checked }))}
                    className="rounded border-gray-300 text-[#5E53E0]"
                  />
                  <span className="text-sm text-gray-700">Allow &quot;Other&quot; option with text input</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.showAnonymousBadge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, showAnonymousBadge: e.target.checked }))}
                    className="rounded border-gray-300 text-[#5E53E0]"
                  />
                  <span className="text-sm text-gray-700">Show &quot;Anonymous&quot; badge to users</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.showVoteCounts}
                    onChange={(e) => setFormData((prev) => ({ ...prev, showVoteCounts: e.target.checked }))}
                    className="rounded border-gray-300 text-[#5E53E0]"
                  />
                  <span className="text-sm text-gray-700">Show vote counts to users</span>
                </label>
              </div>
            </>
          )}

          {/* Trigger & Schedule Tab */}
          {activeTab === 'trigger' && (
            <>
              {/* Trigger Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Type
                </label>
                <select
                  value={formData.triggerType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, triggerType: e.target.value as PollTriggerType }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                >
                  {Object.entries(triggerLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trigger Value (for n-based triggers) */}
              {(formData.triggerType === 'after_n_days_signup' || formData.triggerType === 'after_n_transfers') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.triggerType === 'after_n_days_signup' ? 'Days after signup' : 'Number of transfers'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.triggerValue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, triggerValue: parseInt(e.target.value) || 1 }))}
                    className="w-32 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  />
                </div>
              )}

              {/* Trigger Delay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delay before showing (seconds)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.triggerDelaySeconds}
                  onChange={(e) => setFormData((prev) => ({ ...prev, triggerDelaySeconds: parseInt(e.target.value) || 0 }))}
                  className="w-32 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startAt: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endAt: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                  />
                </div>
              </div>

              {/* Display Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Frequency
                </label>
                <select
                  value={formData.displayFrequency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, displayFrequency: e.target.value as DisplayFrequency }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                >
                  <option value="once">Once (show only once per user)</option>
                  <option value="daily">Daily (show once per day)</option>
                  <option value="weekly">Weekly (show once per week)</option>
                  <option value="always">Always (show on every trigger)</option>
                </select>
              </div>

              {/* Max Responses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Responses (optional)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.maxResponses || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxResponses: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="No limit"
                  className="w-40 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                />
              </div>
            </>
          )}

          {/* Targeting Tab */}
          {activeTab === 'targeting' && (
            <>
              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                Configure targeting to show this poll to specific user segments. Leave fields empty to target all users.
              </div>

              {/* Countries - Always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Countries
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select countries to target. Leave empty to target all countries.
                </p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg bg-gray-50">
                  {COUNTRY_OPTIONS.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => toggleCountry(country.code)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formData.targetCountries.includes(country.code)
                          ? 'bg-[#5E53E0] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-[#5E53E0] hover:text-[#5E53E0]'
                      }`}
                    >
                      {country.code} - {country.name}
                    </button>
                  ))}
                </div>
                {formData.targetCountries.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      Selected ({formData.targetCountries.length}): {formData.targetCountries.join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, targetCountries: [] }))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Activity Level - Always visible with all options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Target users based on their activity. Leave empty to target all activity levels.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({
                        ...prev,
                        targetActivityLevel: prev.targetActivityLevel === option.value ? '' : option.value as ActivityLevelTarget
                      }))}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        formData.targetActivityLevel === option.value
                          ? 'border-[#5E53E0] bg-[#5E53E0]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`block font-medium ${
                        formData.targetActivityLevel === option.value ? 'text-[#5E53E0]' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subscription Tiers - Always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Tiers
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Target specific subscription tiers. Leave empty to target all tiers.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIER_OPTIONS.map((tier) => (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => toggleTier(tier.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.targetTiers.includes(tier.value)
                          ? 'bg-[#5E53E0] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Age - Always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Age
                </label>
                <select
                  value={formData.targetAccountAge}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetAccountAge: e.target.value as AccountAgeTarget | '' }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                >
                  <option value="">Any account age</option>
                  <option value="new">New accounts (less than 30 days)</option>
                  <option value="established">Established accounts (30+ days)</option>
                </select>
              </div>

              {/* Transfer Count Range - Always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transfer Count Range
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Target users with a specific number of completed transfers.
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={formData.targetMinTransfers ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, targetMinTransfers: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Min"
                      className="w-28 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                    />
                  </div>
                  <span className="text-gray-500">to</span>
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={formData.targetMaxTransfers ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, targetMaxTransfers: e.target.value ? parseInt(e.target.value) : null }))}
                      placeholder="Max"
                      className="w-28 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#5E53E0]"
                    />
                  </div>
                </div>
              </div>

              {/* Target All Users toggle at the bottom */}
              <div className="pt-4 border-t border-gray-200">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.targetAllUsers}
                    onChange={(e) => {
                      const targetAll = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        targetAllUsers: targetAll,
                        // Clear targeting when enabling "target all"
                        ...(targetAll ? {
                          targetTiers: [],
                          targetCountries: [],
                          targetMinTransfers: null,
                          targetMaxTransfers: null,
                          targetAccountAge: '',
                          targetActivityLevel: '',
                        } : {})
                      }));
                    }}
                    className="rounded border-gray-300 text-[#5E53E0]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Target all users (ignore filters above)</span>
                    <p className="text-xs text-gray-500">When checked, this poll will be shown to all eligible users regardless of the targeting settings above.</p>
                  </div>
                </label>
              </div>
            </>
          )}
        </div>
      </AdminSideDrawer>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPoll && (
        <ConfirmationModal
          title="Delete Poll"
          message={`Are you sure you want to delete "${selectedPoll.question}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteModal(false);
            setSelectedPoll(null);
          }}
        />
      )}
    </div>
  );
}
