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
  GitPullRequest,
  RefreshDouble,
  CreditCard,
  SendDiagonal,
} from "iconoir-react";
import ReportIssueButton from "@/components/shared/ReportIssueButton";
import { useTranslations, useLocale } from "next-intl";
import { TransferDto, transferApi } from "@/services/transfer-api";
import { useDrawerStore, TransferRole } from "@/stores/drawer-store";
import { copyTransferLink, buildDisplayUrl, copyToClipboard } from "@/utils/clipboard";
import { toast } from "@/components/shared/Toast";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import VersionUploadModal from "./VersionUploadModal";
import VersionHistorySection from "./VersionHistorySection";
import TransferInsightsSection from "./TransferInsightsSection";
import LinkAnalyticsSection from "./LinkAnalyticsSection";
import ShareButtons from "./ShareButtons";
import { getCurrentUserId, getCurrentUserEmail } from "@/utils/auth";
import { storageApi } from "@/services/storage-api";
import { platformApi } from "@/services/platform-api";
import LoadingPanel from "@/components/LoadingPanel";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import { formatCurrencyAmount } from "@/lib/currency";
import { invoicesApi, InvoiceDto, VerifyDeliveryProofResponse } from "@/services/invoices-api";
import DeliveryProofCard from "./DeliveryProofCard";

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
  const tPayment = useTranslations("payment");
  const locale = useLocale();
  const { pushView, popView, openPaymentFlow } = useDrawerStore();

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

  // Add recipient state
  const [isAddingRecipient, setIsAddingRecipient] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [isSavingRecipient, setIsSavingRecipient] = useState(false);

  // Edit recipient state
  const [editingRecipientEmail, setEditingRecipientEmail] = useState<string | null>(null);
  const [editedRecipientValue, setEditedRecipientValue] = useState("");
  const [isSavingEditedRecipient, setIsSavingEditedRecipient] = useState(false);
  const [addToContactsOnEdit, setAddToContactsOnEdit] = useState(false);

  // Delete recipient state
  const [recipientToDelete, setRecipientToDelete] = useState<string | null>(null);
  const [isDeletingRecipient, setIsDeletingRecipient] = useState(false);

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

  // Appearance state (cover + wallpaper)
  const [userTier, setUserTier] = useState<"free" | "starter" | "pro">("free");
  const [coverUrl, setCoverUrl] = useState(transfer?.coverUrl);
  const [wallpaperUrl, setWallpaperUrl] = useState(transfer?.wallpaperUrl);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [isWallpaperUploading, setIsWallpaperUploading] = useState(false);
  const [isCoverRemoving, setIsCoverRemoving] = useState(false);
  const [isWallpaperRemoving, setIsWallpaperRemoving] = useState(false);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  const wallpaperInputRef = React.useRef<HTMLInputElement>(null);

  // Delivery proof certificate state
  const [deliveryProofInvoice, setDeliveryProofInvoice] = useState<InvoiceDto | null>(null);
  const [deliveryProofSummary, setDeliveryProofSummary] = useState<VerifyDeliveryProofResponse | null>(null);
  const [isLoadingProof, setIsLoadingProof] = useState(false);

  // WhatsApp reminder state
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderCanSend, setReminderCanSend] = useState(false);
  const [reminderNextAt, setReminderNextAt] = useState<string | null>(null);
  const [hasEligibleWhatsAppContacts, setHasEligibleWhatsAppContacts] = useState(false);

  // Fetch user tier on mount (defaults to "free" = locked if fetch fails)
  useEffect(() => {
    platformApi.getUserConfig().then((res) => {
      if (res.data?.tier)
        setUserTier(res.data.tier.toLowerCase() as "free" | "starter" | "pro");
    }).catch(() => {});
  }, []);

  const isAppearanceLocked = userTier === "free";

  const handleCoverUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t("invalidFileType"));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("fileTooLarge"));
        return;
      }
      setIsCoverUploading(true);
      try {
        const uploadRes = await storageApi.uploadCover(file);
        if (uploadRes.error) {
          toast.error(uploadRes.error.message);
          return;
        }
        const patchRes = await transferApi.updateTransfer(currentTransfer.id, {
          coverKey: uploadRes.data!.coverKey,
        });
        if (patchRes.error) {
          toast.error(patchRes.error.message);
          return;
        }
        setCoverUrl(patchRes.data?.coverUrl);
        toast.success(t("coverUpdated"));
      } catch {
        toast.error(t("coverUploadFailed"));
      } finally {
        setIsCoverUploading(false);
        if (coverInputRef.current) coverInputRef.current.value = "";
      }
    },
    [currentTransfer.id, t],
  );

  const handleWallpaperUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t("invalidFileType"));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("fileTooLarge"));
        return;
      }
      setIsWallpaperUploading(true);
      try {
        const uploadRes = await storageApi.uploadWallpaper(file);
        if (uploadRes.error) {
          toast.error(uploadRes.error.message);
          return;
        }
        const patchRes = await transferApi.updateTransfer(currentTransfer.id, {
          wallpaperKey: uploadRes.data!.wallpaperKey,
        });
        if (patchRes.error) {
          toast.error(patchRes.error.message);
          return;
        }
        setWallpaperUrl(patchRes.data?.wallpaperUrl);
        toast.success(t("wallpaperUpdated"));
      } catch {
        toast.error(t("wallpaperUploadFailed"));
      } finally {
        setIsWallpaperUploading(false);
        if (wallpaperInputRef.current) wallpaperInputRef.current.value = "";
      }
    },
    [currentTransfer.id, t],
  );

  const handleRemoveCover = useCallback(async () => {
    setIsCoverRemoving(true);
    try {
      const res = await transferApi.removeCover(currentTransfer.id);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      setCoverUrl(undefined);
      toast.success(t("coverRemoved"));
    } catch {
      toast.error(t("coverRemoveFailed"));
    } finally {
      setIsCoverRemoving(false);
    }
  }, [currentTransfer.id, t]);

  const handleRemoveWallpaper = useCallback(async () => {
    setIsWallpaperRemoving(true);
    try {
      const res = await transferApi.removeWallpaper(currentTransfer.id);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      setWallpaperUrl(undefined);
      toast.success(t("wallpaperRemoved"));
    } catch {
      toast.error(t("wallpaperRemoveFailed"));
    } finally {
      setIsWallpaperRemoving(false);
    }
  }, [currentTransfer.id, t]);

  // Check if transfer requires payment
  // Use backend's paymentRequired field if available, otherwise fall back to price > 0
  const requiresPayment = useMemo(() => {
    if (currentTransfer?.paymentRequired !== undefined) {
      return currentTransfer.paymentRequired && (currentTransfer?.price ?? 0) > 0;
    }
    return (
      currentTransfer?.price !== undefined &&
      currentTransfer?.price !== null &&
      currentTransfer?.price > 0
    );
  }, [currentTransfer?.paymentRequired, currentTransfer?.price]);

  // Determine if Pay button should show (only for unpaid receivers of paid transfers)
  const showPayButton = useMemo(() => {
    // Sender never sees Pay button
    if (role === "sender") return false;
    // Free transfers show Download
    if (!requiresPayment) return false;
    // Already paid transfers show Download
    if (currentTransfer?.isPaid) return false;
    // Receiver with unpaid transfer sees Pay button
    return true;
  }, [role, requiresPayment, currentTransfer?.isPaid]);

  // Permission model for paid transfers
  // When a transfer is paid, control shifts from sender to receiver
  const actionPermissions = useMemo(() => {
    const isPaid = currentTransfer?.isPaid || false;
    const isSender = role === "sender";
    const isReceiver = role === "receiver";

    return {
      // Recipients: sender when unpaid, receiver when paid
      canAddRecipient: isPaid ? isReceiver : isSender,
      canRemoveRecipient: isPaid ? isReceiver : isSender,
      canEditRecipient: isPaid ? isReceiver : isSender,
      // Password: sender when unpaid, receiver when paid
      canEditPassword: isPaid ? isReceiver : isSender,
      // Version upload: sender only when unpaid (never for receiver, never when paid)
      canUploadVersion: !isPaid && isSender,
      // Delete/Forward: sender when unpaid, receiver when paid
      canDeleteTransfer: isPaid ? isReceiver : isSender,
      canTransferForward: isPaid ? isReceiver : isSender,
      // Title: sender only when unpaid (immutable after payment)
      canEditTitle: !isPaid && isSender,
      // Analytics and Version History: visible to both sender and receiver (when paid)
      canViewAnalytics: isSender || (isReceiver && isPaid),
      canViewVersionHistory: isSender || (isReceiver && isPaid),
      // Track paid status for API calls
      isPaid,
    };
  }, [currentTransfer?.isPaid, role]);

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

  // Fetch full transfer details on mount (includes salesStats for public sales)
  useEffect(() => {
    if (transfer?.id && transfer?.isPublicSales) {
      refreshTransferData();
    }
  }, [transfer?.id]);

  // Fetch delivery proof certificate for public sales with confirmed sales (sender only)
  useEffect(() => {
    if (role === "sender" && currentTransfer?.isPublicSales && (currentTransfer?.salesStats?.totalSales ?? 0) > 0 && currentTransfer?.id) {
      setIsLoadingProof(true);
      invoicesApi
        .getDeliveryProofForTransfer(currentTransfer.id)
        .then(async (res) => {
          const invoice = res.data?.data?.[0];
          if (invoice) {
            setDeliveryProofInvoice(invoice);
            // Fetch summary data via verify endpoint for card display
            try {
              const verifyRes = await invoicesApi.verifyDeliveryProof(invoice.invoiceNumber);
              if (verifyRes.data?.valid) {
                setDeliveryProofSummary(verifyRes.data);
              }
            } catch {
              // Summary fetch is best-effort; card still shows with invoice fallback data
            }
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingProof(false));
    }
  }, [currentTransfer?.id, currentTransfer?.isPublicSales, currentTransfer?.salesStats?.totalSales, role]);

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
      const raw = file?.fileSize ?? file?.size ?? 0;
      const size = typeof raw === "string" ? parseInt(raw, 10) : raw;
      return acc + (isNaN(size) ? 0 : size);
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

  // Determine if WhatsApp reminder button should be shown
  const showWhatsAppReminder =
    role === "sender" &&
    userTier !== "free" &&
    !currentTransfer?.isPaid &&
    currentTransfer?.status === "active" &&
    (currentTransfer?.price ?? 0) > 0 &&
    !expiryStatus.isExpired;

  // Fetch WhatsApp reminder status for eligible transfers
  useEffect(() => {
    if (!showWhatsAppReminder || !currentTransfer?.id) return;
    transferApi.getWhatsAppReminderStatus(currentTransfer.id).then((res) => {
      if (res.data) {
        setReminderCanSend(res.data.canSend);
        setReminderNextAt(res.data.nextReminderAt);
        setHasEligibleWhatsAppContacts(res.data.hasEligibleContacts);
      }
    }).catch(() => {});
  }, [showWhatsAppReminder, currentTransfer?.id]);

  const handleSendWhatsAppReminder = useCallback(async () => {
    if (!currentTransfer?.id || isSendingReminder) return;
    setIsSendingReminder(true);
    try {
      const res = await transferApi.sendWhatsAppReminder(currentTransfer.id);
      if (res.data?.success) {
        toast.success(t("reminderSent"));
        setReminderCanSend(false);
        setReminderNextAt(res.data.nextReminderAt || null);
      } else if (res.data && !res.data.success) {
        setReminderCanSend(false);
        setReminderNextAt(res.data.nextReminderAt || null);
        if (res.data.nextReminderAt) {
          const diff = new Date(res.data.nextReminderAt).getTime() - Date.now();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          toast.info(t("reminderRateLimited", { hours: String(hours), minutes: String(minutes) }));
        }
      } else if (res.error) {
        toast.error(res.error.message || t("reminderError"));
      }
    } catch {
      toast.error(t("reminderError"));
    } finally {
      setIsSendingReminder(false);
    }
  }, [currentTransfer?.id, isSendingReminder, t]);

  // Live countdown for rate-limited state — updates every 60s
  const [reminderCountdown, setReminderCountdown] = useState<string | null>(null);
  useEffect(() => {
    if (!reminderNextAt) {
      setReminderCountdown(null);
      return;
    }
    const computeCountdown = () => {
      const diff = new Date(reminderNextAt).getTime() - Date.now();
      if (diff <= 0) {
        setReminderCountdown(null);
        setReminderCanSend(true);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setReminderCountdown(t("reminderRateLimited", { hours: String(hours), minutes: String(minutes) }));
    };
    computeCountdown();
    const interval = setInterval(computeCountdown, 60_000);
    return () => clearInterval(interval);
  }, [reminderNextAt, t]);

  // Get display title - memoized for use in callbacks
  const displayTitle = useMemo((): string => {
    if (currentTransfer?.title) return currentTransfer.title;
    const firstFile = currentVersionFiles[0];
    if (firstFile) {
      return firstFile.filename || firstFile.fileName || t("untitled");
    }
    return t("untitled");
  }, [currentTransfer?.title, currentVersionFiles, t]);

  // Get short URL - prefer custom domain URL when available
  const hasCustomDomain = !!currentTransfer?.customDomainUrl;
  const shortUrl = useMemo(
    () => {
      if (!currentTransfer?.shortCode) return "";
      if (currentTransfer.customDomainUrl) {
        // Extract domain from full URL: https://files.acme.com/z-ABC -> files.acme.com/z-ABC
        return currentTransfer.customDomainUrl.replace(/^https?:\/\//, "");
      }
      return buildDisplayUrl(currentTransfer.shortCode);
    },
    [currentTransfer?.shortCode, currentTransfer?.customDomainUrl],
  );

  // Standard fallback URL (shown as secondary when custom domain is active)
  const standardUrl = useMemo(
    () =>
      currentTransfer?.shortCode
        ? buildDisplayUrl(currentTransfer.shortCode)
        : "",
    [currentTransfer?.shortCode],
  );

  // Handle copy link - copies custom domain URL when available
  const handleCopyLink = useCallback(async () => {
    if (!currentTransfer?.shortCode) return;
    let success: boolean;
    if (currentTransfer.customDomainUrl) {
      success = await copyToClipboard(currentTransfer.customDomainUrl, {
        successMessage: t("linkCopied"),
        errorMessage: t("linkCopyFailed"),
      });
    } else {
      success = await copyTransferLink(
        currentTransfer.shortCode,
        t("linkCopied"),
        t("linkCopyFailed"),
      );
    }
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [currentTransfer?.shortCode, currentTransfer?.customDomainUrl, t]);

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

  // Handle pay button click - opens payment flow
  const handlePayClick = useCallback(() => {
    if (!currentTransfer) return;
    // Get sender email for payment flow
    const senderEmail =
      typeof currentTransfer.senderId === "object"
        ? currentTransfer.senderId?.email || ""
        : "";
    openPaymentFlow(currentTransfer, senderEmail);
  }, [currentTransfer, openPaymentFlow]);

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

    // Determine auth parameter based on paid status and role
    const isPaidTransfer = actionPermissions.isPaid;
    const isReceiverAction = role === "receiver" && isPaidTransfer;

    const authParam = isReceiverAction
      ? { receiverEmail: getCurrentUserEmail() || undefined }
      : { senderId: getCurrentUserId() || undefined };

    if (!authParam.senderId && !authParam.receiverEmail) {
      toast.error(t("passwordUpdateError"));
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await transferApi.updateTransferPassword(
        currentTransfer.id,
        {
          ...authParam,
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
  }, [currentTransfer?.id, passwordValue, t, actionPermissions.isPaid, role]);

  const handleCancelPassword = useCallback(() => {
    setIsEditingPassword(false);
    setPasswordValue("");
  }, []);

  // ========== ADD RECIPIENT ==========
  const handleAddRecipient = useCallback(async () => {
    if (!currentTransfer?.id || !newRecipientEmail.trim()) return;

    // Determine auth parameter based on paid status and role
    const isPaidTransfer = actionPermissions.isPaid;
    const isReceiverAction = role === "receiver" && isPaidTransfer;

    const authParam = isReceiverAction
      ? { receiverEmail: getCurrentUserEmail() || undefined }
      : { senderId: getCurrentUserId() || undefined };

    if (!authParam.senderId && !authParam.receiverEmail) {
      toast.error(t("addRecipientError"));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = newRecipientEmail.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      toast.error(t("invalidEmail"));
      return;
    }

    // Check if email is already in recipients list
    const existingEmails = (currentTransfer?.recipientEmails || []).map((e) =>
      e.toLowerCase()
    );
    if (existingEmails.includes(trimmedEmail)) {
      toast.error(t("recipientAlreadyExists"));
      return;
    }

    setIsSavingRecipient(true);
    try {
      const response = await transferApi.addRecipientsToTransfer(
        currentTransfer.id,
        {
          ...authParam,
          emails: [newRecipientEmail.trim()],
        },
      );

      if (response.data?.success) {
        toast.success(t("recipientAdded"));
        setIsAddingRecipient(false);
        setNewRecipientEmail("");
        // Refresh transfer data to show new recipient
        refreshTransferData();
      } else {
        toast.error(response.data?.message || t("addRecipientError"));
      }
    } catch {
      toast.error(t("addRecipientError"));
    } finally {
      setIsSavingRecipient(false);
    }
  }, [currentTransfer?.id, newRecipientEmail, t, refreshTransferData, actionPermissions.isPaid, role]);

  const handleCancelAddRecipient = useCallback(() => {
    setIsAddingRecipient(false);
    setNewRecipientEmail("");
  }, []);

  // ========== EDIT RECIPIENT ==========
  const handleStartEditRecipient = useCallback((email: string) => {
    setEditingRecipientEmail(email);
    setEditedRecipientValue(email);
    setAddToContactsOnEdit(false);
  }, []);

  const handleCancelEditRecipient = useCallback(() => {
    setEditingRecipientEmail(null);
    setEditedRecipientValue("");
    setAddToContactsOnEdit(false);
  }, []);

  const handleSaveEditedRecipient = useCallback(async () => {
    if (!currentTransfer?.id || !editingRecipientEmail) return;

    const trimmedEmail = editedRecipientValue.trim().toLowerCase();
    if (!trimmedEmail) {
      toast.error(t("enterValidEmail"));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error(t("enterValidEmail"));
      return;
    }

    // If no change, just cancel
    if (trimmedEmail === editingRecipientEmail.toLowerCase()) {
      handleCancelEditRecipient();
      return;
    }

    // Determine auth parameter based on paid status and role
    const isPaidTransfer = actionPermissions.isPaid;
    const isReceiverAction = role === "receiver" && isPaidTransfer;

    const authParam = isReceiverAction
      ? { receiverEmail: getCurrentUserEmail() || undefined }
      : { senderId: getCurrentUserId() || undefined };

    if (!authParam.senderId && !authParam.receiverEmail) {
      toast.error(t("updateRecipientError"));
      return;
    }

    setIsSavingEditedRecipient(true);
    try {
      const response = await transferApi.updateRecipientInTransfer(currentTransfer.id, {
        ...authParam,
        oldEmail: editingRecipientEmail,
        newEmail: trimmedEmail,
        // Only add to contacts for sender (receivers don't have contact list)
        addToContacts: !isReceiverAction && addToContactsOnEdit,
      });

      if (response.data?.success) {
        toast.success(t("recipientUpdated"));
        handleCancelEditRecipient();
        // Refresh transfer data to get updated recipients
        refreshTransferData?.();
      } else {
        toast.error(response.data?.message || t("updateRecipientError"));
      }
    } catch {
      toast.error(t("updateRecipientError"));
    } finally {
      setIsSavingEditedRecipient(false);
    }
  }, [currentTransfer?.id, editingRecipientEmail, editedRecipientValue, addToContactsOnEdit, t, handleCancelEditRecipient, refreshTransferData, actionPermissions.isPaid, role]);

  // ========== DELETE RECIPIENT ==========
  const handleDeleteRecipientClick = useCallback((email: string) => {
    setRecipientToDelete(email);
  }, []);

  const handleCancelDeleteRecipient = useCallback(() => {
    setRecipientToDelete(null);
  }, []);

  const handleConfirmDeleteRecipient = useCallback(async () => {
    if (!currentTransfer?.id || !recipientToDelete) return;

    // Determine auth parameter based on paid status and role
    const isPaidTransfer = actionPermissions.isPaid;
    const isReceiverAction = role === "receiver" && isPaidTransfer;

    const authParam = isReceiverAction
      ? { receiverEmail: getCurrentUserEmail() || undefined }
      : { senderId: getCurrentUserId() || undefined };

    if (!authParam.senderId && !authParam.receiverEmail) {
      toast.error(t("removeRecipientError"));
      setRecipientToDelete(null);
      return;
    }

    setIsDeletingRecipient(true);
    try {
      const response = await transferApi.removeRecipientFromTransfer(currentTransfer.id, {
        ...authParam,
        email: recipientToDelete,
      });

      if (response.data?.success) {
        toast.success(t("recipientRemoved"));
        setRecipientToDelete(null);
        // Refresh transfer data to get updated recipients
        refreshTransferData?.();
      } else {
        toast.error(response.data?.message || t("removeRecipientError"));
        setRecipientToDelete(null);
      }
    } catch {
      toast.error(t("removeRecipientError"));
      setRecipientToDelete(null);
    } finally {
      setIsDeletingRecipient(false);
    }
  }, [currentTransfer?.id, recipientToDelete, t, refreshTransferData, actionPermissions.isPaid, role]);

  // ========== DELETE ==========
  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!currentTransfer?.id) return;

    // Determine auth parameter based on paid status and role
    const isPaidTransfer = actionPermissions.isPaid;
    const isReceiverAction = role === "receiver" && isPaidTransfer;

    const authParam = isReceiverAction
      ? { receiverEmail: getCurrentUserEmail() || undefined }
      : { senderId: getCurrentUserId() || undefined };

    if (!authParam.senderId && !authParam.receiverEmail) {
      toast.error(t("deleteError"));
      setShowDeleteConfirmation(false);
      return;
    }

    setIsDeleting(true);
    try {
      const response = await transferApi.deleteTransferSecure(
        currentTransfer.id,
        authParam,
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
  }, [currentTransfer?.id, popView, t, actionPermissions.isPaid, role]);

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
                  className="flex-1 text-3xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] border-b-2 border-[#87E64B] focus:outline-none bg-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelTitle();
                  }}
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle || !titleValue.trim()}
                  className="p-2 text-[#87E64B] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Save title"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelTitle}
                  disabled={isSavingTitle}
                  className="p-2 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Cancel edit"
                >
                  <Xmark className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
                  {displayTitle}
                </h1>
                {actionPermissions.canEditTitle && (
                  <button
                    onClick={handleEditTitle}
                    disabled={expiryStatus.isExpired}
                    className="p-1 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-600 dark:hover:text-[oklch(0.75_0_0)] transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)] mb-1 flex items-center gap-1">
                {t("from", { email: currentTransfer.senderId.email })}
                {isSenderVerified && <VerifiedBadge size="sm" />}
              </p>
            )}
          <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
            {fileCountText} - {formatSize(totalSize)} -{" "}
            {t("sentOn", { date: formatDate(createdDateStr) })}
          </p>
        </div>

        {/* Short link and actions row */}
        <div className="flex items-center justify-between gap-4 mb-4 border-t border-b border-gray-200 dark:border-border py-5">
          {/* Short link input with copy button */}
          <div className="flex-1 max-w-md">
            <div className="flex items-center border border-[#171717] dark:border-[oklch(0.40_0_0)] rounded overflow-hidden">
              <input
                type="text"
                value={shortUrl}
                readOnly
                className="flex-1 px-4 py-3 text-sm text-[#5E53E0] bg-white dark:bg-[oklch(0.22_0_0)] border-none focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="p-3 hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors border-l border-gray-200 dark:border-border"
                aria-label={t("copyLink")}
              >
                {isCopied ? (
                  <Check className="w-5 h-5 text-[#87E64B]" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400 dark:text-[oklch(0.50_0_0)]" />
                )}
              </button>
            </div>
            {hasCustomDomain && standardUrl && (
              <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mt-1">
                {t("alsoAvailableAt", { url: standardUrl })}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Pay or Download - based on payment status */}
            {showPayButton ? (
              <button
                onClick={handlePayClick}
                disabled={expiryStatus.isExpired}
                className="flex flex-col items-center gap-1 px-4 py-2 text-[#171717] hover:text-[#171717] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={expiryStatus.isExpired ? t("expired") : tPayment("payAndDownload")}
                title={expiryStatus.isExpired ? t("transferExpired") : undefined}
              >
                <CreditCard className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-xs">{tPayment("payAndDownload")}</span>
              </button>
            ) : (
              <button
                onClick={handleDownload}
                disabled={isDownloadingAll || expiryStatus.isExpired}
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 dark:text-[oklch(0.65_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={expiryStatus.isExpired ? t("expired") : t("download")}
                title={expiryStatus.isExpired ? t("transferExpired") : undefined}
              >
                <Download className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-xs">
                  {isDownloadingAll ? t("preparing") : t("download")}
                </span>
              </button>
            )}

            {/* Preview */}
            <button
              onClick={handlePreview}
              disabled={expiryStatus.isExpired}
              className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 dark:text-[oklch(0.65_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={expiryStatus.isExpired ? t("expired") : t("preview")}
              title={expiryStatus.isExpired ? t("transferExpired") : undefined}
            >
              <Eye className="w-6 h-6" strokeWidth={1.5} />
              <span className="text-xs">{t("preview")}</span>
            </button>

            {/* Report Issue - visible to both sender and receiver */}
            {currentTransfer?.id && currentTransfer?.shortCode && (
              <ReportIssueButton
                transferId={currentTransfer.id}
                shortCode={currentTransfer.shortCode}
                userEmail={getCurrentUserEmail() || undefined}
                role={role === "sender" ? "sender" : "recipient"}
                variant="icon"
              />
            )}

            {/* Upload New Version - sender only when unpaid */}
            {actionPermissions.canUploadVersion && (
              <button
                onClick={() => setShowVersionUploadModal(true)}
                disabled={expiryStatus.isExpired}
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 dark:text-[oklch(0.65_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={
                  expiryStatus.isExpired ? t("expired") : t("uploadVersion")
                }
                title={expiryStatus.isExpired ? t("transferExpired") : undefined}
              >
                <GitPullRequest className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-xs">{t("uploadVersion")}</span>
              </button>
            )}

            {/* WhatsApp Reminder - sender only, unpaid, Starter/Pro, not expired, has WhatsApp contacts */}
            {showWhatsAppReminder && hasEligibleWhatsAppContacts && (
              <button
                onClick={handleSendWhatsAppReminder}
                disabled={isSendingReminder || !reminderCanSend}
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 dark:text-[oklch(0.65_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={reminderCanSend ? t("whatsappReminder") : (reminderCountdown || t("reminderNotAvailable"))}
                title={!reminderCanSend && reminderCountdown ? reminderCountdown : undefined}
              >
                <SendDiagonal className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-xs">
                  {isSendingReminder ? t("sendingReminder") : t("whatsappReminder")}
                </span>
              </button>
            )}

            {/* Transfer/Forward - sender when unpaid, receiver when paid */}
            {actionPermissions.canTransferForward && (
              <button
                onClick={handleTransfer}
                disabled={expiryStatus.isExpired}
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 dark:text-[oklch(0.65_0_0)] hover:text-gray-900 dark:hover:text-[oklch(0.91_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}

            {/* Delete - sender when unpaid, receiver when paid */}
            {actionPermissions.canDeleteTransfer && (
              <button
                onClick={handleDeleteClick}
                className="flex flex-col items-center gap-1 px-4 py-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                aria-label={t("delete")}
              >
                <Trash className="w-6 h-6" strokeWidth={1.5} />
                <span className="text-xs">{t("delete")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sales stats - seller only, public sales transfers */}
        {role === "sender" && currentTransfer?.isPublicSales && (
          <div className="grid grid-cols-2 gap-4 mb-6" role="region" aria-label={t("sales")}>
            <div className="rounded border border-neutral-200 dark:border-border p-3">
              <p className="text-xs text-neutral-500 dark:text-[oklch(0.65_0_0)]" id="sales-label">{t("sales")}</p>
              <p className="text-lg font-semibold dark:text-[oklch(0.91_0_0)]" aria-labelledby="sales-label">{currentTransfer.salesStats?.totalSales ?? 0}</p>
            </div>
            <div className="rounded border border-neutral-200 dark:border-border p-3">
              <p className="text-xs text-neutral-500 dark:text-[oklch(0.65_0_0)]" id="revenue-label">{t("revenue")}</p>
              <p className="text-lg font-semibold dark:text-[oklch(0.91_0_0)]" aria-labelledby="revenue-label">
                {currentTransfer.salesStats
                  ? formatCurrencyAmount(currentTransfer.salesStats.totalRevenueMinor, currentTransfer.salesStats.currency, locale)
                  : formatCurrencyAmount(0, currentTransfer.currency || "XOF", locale)}
              </p>
            </div>
          </div>
        )}

        {/* Delivery proof certificate card - sender only, public sales with confirmed sales */}
        {role === "sender" && currentTransfer?.isPublicSales && (currentTransfer?.salesStats?.totalSales ?? 0) > 0 && (
          isLoadingProof ? (
            <div className="bg-[#FDFAF4] dark:bg-[oklch(0.22_0.01_80)] border border-[#E5E5E5] dark:border-border rounded p-4 mt-4 mb-6 animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-[oklch(0.30_0_0)] rounded w-1/3" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="h-3 bg-neutral-200 dark:bg-[oklch(0.30_0_0)] rounded w-2/3" />
                <div className="h-3 bg-neutral-200 dark:bg-[oklch(0.30_0_0)] rounded w-1/2" />
              </div>
            </div>
          ) : deliveryProofInvoice && (
            <DeliveryProofCard
              certificateNumber={deliveryProofSummary?.certificateNumber || deliveryProofInvoice.invoiceNumber}
              recipientEmail={deliveryProofSummary?.recipientEmail}
              paymentDate={deliveryProofSummary?.paymentDate || deliveryProofInvoice.generatedAt}
              paymentAmount={deliveryProofSummary?.paymentAmount ?? deliveryProofInvoice.totalMinorUnits}
              paymentCurrency={deliveryProofSummary?.paymentCurrency || deliveryProofInvoice.currency}
              fileCount={deliveryProofSummary?.fileCount}
              invoiceId={deliveryProofInvoice.id}
              verifyUrl={`${process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io"}/verify/${deliveryProofSummary?.certificateNumber || deliveryProofInvoice.invoiceNumber}`}
            />
          )
        )}

        {/* Share buttons - sender when unpaid, receiver when paid */}
        {actionPermissions.canTransferForward && currentTransfer?.shortCode && !expiryStatus.isExpired && (
          <div className="mb-8">
            <ShareButtons
              shortCode={currentTransfer.shortCode}
              title={displayTitle}
              message={currentTransfer.message}
            />
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Expiry date */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
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
              <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                {expiryDateStr ? formatDate(expiryDateStr) : t("noExpiration")}
              </p>
            </div>

            {/* Price - show when transfer has a price > 0 */}
            {requiresPayment && (currentTransfer?.price ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mb-1">
                  {t("price")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                  {formatCurrencyAmount(currentTransfer.price, currentTransfer.currency || "XOF", locale)}
                </p>
              </div>
            )}

            {/* Password - sender when unpaid, receiver when paid */}
            {actionPermissions.canEditPassword && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
                    {t("password")}
                  </h3>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      hasPassword ? "bg-[#87E64B]" : "bg-gray-300 dark:bg-[oklch(0.40_0_0)]"
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
                      className="flex-1 px-3 py-2 text-sm border border-[#171717] dark:border-[oklch(0.40_0_0)] rounded focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 bg-transparent dark:text-[oklch(0.91_0_0)]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePassword();
                        if (e.key === "Escape") handleCancelPassword();
                      }}
                    />
                    <button
                      onClick={handleSavePassword}
                      disabled={isSavingPassword}
                      className="p-2 text-[#87E64B] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Save password"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelPassword}
                      disabled={isSavingPassword}
                      className="p-2 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Cancel"
                    >
                      <Xmark className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingPassword(true)}
                    disabled={expiryStatus.isExpired}
                    className="text-sm text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-600 dark:hover:text-[oklch(0.75_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      expiryStatus.isExpired ? t("transferExpired") : undefined
                    }
                  >
                    {hasPassword ? "••••••••" : t("setPassword")}
                  </button>
                )}
              </div>
            )}

            {/* Recipient management - hidden for public sales, sender when unpaid, receiver when paid */}
            {currentTransfer?.isPublicSales ? null : actionPermissions.canAddRecipient ? (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {role === "sender" ? t("sentTo", { count: recipients.length }) : t("recipients", { count: recipients.length })}
                </h3>
                <div className="space-y-2">
                  {recipients.map((email, index) => (
                    <div key={index} className="group">
                      {editingRecipientEmail === email ? (
                        // Edit mode
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={editedRecipientValue}
                              onChange={(e) => setEditedRecipientValue(e.target.value)}
                              className="flex-1 text-sm px-3 py-1.5 border border-gray-200 dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent bg-transparent dark:text-[oklch(0.91_0_0)]"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEditedRecipient();
                                if (e.key === "Escape") handleCancelEditRecipient();
                              }}
                            />
                            <button
                              onClick={handleSaveEditedRecipient}
                              disabled={isSavingEditedRecipient || !editedRecipientValue.trim()}
                              className="p-1.5 text-[#87E64B] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded transition-colors disabled:opacity-50"
                              aria-label={t("save")}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEditRecipient}
                              disabled={isSavingEditedRecipient}
                              className="p-1.5 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded transition-colors disabled:opacity-50"
                              aria-label={t("cancel")}
                            >
                              <Xmark className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Only show "Add to contacts" for sender (receivers don't have contact list for sender) */}
                          {role === "sender" && (
                            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-[oklch(0.65_0_0)]">
                              <input
                                type="checkbox"
                                checked={addToContactsOnEdit}
                                onChange={(e) => setAddToContactsOnEdit(e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-gray-300 accent-[#87E64B] focus:ring-[#87E64B]"
                              />
                              {t("addToContacts")}
                            </label>
                          )}
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-start justify-between">
                          <div className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                            <p>{email}</p>
                            <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)]">
                              {(currentTransfer.downloadCount || 0) > 0
                                ? t("downloaded")
                                : t("notYetDownloaded")}
                            </p>
                          </div>
                          {!expiryStatus.isExpired && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {actionPermissions.canEditRecipient && (
                                <button
                                  onClick={() => handleStartEditRecipient(email)}
                                  className="p-1 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.91_0_0)] rounded transition-colors"
                                  aria-label={t("editRecipient")}
                                  title={t("editRecipient")}
                                >
                                  <EditPencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {actionPermissions.canRemoveRecipient && recipients.length > 1 && (
                                <button
                                  onClick={() => handleDeleteRecipientClick(email)}
                                  className="p-1 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                                  aria-label={t("removeRecipient")}
                                  title={t("removeRecipient")}
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add recipient section */}
                {actionPermissions.canAddRecipient && !expiryStatus.isExpired && recipients.length < 10 && (
                  <div className="mt-3">
                    {isAddingRecipient ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={newRecipientEmail}
                          onChange={(e) => setNewRecipientEmail(e.target.value)}
                          placeholder={t("enterRecipientEmail")}
                          className="flex-1 text-sm px-3 py-1.5 border border-gray-200 dark:border-border rounded focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent bg-transparent dark:text-[oklch(0.91_0_0)]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddRecipient();
                            if (e.key === "Escape") handleCancelAddRecipient();
                          }}
                        />
                        <button
                          onClick={handleAddRecipient}
                          disabled={isSavingRecipient || !newRecipientEmail.trim()}
                          className="p-1.5 text-[#87E64B] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded transition-colors disabled:opacity-50"
                          aria-label={t("addRecipient")}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelAddRecipient}
                          disabled={isSavingRecipient}
                          className="p-1.5 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded transition-colors disabled:opacity-50"
                          aria-label={t("cancel")}
                        >
                          <Xmark className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingRecipient(true)}
                        className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium hover:text-[#171717] dark:hover:text-white transition-colors"
                      >
                        + {t("addRecipient")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">
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
                <h3 className="text-sm font-bold text-gray-900 mb-1">
                  {t("downloadCount")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                  {currentTransfer.downloadCount || 0}
                </p>
              </div>
            )}

            {/* Appearance section - sender only */}
            {role === "sender" && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-[oklch(0.91_0_0)]">
                    {t("appearance")}
                  </h3>
                  {isAppearanceLocked && (
                    <span className="text-[10px] text-gray-400 dark:text-[oklch(0.50_0_0)] bg-gray-100 dark:bg-[oklch(0.28_0_0)] px-1.5 py-0.5 rounded">
                      {t("appearanceLockedLabel")}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {/* Cover */}
                  <div className={isAppearanceLocked || expiryStatus.isExpired ? "opacity-50 pointer-events-none" : ""}>
                    <p className="text-sm text-gray-700 dark:text-[oklch(0.75_0_0)]">{t("cover")}</p>
                    <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mb-1">
                      {t("coverDescription")}
                    </p>
                    {coverUrl ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded overflow-hidden">
                          <img
                            src={coverUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={handleRemoveCover}
                          disabled={isCoverRemoving || isAppearanceLocked || expiryStatus.isExpired}
                          className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                        >
                          {isCoverRemoving
                            ? t("removing")
                            : t("removeCover")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => coverInputRef.current?.click()}
                          disabled={isCoverUploading || isAppearanceLocked || expiryStatus.isExpired}
                          className="text-xs text-[#5E53E0] hover:underline disabled:opacity-50"
                        >
                          {isCoverUploading
                            ? t("uploading")
                            : t("uploadCover")}
                        </button>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleCoverUpload}
                        />
                      </>
                    )}
                  </div>

                  {/* Wallpaper */}
                  <div className={isAppearanceLocked || expiryStatus.isExpired ? "opacity-50 pointer-events-none" : ""}>
                    <p className="text-sm text-gray-700 dark:text-[oklch(0.75_0_0)]">{t("wallpaper")}</p>
                    <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mb-1">
                      {t("wallpaperDescription")}
                    </p>
                    {wallpaperUrl ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded overflow-hidden">
                          <img
                            src={wallpaperUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={handleRemoveWallpaper}
                          disabled={isWallpaperRemoving || isAppearanceLocked || expiryStatus.isExpired}
                          className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                        >
                          {isWallpaperRemoving
                            ? t("removing")
                            : t("removeWallpaper")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            wallpaperInputRef.current?.click()
                          }
                          disabled={isWallpaperUploading || isAppearanceLocked || expiryStatus.isExpired}
                          className="text-xs text-[#5E53E0] hover:underline disabled:opacity-50"
                        >
                          {isWallpaperUploading
                            ? t("uploading")
                            : t("uploadWallpaper")}
                        </button>
                        <input
                          ref={wallpaperInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleWallpaperUpload}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Version history - sender always, receiver when paid */}
            {actionPermissions.canViewVersionHistory && (
              <VersionHistorySection
                transferId={currentTransfer.id}
                isOwner={role === "sender"}
                onVersionChange={() => {
                  // Refresh transfer data when version changes
                  refreshTransferData();
                }}
              />
            )}

            {/* Link analytics - sender always, receiver when paid */}
            {actionPermissions.canViewAnalytics && (
              <LinkAnalyticsSection transferId={currentTransfer.id} />
            )}

            {/* Transfer insights - sender always, receiver when paid */}
            {actionPermissions.canViewAnalytics && (
              <TransferInsightsSection transferId={currentTransfer.id} />
            )}
          </div>

          {/* Right column - File list (shows only current version files) */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">
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
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-[oklch(0.91_0_0)] truncate">
                        {fileName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)]">
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
                          className="p-2 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-[#171717] dark:hover:text-[oklch(0.91_0_0)] hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          downloadingFileId === file.id || expiryStatus.isExpired || showPayButton
                        }
                        className="p-2 text-[#87E64B] hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={
                          expiryStatus.isExpired
                            ? t("expired")
                            : showPayButton
                              ? tPayment("paymentRequired")
                              : t("downloadFile", { name: fileName })
                        }
                        title={
                          expiryStatus.isExpired
                            ? t("transferExpired")
                            : showPayButton
                              ? tPayment("paymentRequired")
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

      {/* Remove recipient confirmation modal */}
      <ConfirmationModal
        isOpen={!!recipientToDelete}
        type="delete"
        title={t("removeRecipientTitle")}
        message={t("removeRecipientMessage", { email: recipientToDelete || "" })}
        confirmLabel={t("removeRecipientConfirm")}
        cancelLabel={t("cancel")}
        isLoading={isDeletingRecipient}
        onConfirm={handleConfirmDeleteRecipient}
        onCancel={handleCancelDeleteRecipient}
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
