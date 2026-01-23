"use client";

import React, { useState, useCallback } from "react";
import {
  Download,
  Eye,
  Share2,
  Trash2,
  Copy,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { TransferDto, transferApi } from "@/services/transfer-api";
import { useDrawerStore, TransferRole } from "@/stores/drawer-store";
import { copyTransferLink, buildDisplayUrl, buildShortUrl } from "@/utils/clipboard";
import { toast } from "@/components/shared/Toast";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import ReuseTransferModal from "./ReuseTransferModal";
import { authApi } from "@/services/auth-api";

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

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(transfer.title || "");
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Password editing state
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(transfer.hasPassword || false);

  // Copy link state
  const [isCopied, setIsCopied] = useState(false);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reuse modal state
  const [showReuseModal, setShowReuseModal] = useState(false);
  const tReuse = useTranslations("reuseTransfer");

  // Get current user's senderId
  const getCurrentUserId = (): string | null => {
    const user = authApi.getStoredUser();
    return user?.id || null;
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

  // Format date based on locale
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return t("unknownDate");
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t("invalidDate");
    return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Calculate total size and file count
  const totalSize = (transfer.files || []).reduce((acc, file) => {
    const size =
      typeof file?.size === "string"
        ? parseInt(file.size, 10)
        : file?.size || 0;
    return acc + size;
  }, 0);
  const fileCount = (transfer.files || []).length;

  // Get dates
  const createdDateStr = transfer.createdAt || transfer.createdDate;
  const expiryDateStr = transfer.expireAt || transfer.expiryDate;

  // Check expiry status
  const getExpiryStatus = (): { isExpired: boolean; isUrgent: boolean } => {
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
  };

  const expiryStatus = getExpiryStatus();

  // Get display title - memoized for use in callbacks
  const displayTitle = React.useMemo((): string => {
    if (transfer.title) return transfer.title;
    const firstFile = (transfer.files || [])[0];
    if (firstFile) {
      return firstFile.filename || firstFile.fileName || t("untitled");
    }
    return t("untitled");
  }, [transfer.title, transfer.files, t]);

  // Get short URL - backend stores shortCode WITHOUT prefix, buildDisplayUrl adds it
  const shortUrl = transfer.shortCode ? buildDisplayUrl(transfer.shortCode) : "";

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    if (!transfer.shortCode) return;
    const success = await copyTransferLink(
      transfer.shortCode,
      t("linkCopied"),
      t("linkCopyFailed")
    );
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [transfer.shortCode, t]);

  // Handle preview click
  const handlePreview = useCallback(() => {
    pushView("transfer-preview", transfer, role);
  }, [pushView, transfer, role]);

  // Handle download
  const handleDownload = useCallback(() => {
    // TODO: Implement download functionality via storage API
    toast.info(t("downloadStarted"));
  }, [t]);

  // Handle transfer (forward/reuse)
  const handleTransfer = useCallback(() => {
    setShowReuseModal(true);
  }, []);

  // Handle reuse transfer submission
  const handleReuseSubmit = useCallback(
    async (data: {
      recipientEmails: string[];
      title?: string;
      message?: string;
    }) => {
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const response = await transferApi.reuseTransfer(transfer.id, {
        senderId: userId,
        recipientEmails: data.recipientEmails,
        title: data.title,
        message: data.message,
      });

      if (response.error) {
        throw new Error(response.error.message || tReuse("submitError"));
      }

      if (response.data?.success) {
        toast.success(
          tReuse("success", { count: data.recipientEmails.length })
        );
        setShowReuseModal(false);

        // Copy the new short link to clipboard
        if (response.data.transfer?.shortCode) {
          const newShortUrl = buildShortUrl(response.data.transfer.shortCode);
          navigator.clipboard.writeText(newShortUrl).then(() => {
            toast.info(tReuse("linkCopied"));
          });
        }
      } else {
        throw new Error(response.data?.message || tReuse("submitError"));
      }
    },
    [transfer.id, tReuse]
  );

  // Handle cancel reuse modal
  const handleCancelReuse = useCallback(() => {
    setShowReuseModal(false);
  }, []);

  // ========== TITLE EDITING ==========
  const handleEditTitle = useCallback(() => {
    setTitleValue(displayTitle);
    setIsEditingTitle(true);
  }, [displayTitle]);

  const handleSaveTitle = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("titleUpdateError"));
      return;
    }

    setIsSavingTitle(true);
    try {
      const response = await transferApi.updateTransferTitle(transfer.id, {
        senderId: userId,
        title: titleValue.trim(),
      });

      if (response.data?.success) {
        // Update local state - the transfer object would need to be refreshed
        // For now, just show success
        toast.success(t("titleUpdated"));
        setIsEditingTitle(false);
        // Ideally refresh transfer data from parent
      } else {
        toast.error(response.data?.message || t("titleUpdateError"));
      }
    } catch {
      toast.error(t("titleUpdateError"));
    } finally {
      setIsSavingTitle(false);
    }
  }, [transfer.id, titleValue, t]);

  const handleCancelTitle = useCallback(() => {
    setIsEditingTitle(false);
    setTitleValue(transfer.title || "");
  }, [transfer.title]);

  // ========== PASSWORD EDITING ==========
  const handleSavePassword = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("passwordUpdateError"));
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await transferApi.updateTransferPassword(transfer.id, {
        senderId: userId,
        password: passwordValue.trim() || undefined, // Empty = remove protection
      });

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
  }, [transfer.id, passwordValue, t]);

  const handleCancelPassword = useCallback(() => {
    setIsEditingPassword(false);
    setPasswordValue("");
  }, []);

  // ========== DELETE ==========
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("deleteError"));
      setShowDeleteConfirmation(false);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await transferApi.deleteTransferSecure(transfer.id, {
        senderId: userId,
      });

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
  }, [transfer.id, popView, t]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, []);

  // File count text
  const fileCountText =
    fileCount === 1
      ? t("file", { count: fileCount })
      : t("files", { count: fileCount });

  // Sender info (for receiver view)
  const getSenderEmail = (): string => {
    if (typeof transfer.senderId === "object" && transfer.senderId?.email) {
      return transfer.senderId.email;
    }
    return t("unknownSender");
  };

  // Get recipient list (for sender view)
  const recipients = transfer.recipientEmails || [];

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
                  {isSavingTitle ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleCancelTitle}
                  disabled={isSavingTitle}
                  className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Cancel edit"
                >
                  <X className="w-5 h-5" />
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
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors mt-2"
                    aria-label={t("editTitle")}
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {fileCountText} - {formatSize(totalSize)} -{" "}
            {t("sentOn", { date: formatDate(createdDateStr) })}
          </p>
        </div>

        {/* Short link and actions row */}
        <div className="flex items-center gap-4 mb-12 border-t border-b border-gray-200 py-5">
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
            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label={t("download")}
            >
              <Download className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs">{t("download")}</span>
            </button>

            {/* Preview */}
            <button
              onClick={handlePreview}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label={t("preview")}
            >
              <Eye className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs">{t("preview")}</span>
            </button>

            {/* Sender-only actions */}
            {role === "sender" && (
              <>
                {/* Transfer/Forward */}
                <button
                  onClick={handleTransfer}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label={t("transfer")}
                >
                  <Share2 className="w-6 h-6" strokeWidth={1.5} />
                  <span className="text-xs">{t("transfer")}</span>
                </button>

                {/* Delete */}
                <button
                  onClick={handleDeleteClick}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-red-500 hover:text-red-600 transition-colors"
                  aria-label={t("delete")}
                >
                  <Trash2 className="w-6 h-6" strokeWidth={1.5} />
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
                      {isSavingPassword ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelPassword}
                      disabled={isSavingPassword}
                      className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
                        {(transfer.downloadCount || 0) > 0
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
                <p className="text-sm text-gray-600">{getSenderEmail()}</p>
              </div>
            )}

            {/* Download count (sender only) */}
            {role === "sender" && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {t("downloadCount")}
                </h3>
                <p className="text-sm text-gray-600">
                  {transfer.downloadCount || 0}
                </p>
              </div>
            )}
          </div>

          {/* Right column - File list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {fileCountText}
            </h3>
            <div className="space-y-2">
              {(transfer.files || []).map((file, index) => {
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
                const extension = fileName.split(".").pop()?.toLowerCase() || "";

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
                    <button
                      onClick={() => {
                        /* TODO: Download single file */
                        toast.info(t("downloadStarted"));
                      }}
                      className="p-2 text-[#87E64B] hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label={t("downloadFile", { name: fileName })}
                    >
                      <Download className="w-5 h-5" />
                    </button>
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

      {/* Reuse transfer modal */}
      <ReuseTransferModal
        isOpen={showReuseModal}
        transfer={transfer}
        onSubmit={handleReuseSubmit}
        onCancel={handleCancelReuse}
      />
    </>
  );
};

export default TransferDetailsPanel;
