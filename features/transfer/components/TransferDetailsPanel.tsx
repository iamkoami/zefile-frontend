"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Download,
  Eye,
  ShareAndroid,
  Trash,
  Copy,
  EditPencil,
  Check,
  Xmark,
  TriangleFlag,
  GitPullRequest,
  RefreshDouble,
} from "iconoir-react";
import { useTranslations, useLocale } from "next-intl";
import { TransferDto, transferApi } from "@/services/transfer-api";
import { useDrawerStore, TransferRole } from "@/stores/drawer-store";
import { copyTransferLink, buildDisplayUrl } from "@/utils/clipboard";
import { toast } from "@/components/shared/Toast";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import VersionUploadModal from "./VersionUploadModal";
import VersionHistorySection from "./VersionHistorySection";
import TransferInsightsSection from "./TransferInsightsSection";
import { getCurrentUserId } from "@/utils/auth";
import { storageApi } from "@/services/storage-api";
import LoadingPanel from "@/components/LoadingPanel";
import VerifiedBadge from "@/components/shared/VerifiedBadge";

interface TransferDetailsPanelProps {
  transfer: TransferDto;
  role: TransferRole;
}

/**
 * TransferDetailsPanel - Shows transfer details for sender or receiver
 * Displays different UI based on role (sender has more actions)
 */
const TransferDetailsPanel: React.FC<TransferDetailsPanelProps> = ({
  transfer,
  role,
}) => {
  const t = useTranslations("transferDetails");
  const locale = useLocale();
  const { pushView, popView } = useDrawerStore();

  // Current transfer state (for refresh capability)
  const [currentTransfer, setCurrentTransfer] = useState<TransferDto>(transfer);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(transfer?.title || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Password editing state
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(
    transfer?.hasPassword || false,
  );

  // Copy link state
  const [isCopied, setIsCopied] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Download state
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );

  // Version upload modal state
  const [showVersionUploadModal, setShowVersionUploadModal] = useState(false);

  // Preview regeneration state
  const [regeneratingFileId, setRegeneratingFileId] = useState<string | null>(null);

  // Refresh transfer data
  const refreshTransferData = useCallback(async () => {
    if (!transfer?.id) return;

    setIsRefreshing(true);
    try {
      const response = await transferApi.getTransferById(transfer.id);
      if (response.data) {
        setCurrentTransfer(response.data);
        setTitleValue(response.data.title || "");
        setHasPassword(response.data.hasPassword || false);
      }
    } catch (error) {
      console.error("Failed to refresh transfer data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [transfer?.id]);

  // Update currentTransfer when prop changes
  useEffect(() => {
    if (transfer) {
      setCurrentTransfer(transfer);
      setTitleValue(currentTransfer.title || "");
      setHasPassword(transfer.hasPassword || false);
    }
  }, [transfer]);

  // Listen for refresh-transfer-data event
  useEffect(() => {
    const handleRefresh = (event: CustomEvent<{ transferId: string }>) => {
      if (event.detail.transferId === transfer?.id) {
        refreshTransferData();
      }
    };

    window.addEventListener(
      "refresh-transfer-data",
      handleRefresh as EventListener,
    );
    return () => {
      window.removeEventListener(
        "refresh-transfer-data",
        handleRefresh as EventListener,
      );
    };
  }, [transfer?.id, refreshTransferData]);

  // Format file size - memoized to avoid recalculation
  const formatSize = useCallback(
    (bytes: number): string => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes =
        locale === "fr"
          ? ["o", "Ko", "Mo", "Go", "To"]
          : ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    },
    [locale],
  );

  // Format date based on locale - memoized
  const formatDate = useCallback(
    (dateString: string | undefined): string => {
      if (!dateString) return t("unknownDate");
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t("invalidDate");
      return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    },
    [locale, t],
  );

  // Get current version files (only files from default version)
  const currentVersionFiles = useMemo(() => {
    if (!currentTransfer?.files) return [];
    // If transfer has versions, filter to show only default version files
    // Files in default version will have version.isDefault === true
    // For backward compatibility, files without version are included
    return currentTransfer.files.filter((file) => {
      // If file has no version info, include it (backward compatibility)
      if (!file.version) return true;
      // Only include files from the default version
      return file.version.isDefault === true;
    });
  }, [currentTransfer?.files]);

  // Calculate total size and file count
  const { totalSize, fileCount } = useMemo(() => {
    const files = currentVersionFiles;
    const total = files.reduce((acc, file) => {
      const size =
        typeof file?.size === "string"
          ? parseInt(file.size, 10)
          : file?.size || 0;
      return acc + size;
    }, 0);
    return { totalSize: total, fileCount: files.length };
  }, [currentVersionFiles]);

  // Get dates
  const { createdDateStr, expiryDateStr } = useMemo(
    () => ({
      createdDateStr:
        currentTransfer?.createdAt || currentTransfer?.createdDate,
      expiryDateStr: currentTransfer?.expireAt || currentTransfer?.expiryDate,
    }),
    [
      currentTransfer?.createdAt,
      currentTransfer?.createdDate,
      currentTransfer?.expireAt,
      currentTransfer?.expiryDate,
    ],
  );

  // Check expiry status
  const expiryStatus = useMemo((): {
    isExpired: boolean;
    isUrgent: boolean;
  } => {
    if (!expiryDateStr) return { isExpired: false, isUrgent: false };
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return { isExpired: false, isUrgent: false };
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      isExpired: diffDays <= 0,
      isUrgent: diffDays > 0 && diffDays <= 3,
    };
  }, [expiryDateStr]);

  // Get display title - memoized for use in callbacks
  const displayTitle = useMemo((): string => {
    if (currentTransfer?.title) return currentTransfer.title;
    const firstFile = currentVersionFiles[0];
    if (firstFile) {
      return firstFile.filename || firstFile.fileName || t("untitled");
    }
    return t("untitled");
  }, [currentTransfer?.title, currentVersionFiles, t]);

  // Get short URL - backend stores shortCode WITHOUT prefix, buildDisplayUrl adds it
  const shortUrl = useMemo(
    () =>
      currentTransfer?.shortCode
        ? buildDisplayUrl(currentTransfer.shortCode)
        : "",
    [currentTransfer?.shortCode],
  );

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    if (!currentTransfer?.shortCode) return;
    const success = await copyTransferLink(
      currentTransfer.shortCode,
      t("linkCopied"),
      t("linkCopyFailed"),
    );
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [currentTransfer?.shortCode, t]);

  // Handle preview click - pass transfer with filtered files for current version
  const handlePreview = useCallback(() => {
    // Create a copy of transfer with only current version files for preview
    const transferForPreview = currentTransfer
      ? {
          ...currentTransfer,
          files: currentVersionFiles,
        }
      : transfer;
    pushView("transfer-preview", transferForPreview, role);
  }, [pushView, currentTransfer, currentVersionFiles, transfer, role]);

  // Handle download all files as ZIP (secure two-step flow)
  const handleDownload = useCallback(async () => {
    if (!currentTransfer?.shortCode || isDownloadingAll) return;

    setIsDownloadingAll(true);

    try {
      // Two-step secure download: POST for token, then redirect to signed URL
      const response = await storageApi.streamZipDownload(
        currentTransfer.shortCode,
      );

      if (response.error) {
        toast.error(response.error.message || t("downloadError"));
      }
      // Success - browser handles the download after redirect
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(t("downloadError"));
    } finally {
      // Brief delay before resetting (browser takes over download)
      setTimeout(() => setIsDownloadingAll(false), 1000);
    }
  }, [currentTransfer?.shortCode, isDownloadingAll, t]);

  // Handle single file download - direct download without zipping
  const handleSingleFileDownload = useCallback(
    async (fileId: string, filename: string) => {
      if (downloadingFileId || !currentTransfer?.shortCode) return;

      setDownloadingFileId(fileId);

      try {
        // Get presigned URL for single file
        const response = await storageApi.getDownloadUrl({
          shortCode: currentTransfer.shortCode,
          fileIds: [fileId],
        });

        if (response.error) {
          toast.error(response.error.message || t("downloadError"));
          return;
        }

        if (response.data?.urls && response.data.urls.length > 0) {
          const fileUrl = response.data.urls[0].url;

          // Direct download - create link and trigger click
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = filename;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.success(t("downloadComplete"));
        } else {
          toast.error(t("downloadError"));
        }
      } catch (error) {
        console.error("Single file download failed:", error);
        toast.error(t("downloadError"));
      } finally {
        setDownloadingFileId(null);
      }
    },
    [currentTransfer?.shortCode, downloadingFileId, t],
  );

  // Handle transfer - close drawer and add files to upload flow
  const handleTransfer = useCallback(() => {
    if (!currentTransfer) return;
    const { closeDrawer } = useDrawerStore.getState();
    closeDrawer();

    // Add files from this transfer to the upload flow (use current version files)
    window.dispatchEvent(
      new CustomEvent("add-transfer-files-to-upload", {
        detail: {
          transferId: currentTransfer.id,
          files: currentVersionFiles,
          title: currentTransfer.title,
        },
      }),
    );
  }, [currentTransfer, currentVersionFiles]);

  // Handle report transfer
  const handleReport = useCallback(() => {
    if (!currentTransfer?.shortCode) return;
    const reportUrl = `mailto:report@zefile.io?subject=Report Transfer: ${currentTransfer.shortCode}&body=I would like to report this transfer (${currentTransfer.shortCode}) for the following reason:`;
    window.location.href = reportUrl;
  }, [currentTransfer?.shortCode]);

  // ========== TITLE EDITING ==========
  const handleEditTitle = useCallback(() => {
    setTitleValue(displayTitle);
    setIsEditingTitle(true);
  }, [displayTitle]);

  const handleSaveTitle = useCallback(async () => {
    if (!currentTransfer?.id) return;
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("titleUpdateError"));
      return;
    }

    setIsSavingTitle(true);
    try {
      const response = await transferApi.updateTransferTitle(
        currentTransfer.id,
        {
          senderId: userId,
          title: titleValue.trim(),
        },
      );

      if (response.data?.success) {
        // Refresh transfer data to show updated title
        toast.success(t("titleUpdated"));
        setIsEditingTitle(false);
        refreshTransferData();
      } else {
        toast.error(response.data?.message || t("titleUpdateError"));
      }
    } catch {
      toast.error(t("titleUpdateError"));
    } finally {
      setIsSavingTitle(false);
    }
  }, [currentTransfer?.id, titleValue, t, refreshTransferData]);

  const handleCancelTitle = useCallback(() => {
    setIsEditingTitle(false);
    setTitleValue(currentTransfer?.title || "");
  }, [currentTransfer?.title]);

  // ========== PASSWORD EDITING ==========
  const handleSavePassword = useCallback(async () => {
    if (!currentTransfer?.id) return;
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("passwordUpdateError"));
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await transferApi.updateTransferPassword(
        currentTransfer.id,
        {
          senderId: userId,
          password: passwordValue.trim() || undefined, // Empty = remove protection
        },
      );

      if (response.data?.success) {
        const passwordWasSet = !!passwordValue.trim();
        setHasPassword(passwordWasSet);
        if (!passwordWasSet) {
          toast.success(t("passwordRemoved"));
        } else {
          toast.success(t("passwordUpdated"));
        }
        setIsEditingPassword(false);
        setPasswordValue("");
      } else {
        toast.error(response.data?.message || t("passwordUpdateError"));
      }
    } catch {
      toast.error(t("passwordUpdateError"));
    } finally {
      setIsSavingPassword(false);
    }
  }, [currentTransfer?.id, passwordValue, t]);

  const handleCancelPassword = useCallback(() => {
    setIsEditingPassword(false);
    setPasswordValue("");
  }, []);

  // ========== DELETE ==========
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!currentTransfer?.id) return;
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("deleteError"));
      setShowDeleteConfirmation(false);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await transferApi.deleteTransferSecure(
        currentTransfer.id,
        {
          senderId: userId,
        },
      );

      if (response.data?.success) {
        toast.success(t("deleteSuccess"));
        setShowDeleteConfirmation(false);
        // Navigate back to transfers list
        popView();
      } else {
        toast.error(response.data?.message || t("deleteError"));
        setShowDeleteConfirmation(false);
      }
    } catch {
      toast.error(t("deleteError"));
      setShowDeleteConfirmation(false);
    } finally {
      setIsDeleting(false);
    }
  }, [currentTransfer?.id, popView, t]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, []);

  // ========== PREVIEW REGENERATION ==========
  const handleRegeneratePreview = useCallback(async (fileId: string, fileName: string) => {
    setRegeneratingFileId(fileId);
    try {
      const response = await storageApi.regeneratePreview(fileId);
      if (response.data?.success) {
        toast.success(t("previewRegenerating", { name: fileName }));
        // Refresh transfer data after a short delay to show updated previews
        setTimeout(() => {
          refreshTransferData();
        }, 2000);
      } else {
        toast.error(response.error?.message || t("previewRegenerateError"));
      }
    } catch {
      toast.error(t("previewRegenerateError"));
    } finally {
      setRegeneratingFileId(null);
    }
  }, [t, refreshTransferData]);

  // File count text - memoized
  const fileCountText = useMemo(
    () =>
      fileCount === 1
        ? t("file", { count: fileCount })
        : t("files", { count: fileCount }),
    [fileCount, t],
  );

  // Sender info (for receiver view) - memoized
  const senderEmail = useMemo((): string => {
    if (
      typeof currentTransfer?.senderId === "object" &&
      currentTransfer.senderId?.email
    ) {
      return currentTransfer.senderId.email;
    }
    return t("unknownSender");
  }, [currentTransfer?.senderId, t]);

  // Check if sender is KYC verified - memoized
  const isSenderVerified = useMemo((): boolean => {
    if (
      typeof currentTransfer?.senderId === "object" &&
      currentTransfer.senderId?.kycStatus
    ) {
      return currentTransfer.senderId.kycStatus === "verified";
    }
    return false;
  }, [currentTransfer?.senderId]);

  // Get recipient list (for sender view) - memoized
  const recipients = useMemo(
    () => currentTransfer?.recipientEmails || [],
    [currentTransfer?.recipientEmails],
  );

  // Show loading panel if transfer data is not available or refreshing
  // IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks" error
  if (!currentTransfer || !currentTransfer.id || isRefreshing) {
    return <LoadingPanel fullHeight />;
  }

  return (
    <>
      <div className="w-full">
        {/* Title and metadata */}
        <div className="mb-8 mt-12">
          <div className="flex items-start gap-2 mb-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  className="flex-1 text-3xl font-bold text-gray-900 border-b-2 border-[#87E64B] focus:outline-none bg-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelTitle();
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle || !titleValue.trim()}
                  className="p-2 text-[#87E64B] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Save title"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelTitle}
                  disabled={isSavingTitle}
                  className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Cancel edit"
                >
                  <Xmark className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900">
                  {displayTitle}
                </h1>
                {role === "sender" && (
                  <button
                    onClick={handleEditTitle}
                    disabled={expiryStatus.isExpired}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={t("editTitle")}
                    title={
                      expiryStatus.isExpired ? t("transferExpired") : undefined
                    }
                  >
                    <EditPencil className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>
          {typeof currentTransfer.senderId === "object" &&
            currentTransfer.senderId?.email && (
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                {t("from", { email: currentTransfer.senderId.email })}
                {isSenderVerified && <VerifiedBadge size="sm" />}
              </p>
            )}
          <p className="text-sm text-gray-500">
            {fileCountText} - {formatSize(totalSize)} -{" "}
            {t("sentOn", { date: formatDate(createdDateStr) })}
          </p>
        </div>

        {/* Short link and actions row */}
        <div className="flex items-center justify-between gap-4 mb-12 border-t border-b border-gray-200 py-5">
          {/* Short link input with copy button */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center border border-[#171717] rounded overflow-hidden">
              <input
                type="text"
                value={shortUrl}
                readOnly
                className="flex-1 px-4 py-3 text-sm text-[#5E53E0] bg-white border-none focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="p-3 hover:bg-gray-50 transition-colors border-l border-gray-200"
                aria-label={t("copyLink")}
              >
                {isCopied ? (
                  <Check className="w-5 h-5 text-[#87E64B]" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Download All */}
            <button
              onClick={handleDownload}
              disabled={isDownloadingAll || expiryStatus.isExpired}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={expiryStatus.isExpired ? t("expired") : t("download")}
              title={expiryStatus.isExpired ? t("transferExpired") : undefined}
            >
              <Download className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs">
                {isDownloadingAll ? t("preparing") : t("download")}
              </span>
            </button>

            {/* Preview */}
            <button
              onClick={handlePreview}
              disabled={expiryStatus.isExpired}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={expiryStatus.isExpired ? t("expired") : t("preview")}
              title={expiryStatus.isExpired ? t("transferExpired") : undefined}
            >
              <Eye className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs">{t("preview")}</span>
            </button>

            {/* Upload New Version */}
            <button
              onClick={() => setShowVersionUploadModal(true)}
              disabled={expiryStatus.isExpired}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={
                expiryStatus.isExpired ? t("expired") : t("uploadVersion")
              }
              title={expiryStatus.isExpired ? t("transferExpired") : undefined}
            >
              <GitPullRequest className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs">{t("uploadVersion")}</span>
            </button>

            {/* Sender-only actions */}
            {role === "sender" && (
              <>
                {/* Transfer/Forward */}
                <button
                  onClick={handleTransfer}
                  disabled={expiryStatus.isExpired}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={
                    expiryStatus.isExpired ? t("expired") : t("transfer")
                  }
                  title={
                    expiryStatus.isExpired ? t("transferExpired") : undefined
                  }
                >
                  <ShareAndroid className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-xs">{t("transfer")}</span>
                </button>

                {/* Report */}
                <button
                  onClick={handleReport}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={t("report")}
                >
                  <TriangleFlag className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-xs">{t("report")}</span>
                </button>

                {/* Delete */}
                <button
                  onClick={handleDeleteClick}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-red-500 hover:text-red-600 transition-colors"
                  aria-label={t("delete")}
                >
                  <Trash className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-xs">{t("delete")}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Expiry date */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t("expiryDate")}
                </h3>
                <div
                  className={`w-3 h-3 rounded-full ${
                    expiryStatus.isExpired
                      ? "bg-red-500"
                      : expiryStatus.isUrgent
                        ? "bg-yellow-500"
                        : "bg-[#87E64B]"
                  }`}
                />
              </div>
              <p className="text-sm text-gray-600">
                {expiryDateStr ? formatDate(expiryDateStr) : t("noExpiration")}
              </p>
            </div>

            {/* Password (sender only) */}
            {role === "sender" && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t("password")}
                  </h3>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      hasPassword ? "bg-[#87E64B]" : "bg-gray-300"
                    }`}
                  />
                </div>
                {isEditingPassword ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={passwordValue}
                      onChange={(e) => setPasswordValue(e.target.value)}
                      placeholder={t("enterPassword")}
                      className="flex-1 px-3 py-2 text-sm border border-[#171717] rounded focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePassword();
                        if (e.key === "Escape") handleCancelPassword();
                      }}
                    />
                    <button
                      onClick={handleSavePassword}
                      disabled={isSavingPassword}
                      className="p-2 text-[#87E64B] hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Save password"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelPassword}
                      disabled={isSavingPassword}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Cancel"
                    >
                      <Xmark className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    disabled={expiryStatus.isExpired}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      expiryStatus.isExpired ? t("transferExpired") : undefined
                    }
                  >
                    {hasPassword ? "••••••••" : t("setPassword")}
                  </button>
                )}
              </div>
            )}

            {/* Recipient(s) for sender / Sender for receiver */}
            {role === "sender" ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {t("sentTo", { count: recipients.length })}
                </h3>
                <div className="space-y-1">
                  {recipients.map((email, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      <p>{email}</p>
                      <p className="text-xs text-gray-400">
                        {(currentTransfer.downloadCount || 0) > 0
                          ? t("downloaded")
                          : t("notYetDownloaded")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {t("receivedFrom")}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  {senderEmail}
                  {isSenderVerified && <VerifiedBadge size="sm" />}
                </p>
              </div>
            )}

            {/* Download count (sender only) */}
            {role === "sender" && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {t("downloadCount")}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentTransfer.downloadCount || 0}
                </p>
              </div>
            )}

            {/* Version history (sender only) */}
            {role === "sender" && (
              <VersionHistorySection
                transferId={currentTransfer.id}
                isOwner={true}
                onVersionChange={() => {
                  // Refresh transfer data when version changes
                  refreshTransferData();
                }}
              />
            )}

            {/* Transfer insights (sender only) */}
            {role === "sender" && (
              <TransferInsightsSection transferId={currentTransfer.id} />
            )}
          </div>

          {/* Right column - File list (shows only current version files) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {fileCountText}
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {currentVersionFiles.map((file, index) => {
                const fileName =
                  file.filename || file.fileName || `File ${index + 1}`;
                const fileSize =
                  typeof file.size === "string"
                    ? parseInt(file.size, 10)
                    : file.size || file.fileSize || 0;
                const fileSizeNum =
                  typeof fileSize === "string"
                    ? parseInt(fileSize, 10)
                    : fileSize;
                const extension =
                  fileName.split(".").pop()?.toLowerCase() || "";

                return (
                  <div
                    key={file.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatSize(fileSizeNum)} - {extension}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Regenerate preview button (sender only) */}
                      {role === "sender" && (
                        <button
                          onClick={() => handleRegeneratePreview(file.id, fileName)}
                          disabled={
                            regeneratingFileId === file.id || expiryStatus.isExpired
                          }
                          className="p-2 text-gray-400 hover:text-[#5E53E0] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={t("regeneratePreview")}
                          title={t("regeneratePreviewTooltip")}
                        >
                          <RefreshDouble className={`w-4 h-4 ${regeneratingFileId === file.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          handleSingleFileDownload(file.id, fileName)
                        }
                        disabled={
                          downloadingFileId === file.id || expiryStatus.isExpired
                        }
                        className="p-2 text-[#87E64B] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={
                          expiryStatus.isExpired
                            ? t("expired")
                            : t("downloadFile", { name: fileName })
                        }
                        title={
                          expiryStatus.isExpired
                            ? t("transferExpired")
                            : undefined
                        }
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        type="delete"
        title={t("deleteTitle")}
        message={t("deleteMessage")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("deleteCancel")}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Version upload modal */}
      <VersionUploadModal
        isOpen={showVersionUploadModal}
        transfer={currentTransfer}
        onClose={() => setShowVersionUploadModal(false)}
        onSuccess={() => {
          setShowVersionUploadModal(false);
          // Refresh transfer data to show new version
          refreshTransferData();
        }}
      />
    </>
  );
};

export default TransferDetailsPanel;
