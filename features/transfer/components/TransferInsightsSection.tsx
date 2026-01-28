'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Download, Globe, Smartphone, Computer, Tablet, StatsReport } from 'iconoir-react';
import {
  analyticsApi,
  TransferInsights,
  TimelineEvent,
  RecipientDownload,
} from '@/services/analytics-api';
import LoadingPanel from '@/components/LoadingPanel';

interface TransferInsightsSectionProps {
  transferId: string;
}

/**
 * TransferInsightsSection - Shows detailed analytics for a specific transfer
 * Displays timeline, recipient downloads, geography, and device breakdown
 */
const TransferInsightsSection: React.FC<TransferInsightsSectionProps> = ({
  transferId,
}) => {
  const t = useTranslations('transferInsights');
  const [insights, setInsights] = useState<TransferInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await analyticsApi.getTransferInsights(transferId);
        if (response.data) {
          setInsights(response.data);
        } else if (response.error) {
          setError(response.error);
        }
      } catch (err) {
        setError(t('loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    if (transferId) {
      fetchInsights();
    }
  }, [transferId, t]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'view':
        return <Eye className="w-4 h-4 text-gray-500" />;
      case 'download':
        return <Download className="w-4 h-4 text-green-500" />;
      case 'preview':
        return <Eye className="w-4 h-4 text-blue-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop':
        return <Computer className="w-4 h-4" />;
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Smartphone className="w-4 h-4" />;
    }
  };

  // Calculate total device accesses for percentages
  const getTotalDevices = () => {
    if (!insights) return 0;
    const { desktop, mobile, tablet, unknown } = insights.devices;
    return desktop + mobile + tablet + unknown;
  };

  const getDevicePercentage = (count: number) => {
    const total = getTotalDevices();
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <StatsReport className="w-5 h-5 text-[#5E53E0]" />
          <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <LoadingPanel className="py-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <StatsReport className="w-5 h-5 text-[#5E53E0]" />
          <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const hasActivity =
    insights.totalViews > 0 ||
    insights.totalDownloads > 0 ||
    insights.timeline.length > 0;

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <StatsReport className="w-5 h-5 text-[#5E53E0]" />
          <h3 className="text-sm font-semibold text-gray-900">{t('title')}</h3>
        </div>
        <span className="text-sm text-[#5E53E0]">
          {isExpanded ? t('collapse') : t('expand')}
        </span>
      </button>

      {/* Summary stats (always visible) */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">{t('views')}</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.totalViews}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Download className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">{t('downloads')}</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.totalDownloads}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">{t('visitors')}</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{insights.uniqueVisitors}</p>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && hasActivity && (
        <div className="space-y-6">
          {/* Device breakdown */}
          {getTotalDevices() > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('deviceBreakdown')}</h4>
              <div className="space-y-2">
                {insights.devices.desktop > 0 && (
                  <div className="flex items-center gap-2">
                    <Computer className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 w-16">{t('desktop')}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5E53E0] rounded-full"
                        style={{ width: `${getDevicePercentage(insights.devices.desktop)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {getDevicePercentage(insights.devices.desktop)}%
                    </span>
                  </div>
                )}
                {insights.devices.mobile > 0 && (
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 w-16">{t('mobile')}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#87E64B] rounded-full"
                        style={{ width: `${getDevicePercentage(insights.devices.mobile)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {getDevicePercentage(insights.devices.mobile)}%
                    </span>
                  </div>
                )}
                {insights.devices.tablet > 0 && (
                  <div className="flex items-center gap-2">
                    <Tablet className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 w-16">{t('tablet')}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${getDevicePercentage(insights.devices.tablet)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {getDevicePercentage(insights.devices.tablet)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recipient downloads */}
          {insights.recipientDownloads.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('recipientDownloads')}</h4>
              <div className="space-y-2">
                {insights.recipientDownloads.map((recipient: RecipientDownload, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{recipient.email}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(recipient.downloadedAt)}
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {recipient.downloadCount}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geography */}
          {insights.geography.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('geography')}</h4>
              <div className="flex flex-wrap gap-2">
                {insights.geography.map((geo, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <Globe className="w-3 h-3 text-gray-500" />
                    <span className="font-medium">{geo.country}</span>
                    <span className="text-gray-500">({geo.percentage}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          {insights.timeline.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('recentActivity')}</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {insights.timeline.slice(0, 10).map((event: TimelineEvent, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    {getEventIcon(event.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        {event.isAnonymous
                          ? t('anonymousUser')
                          : event.recipientEmail || t('unknownUser')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(event.type)} - {formatDate(event.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      {getDeviceIcon(event.deviceType)}
                      {event.country && (
                        <span className="text-xs">{event.country}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No activity message */}
      {isExpanded && !hasActivity && (
        <p className="text-sm text-gray-500 text-center py-4">{t('noActivity')}</p>
      )}
    </div>
  );
};

export default TransferInsightsSection;
