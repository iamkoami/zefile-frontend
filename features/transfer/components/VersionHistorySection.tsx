"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check, NavArrowDown, NavArrowUp, Trash } from "iconoir-react";
import { useTranslations, useLocale } from "next-intl";
import { transferApi, TransferVersionDto } from "@/services/transfer-api";
import { getCurrentUserId } from "@/utils/auth";
import { toast } from "@/components/shared/Toast";
import ConfirmationModal from "@/components/shared/ConfirmationModal";

interface VersionHistorySectionProps {
  transferId: string;
  isOwner: boolean;
  onVersionChange?: () => void;
}

/**
 * VersionHistorySection - Displays version history for a transfer
 * Shows version list with ability to set default version (for owners)
 */
const VersionHistorySection: React.FC<VersionHistorySectionProps> = ({
  transferId,
  isOwner,
  onVersionChange,
}) => {
  const t = useTranslations("versionHistory");
  const locale = useLocale();
  const [versions, setVersions] = useState<TransferVersionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<string | null>(null);
  const [confirmDeleteVersion, setConfirmDeleteVersion] = useState<TransferVersionDto | null>(null);

  // Fetch version history
  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await transferApi.getVersionHistory(transferId);
      if (response.data) {
        setVersions(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch version history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Format relative date
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return t("justNow");
    } else if (diffHours < 24) {
      return t("hoursAgo", { hours: diffHours });
    } else if (diffDays === 1) {
      return t("yesterday");
    } else if (diffDays < 7) {
      return t("daysAgo", { days: diffDays });
    } else {
      return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  };

  // Handle setting a version as default
  const handleSetDefault = async (versionId: string) => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("authRequired"));
      return;
    }

    setSettingDefault(versionId);
    try {
      const response = await transferApi.setDefaultVersion(transferId, versionId, {
        senderId: userId,
      });

      if (response.data?.success) {
        toast.success(t("defaultSet"));
        await fetchVersions();
        onVersionChange?.();
      } else {
        toast.error(response.error?.message || t("defaultSetError"));
      }
    } catch (error) {
      toast.error(t("defaultSetError"));
    } finally {
      setSettingDefault(null);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes =
      locale === "fr"
        ? ["o", "Ko", "Mo", "Go", "To"]
        : ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Handle deleting a version
  const handleDeleteVersion = async (version: TransferVersionDto) => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("authRequired"));
      return;
    }

    setDeletingVersion(version.id);
    try {
      const response = await transferApi.deleteVersion(transferId, version.id, {
        senderId: userId,
      });

      if (response.data?.success) {
        toast.success(
          t("versionDeleted", {
            files: response.data.deletedFiles,
            size: formatSize(response.data.freedBytes),
          })
        );
        await fetchVersions();
        onVersionChange?.();
      } else {
        toast.error(response.error?.message || t("deleteError"));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("deleteError");
      toast.error(errorMessage);
    } finally {
      setDeletingVersion(null);
      setConfirmDeleteVersion(null);
    }
  };

  // Don't show if only 1 version
  if (!isLoading && versions.length <= 1) {
    return null;
  }

  return (
    <div className="mt-4">
      {/* Header with expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {t("title")}
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {versions.length}
          </span>
        </div>
        {isExpanded ? (
          <NavArrowUp className="w-4 h-4 text-gray-500" />
        ) : (
          <NavArrowDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Delete confirmation modal */}
      {confirmDeleteVersion && (
        <ConfirmationModal
          isOpen={true}
          type="delete"
          onCancel={() => setConfirmDeleteVersion(null)}
          onConfirm={() => handleDeleteVersion(confirmDeleteVersion)}
          title={t("confirmDeleteTitle")}
          message={t("confirmDeleteMessage", {
            label: confirmDeleteVersion.versionLabel,
            files: confirmDeleteVersion.fileCount,
          })}
          confirmLabel={deletingVersion ? t("deleting") : t("delete")}
          cancelLabel={t("cancel")}
          isLoading={deletingVersion === confirmDeleteVersion.id}
        />
      )}

      {/* Version list */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="text-sm text-gray-500 py-2">{t("loading")}</div>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  version.isDefault
                    ? "bg-[#87E64B]/5 border-[#87E64B]/30"
                    : "bg-gray-50 border-gray-100 hover:border-gray-200"
                }`}
              >
                {/* Version badge */}
                <div
                  className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold ${
                    version.isDefault
                      ? "bg-[#171717] text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {version.versionLabel}
                </div>

                {/* Version info */}
                <div className="flex-1 min-w-0">
                  {version.changelog ? (
                    <p className="text-sm text-gray-900 line-clamp-2">
                      {version.changelog}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      {t("noChangelog")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatRelativeDate(version.createdAt)}
                    {version.fileCount > 0 && (
                      <span className="ml-2">
                        • {t("fileCount", { count: version.fileCount })}
                      </span>
                    )}
                    <span className="ml-2">
                      • {t("downloadCount", { count: version.downloadCount || 0 })}
                    </span>
                  </p>
                </div>

                {/* Actions for owner */}
                {isOwner && (
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {/* Set as default button (non-default versions) */}
                    {!version.isDefault && (
                      <button
                        onClick={() => handleSetDefault(version.id)}
                        disabled={settingDefault === version.id}
                        className="text-xs text-[#171717] hover:text-[#171717] underline disabled:opacity-50"
                      >
                        {settingDefault === version.id ? t("setting") : t("setDefault")}
                      </button>
                    )}

                    {/* Delete button (non-default versions only, and only if more than 1 version) */}
                    {!version.isDefault && versions.length > 1 && (
                      <button
                        onClick={() => setConfirmDeleteVersion(version)}
                        disabled={deletingVersion === version.id}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-50"
                        title={t("deleteVersion")}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}

                    {/* Current indicator */}
                    {version.isDefault && (
                      <div className="flex items-center gap-1 text-xs text-[#87E64B]">
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span>{t("current")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Current indicator for non-owners */}
                {!isOwner && version.isDefault && (
                  <div className="flex-shrink-0 flex items-center gap-1 text-xs text-[#87E64B]">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>{t("current")}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default VersionHistorySection;
