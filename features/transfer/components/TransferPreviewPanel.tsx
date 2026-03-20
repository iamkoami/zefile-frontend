"use client";

import React, {
  useCallback,
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  PageEdit,
  MediaImage,
  VideoCamera,
  MusicDoubleNote,
  Archive,
  Page,
  PlaySolid,
  Xmark,
  NavArrowLeft,
  NavArrowRight,
  Sort,
  NavArrowDown,
  CreditCard,
  RefreshDouble,
} from "iconoir-react";
import { useTranslations, useLocale } from "next-intl";
import {
  TransferDto,
  transferApi,
  TransferVersionDto,
} from "@/services/transfer-api";
import { storageApi } from "@/services/storage-api";
import { toast } from "@/components/shared/Toast";
import { useDrawerStore } from "@/stores/drawer-store";
import FilePreviewView from "./FilePreviewView";
import LoadingPanel from "@/components/LoadingPanel";
import VerifiedBadge from "@/components/shared/VerifiedBadge";
import ReportIssueButton from "@/components/shared/ReportIssueButton";
import { useCurrencyStore } from "@/stores/currency-store";
import {
  convertCurrency,
  formatCurrencyAmount,
  type CurrencyCode,
} from "@/lib/currency";

// API URL for thumbnail proxy
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type SortField = "name" | "date" | "size";
type SortDirection = "asc" | "desc";

interface TransferPreviewPanelProps {
  transfer: TransferDto;
  role?: "sender" | "receiver";
  /** Session token for password-protected transfers (from verify-password endpoint) */
  sessionToken?: string;
  /** Verified recipient email for preview analytics attribution */
  recipientEmail?: string;
}

type FilePreviewType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "archive"
  | "other";

/** Shimmer thumbnail cell — shows animated gradient sweep while image loads, fades in on success */
const ThumbnailCell = ({
  url,
  icon,
  alt,
  generating,
}: {
  url: string | null;
  icon: React.ReactNode;
  alt: string;
  /** Show shimmer even when url is null (preview is being generated) */
  generating?: boolean;
}) => {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">(
    url ? "loading" : "error",
  );

  // Reset when URL changes (e.g., auto-refresh provides thumbnail)
  useEffect(() => {
    setImgStatus(url ? "loading" : "error");
  }, [url]);

  // Shimmer when: image is loading OR preview is being generated (no url yet)
  const showShimmer = imgStatus === "loading" || (generating && !url);

  return (
    <>
      {/* Shimmer / icon placeholder — visible while loading or when no URL */}
      {imgStatus !== "loaded" && (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            showShimmer ? "animate-shimmer" : "bg-gray-200 dark:bg-[oklch(0.28_0_0)]"
          }`}
        >
          {icon}
        </div>
      )}
      {/* Actual image — hidden until loaded */}
      {url && (
        <img
          src={url}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imgStatus === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setImgStatus("loaded")}
          onError={() => setImgStatus("error")}
        />
      )}
    </>
  );
};

/**
 * TransferPreviewPanel - Shows file preview gallery for a transfer
 * Displays thumbnails for images/videos, icons for other file types
 * Supports 90vw width with full-screen preview lightbox
 */
const TransferPreviewPanel: React.FC<TransferPreviewPanelProps> = ({
  transfer: transferProp,
  role,
  sessionToken,
  recipientEmail,
}) => {
  const t = useTranslations("transferPreview");
  const locale = useLocale();
  const { setOnBeforeBack, openPaymentFlow } = useDrawerStore();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(
    null,
  );
  // Store fetched preview data for files that don't have pre-generated ones
  // Includes URL and watermark status for security
  const [fetchedPreviews, setFetchedPreviews] = useState<
    Record<string, { url: string; isWatermarked: boolean }>
  >({});

  // Live transfer state — starts with prop, auto-refreshes when previews aren't ready
  const [liveTransfer, setLiveTransfer] = useState<TransferDto>(transferProp);
  const refreshAttempts = useRef(0);
  // Track which file IDs have been fetched for previews (prevents infinite loop)
  const fetchedFileIdsRef = useRef<Set<string>>(new Set());

  // Sync with prop changes
  useEffect(() => {
    setLiveTransfer(transferProp);
    refreshAttempts.current = 0;
    fetchedFileIdsRef.current.clear();
  }, [transferProp]);

  // Use liveTransfer for all rendering (falls back to prop)
  const transfer = liveTransfer || transferProp;

  // Version selection state
  const [versions, setVersions] = useState<TransferVersionDto[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const paymentT = useTranslations("payment");
  const versionT = useTranslations("versionHistory");
  const { pricing } = useCurrencyStore();
  const displayCurrency = pricing.currency as CurrencyCode;

  // Check if transfer requires payment (must be before early return for hooks consistency)
  // Use backend's paymentRequired field if available, otherwise fall back to price > 0
  const requiresPayment = useMemo(() => {
    // Backend provides explicit paymentRequired field
    if (transfer?.paymentRequired !== undefined) {
      return transfer.paymentRequired && (transfer?.price ?? 0) > 0;
    }
    // Fallback: infer from price (backward compatibility)
    return (
      transfer?.price !== undefined &&
      transfer?.price !== null &&
      transfer?.price > 0
    );
  }, [transfer?.paymentRequired, transfer?.price]);

  // Check if this is a public access transfer
  const isPublicTransfer = useMemo(() => {
    return transfer?.accessControl === "public";
  }, [transfer?.accessControl]);

  // Determine if Pay button should show (only for unpaid receivers of paid transfers)
  const showPayButton = useMemo(() => {
    // Public transfers never show Pay button
    if (isPublicTransfer) return false;

    // Sender never sees Pay button
    if (role === "sender") return false;

    // Free transfers show Download
    if (!requiresPayment) return false;

    // Already paid transfers show Download
    if (transfer?.isPaid) return false;

    // Receiver with unpaid transfer sees Pay button
    return true;
  }, [role, requiresPayment, transfer?.isPaid, isPublicTransfer]);

  // Compute if user can view original files
  // For paid transfers, both sender and receiver see watermarked previews
  // For free transfers, everyone sees originals
  const canViewOriginal = useMemo(() => {
    // Free transfer - everyone sees original
    if (!requiresPayment) return true;
    // Paid transfer - see original only after payment
    return transfer?.isPaid === true;
  }, [requiresPayment, transfer?.isPaid]);

  // Auto-refresh transfer data when any previewable file is missing its thumbnail
  // This handles the case where the user opens preview immediately after upload
  useEffect(() => {
    if (!transfer?.id || !transfer?.files?.length) return;
    if (refreshAttempts.current >= 5) return;

    // Check if any previewable file is still missing its thumbnail
    const anyMissingThumbnail = transfer.files.some((f) => {
      const mime = (f.mimeType || f.fileType || "").toLowerCase();
      const isPreviewable =
        mime.startsWith("image/") || mime.startsWith("video/");
      return isPreviewable && !f.thumbnailUrl;
    });

    if (!anyMissingThumbnail) return;

    const timer = setTimeout(async () => {
      try {
        const response = await transferApi.getTransferById(transfer.id);
        if (response.data) {
          refreshAttempts.current += 1;
          fetchedFileIdsRef.current.clear(); // Allow re-fetch with updated file data
          setLiveTransfer(response.data);
        }
      } catch {
        // Silently fail — placeholders shown while waiting for preview generation
      }
    }, 5000); // 5s delay to allow preview generation

    return () => clearTimeout(timer);
  }, [transfer?.id, transfer?.files]);

  // Show loading panel if transfer data is not available
  if (!transfer || !transfer.files || transfer.files.length === 0) {
    return <LoadingPanel fullHeight />;
  }

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

  // Get file type category
  const getFileType = (
    mimeType: string,
    extension: string,
  ): FilePreviewType => {
    const mime = mimeType.toLowerCase();
    const ext = extension.toLowerCase();
    if (
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)
    ) {
      return "image";
    }
    if (
      mime.startsWith("video/") ||
      ["mp4", "avi", "mov", "webm", "mkv", "flv"].includes(ext)
    ) {
      return "video";
    }
    if (
      mime.startsWith("audio/") ||
      ["mp3", "wav", "ogg", "aac", "m4a", "flac"].includes(ext)
    ) {
      return "audio";
    }
    if (mime === "application/pdf" || ext === "pdf") {
      return "pdf";
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return "archive";
    }
    if (
      [
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "csv",
        "rtf",
      ].includes(ext)
    ) {
      return "document";
    }
    return "other";
  };

  // Get file icon based on type
  const getFileIcon = (fileType: FilePreviewType) => {
    switch (fileType) {
      case "image":
        return <MediaImage className="w-12 h-12 text-gray-400 dark:text-[oklch(0.50_0_0)]" />;
      case "video":
        return <VideoCamera className="w-12 h-12 text-gray-400 dark:text-[oklch(0.50_0_0)]" />;
      case "audio":
        return <MusicDoubleNote className="w-12 h-12 text-gray-400 dark:text-[oklch(0.50_0_0)]" />;
      case "pdf":
        return <PageEdit className="w-12 h-12 text-red-400" />;
      case "archive":
        return <Archive className="w-12 h-12 text-yellow-500" />;
      case "document":
        return <PageEdit className="w-12 h-12 text-blue-400" />;
      default:
        return <Page className="w-12 h-12 text-gray-400 dark:text-[oklch(0.50_0_0)]" />;
    }
  };

  // Check if file is previewable in lightbox
  const isLightboxPreviewable = (fileType: FilePreviewType): boolean => {
    return fileType === "image" || fileType === "video";
  };

  // Filter to get only current version files
  const currentVersionFiles = useMemo(() => {
    if (!transfer.files) return [];

    // If a specific version is selected, filter by that version ID
    if (selectedVersionId) {
      return transfer.files.filter((file) => {
        if (!file.version) return false;
        return file.version.id === selectedVersionId;
      });
    }

    // Otherwise, show default version files
    // Files in default version will have version.isDefault === true
    // For backward compatibility, files without version are included
    return transfer.files.filter((file) => {
      // If file has no version info, include it (backward compatibility)
      if (!file.version) return true;
      // Only include files from the default version
      return file.version.isDefault === true;
    });
  }, [transfer.files, selectedVersionId]);

  // Process files with normalized data (using only current version files)
  const processedFiles = useMemo(() => {
    return currentVersionFiles.map((file, index) => {
      const fileName = file.filename || file.fileName || `File ${index + 1}`;
      const fileSizeRaw = file.size || file.fileSize || 0;
      const fileSize =
        typeof fileSizeRaw === "string"
          ? parseInt(fileSizeRaw, 10)
          : fileSizeRaw;
      const mimeType = file.mimeType || file.fileType || "";
      const extension = fileName.split(".").pop()?.toLowerCase() || "";
      const fileType = getFileType(mimeType, extension);

      return {
        ...file,
        fileName,
        fileSize,
        mimeType,
        extension,
        fileType,
        isPreviewable: isLightboxPreviewable(fileType),
      };
    });
  }, [currentVersionFiles]);

  // Fetch previews for files that need preview URLs
  // Uses fetchedFileIdsRef to track fetched files (NOT fetchedPreviews state) to avoid infinite loops
  useEffect(() => {
    const fetchMissingPreviews = async () => {
      const filesToFetch = processedFiles.filter((file) => {
        // Only fetch for previewable types (images, videos)
        if (file.fileType !== "image" && file.fileType !== "video")
          return false;

        // Skip files already fetched (ref prevents infinite re-trigger)
        if (fetchedFileIdsRef.current.has(file.id)) return false;

        // When canViewOriginal, fetch for all previewable files (to get original URLs)
        if (canViewOriginal) return true;

        // When not authorized for original, only fetch for files without pre-generated thumbnails
        return !file.thumbnailUrl;
      });

      if (filesToFetch.length === 0) return;

      // Mark as fetched BEFORE making API calls to prevent concurrent re-fetches
      filesToFetch.forEach((f) => fetchedFileIdsRef.current.add(f.id));

      // Fetch previews in parallel
      const results = await Promise.allSettled(
        filesToFetch.map(async (file) => {
          try {
            const response = await storageApi.getFilePreviewUrl(
              transfer.shortCode,
              file.id,
              {
                sessionToken,
                requestOriginal: canViewOriginal,
                email: recipientEmail,
              },
            );
            if (response.data?.url) {
              return {
                fileId: file.id,
                url: response.data.url,
                isWatermarked: response.data.isWatermarked ?? false,
              };
            }
            return null;
          } catch (error) {
            console.warn(
              `Failed to fetch preview for ${file.fileName}:`,
              error,
            );
            return null;
          }
        }),
      );

      // Update state with fetched preview data
      const newPreviews: Record<
        string,
        { url: string; isWatermarked: boolean }
      > = {};
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          newPreviews[result.value.fileId] = {
            url: result.value.url,
            isWatermarked: result.value.isWatermarked,
          };
        }
      });

      if (Object.keys(newPreviews).length > 0) {
        setFetchedPreviews((prev) => ({ ...prev, ...newPreviews }));
      }
    };

    fetchMissingPreviews();
  }, [processedFiles, transfer.shortCode, canViewOriginal]);

  // Fetch version history when transfer has multiple versions
  useEffect(() => {
    const fetchVersions = async () => {
      // Only fetch if transfer has version info
      if (
        !transfer.id ||
        !transfer.versionCount ||
        transfer.versionCount <= 1
      ) {
        return;
      }

      setIsLoadingVersions(true);
      try {
        const response = await transferApi.getVersionHistory(transfer.id);
        if (response.data && response.data.length > 0) {
          setVersions(response.data);
          // Default to the default version
          const defaultVersion = response.data.find((v) => v.isDefault);
          if (defaultVersion) {
            setSelectedVersionId(defaultVersion.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch versions:", error);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    fetchVersions();
  }, [transfer.id, transfer.versionCount]);

  // Close version dropdown when clicking outside
  useEffect(() => {
    if (!isVersionDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-version-dropdown]")) {
        setIsVersionDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isVersionDropdownOpen]);

  // Get the currently selected version info
  const selectedVersion = useMemo(() => {
    if (!selectedVersionId || versions.length === 0) return null;
    return versions.find((v) => v.id === selectedVersionId) || null;
  }, [selectedVersionId, versions]);

  // Helper to get thumbnail URL for grid display (from file data or fetched)
  // When canViewOriginal is true (paid or free), returns original file thumbnails
  // Otherwise, returns watermarked previews for security
  const getThumbnailUrl = useCallback(
    (file: (typeof processedFiles)[number]): string | null => {
      const fetched = fetchedPreviews[file.id];

      // If user can view original and we have a fetched URL, use it (original file)
      if (canViewOriginal && fetched) {
        return fetched.url;
      }

      // Otherwise, use watermarked thumbnail via backend proxy
      if (file.thumbnailUrl) {
        const sc = transfer.shortCode ? `&shortCode=${encodeURIComponent(transfer.shortCode)}` : '';
        return `${API_URL}/storage/thumbnail/${file.id}?type=thumbnail${sc}`;
      }

      // Fallback to fetched preview only if watermarked
      if (fetched?.isWatermarked) return fetched.url;
      return null;
    },
    [fetchedPreviews, canViewOriginal, transfer.shortCode],
  );

  // Helper to get preview URL for lightbox
  // When canViewOriginal is true (paid or free), returns original files
  // Otherwise, returns only watermarked previews for security
  const getLightboxUrl = useCallback(
    (file: (typeof processedFiles)[number]): string | null => {
      const fetched = fetchedPreviews[file.id];

      // If user can view original and we have a fetched URL, use it (original file)
      if (canViewOriginal && fetched) {
        return fetched.url;
      }

      const sc = transfer.shortCode ? `&shortCode=${encodeURIComponent(transfer.shortCode)}` : '';

      // Otherwise, fall back to watermarked previews
      if (file.fileType === "video") {
        // For videos, prefer previewClipUrl (20-sec watermarked clip) via proxy
        const previewClip = (file as Record<string, unknown>).previewClipUrl as
          | string
          | null
          | undefined;
        if (previewClip)
          return `${API_URL}/storage/thumbnail/${file.id}?type=preview${sc}`;
        // Fall back to fetched URL only if watermarked
        if (fetched?.isWatermarked) return fetched.url;
        return null; // Don't show original file in lightbox
      }
      // For images, check pre-generated thumbnail (always watermarked) via proxy
      if (file.thumbnailUrl)
        return `${API_URL}/storage/thumbnail/${file.id}?type=thumbnail${sc}`;
      // Check fetched preview only if watermarked
      if (fetched?.isWatermarked) return fetched.url;
      return null; // Don't show original file in lightbox
    },
    [fetchedPreviews, canViewOriginal, transfer.shortCode],
  );

  // Sort files based on current sort field and direction
  const sortedFiles = useMemo(() => {
    const files = [...processedFiles];

    files.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.fileName.localeCompare(b.fileName);
          break;
        case "size":
          comparison = a.fileSize - b.fileSize;
          break;
        case "date":
          // Use createdAt if available, fallback to index order
          const dateA = (a as Record<string, unknown>).createdAt
            ? new Date(
                (a as Record<string, unknown>).createdAt as string,
              ).getTime()
            : 0;
          const dateB = (b as Record<string, unknown>).createdAt
            ? new Date(
                (b as Record<string, unknown>).createdAt as string,
              ).getTime()
            : 0;
          comparison = dateA - dateB;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return files;
  }, [processedFiles, sortField, sortDirection]);

  // Handle sort change
  const handleSortChange = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        // Toggle direction if same field
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        // Set new field with ascending direction
        setSortField(field);
        setSortDirection("asc");
      }
      setIsSortDropdownOpen(false);
    },
    [sortField],
  );

  // Get sort label
  const getSortLabel = useCallback(
    (field: SortField): string => {
      switch (field) {
        case "name":
          return t("sortByName");
        case "date":
          return t("sortByDate");
        case "size":
          return t("sortBySize");
      }
    },
    [t],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isSortDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sort-dropdown]")) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isSortDropdownOpen]);

  // Get display title
  const getDisplayTitle = (): string => {
    if (transfer.title) return transfer.title;
    const firstFile = processedFiles[0];
    if (firstFile) {
      return firstFile.fileName;
    }
    return t("untitled");
  };

  // Get sender email
  const getSenderEmail = (): string | null => {
    if (!transfer.senderId) return null;
    if (typeof transfer.senderId === "object" && transfer.senderId.email) {
      return transfer.senderId.email;
    }
    return null;
  };

  // Check if sender is KYC verified
  const isSenderVerified = (): boolean => {
    if (!transfer.senderId) return false;
    if (typeof transfer.senderId === "object" && transfer.senderId.kycStatus) {
      return transfer.senderId.kycStatus === "verified";
    }
    return false;
  };

  const senderEmail = getSenderEmail();
  const senderVerified = isSenderVerified();

  // Calculate total size
  const totalSize = processedFiles.reduce(
    (acc, file) => acc + file.fileSize,
    0,
  );
  const fileCount = processedFiles.length;

  // Get expiry info
  const expiryDateStr = transfer.expireAt || transfer.expiryDate;
  const isExpired = useMemo(() => {
    if (!expiryDateStr) return false;
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return false;
    return expiry.getTime() <= Date.now();
  }, [expiryDateStr]);

  const getExpiryText = (): string => {
    if (!expiryDateStr) return t("noExpiration");
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return t("invalidDate");
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return t("expired");
    if (diffDays === 1) return t("expiresIn1Day");
    return t("expiresInDays", { days: diffDays });
  };

  // Get currency symbol for display
  const getCurrencySymbol = useCallback((currency?: string): string => {
    const symbols: Record<string, string> = {
      XOF: "CFA",
      NGN: "₦",
      GHS: "₵",
      KES: "KSh",
      ZAR: "R",
      USD: "$",
      EUR: "€",
    };
    return symbols[currency || "XOF"] || currency || "CFA";
  }, []);

  // Format price for display with currency conversion
  const formatPrice = useCallback(
    (price: number, originalCurrency?: string): string => {
      // Price is in minor units, convert to major units
      const majorUnits = price / 100;
      const sourceCurrency = (originalCurrency || "XOF") as CurrencyCode;

      // Convert to display currency if different
      if (sourceCurrency !== displayCurrency) {
        const convertedAmount = convertCurrency(
          majorUnits,
          sourceCurrency,
          displayCurrency,
        );
        return formatCurrencyAmount(convertedAmount, displayCurrency);
      }

      // Same currency, just format
      return formatCurrencyAmount(majorUnits, sourceCurrency);
    },
    [displayCurrency],
  );

  // Open payment flow in drawer (replaces modal)
  const handlePayClick = useCallback(() => {
    openPaymentFlow(transfer, senderEmail || "");
  }, [transfer, senderEmail, openPaymentFlow]);

  // Open lightbox for previewable files (double-click for quick preview)
  const openLightbox = useCallback(
    (index: number) => {
      const file = sortedFiles[index];
      if (file.isPreviewable) {
        setLightboxIndex(index);
      }
    },
    [sortedFiles],
  );

  // Open file preview panel (single click)
  const openFilePreview = useCallback((index: number) => {
    setSelectedFileIndex(index);
  }, []);

  // Set custom back handler when FilePreviewView is shown
  // This intercepts the drawer's back button to close FilePreviewView first
  useEffect(() => {
    if (selectedFileIndex !== null) {
      // When FilePreviewView is shown, set a custom back handler
      setOnBeforeBack(() => {
        setSelectedFileIndex(null);
        return true; // We handled it, don't call popView
      });
    } else {
      // Clear the handler when FilePreviewView is closed
      setOnBeforeBack(null);
    }

    // Cleanup on unmount
    return () => {
      setOnBeforeBack(null);
    };
  }, [selectedFileIndex, setOnBeforeBack]);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Navigate lightbox
  const navigateLightbox = useCallback(
    (direction: "prev" | "next") => {
      if (lightboxIndex === null) return;

      // Find next/prev previewable file
      let newIndex = lightboxIndex;
      const step = direction === "next" ? 1 : -1;

      do {
        newIndex = (newIndex + step + sortedFiles.length) % sortedFiles.length;
      } while (
        !sortedFiles[newIndex].isPreviewable &&
        newIndex !== lightboxIndex
      );

      if (sortedFiles[newIndex].isPreviewable) {
        setLightboxIndex(newIndex);
      }
    },
    [lightboxIndex, sortedFiles],
  );

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigateLightbox("prev");
      if (e.key === "ArrowRight") navigateLightbox("next");
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, closeLightbox, navigateLightbox]);

  // File count text
  const fileCountText =
    fileCount === 1
      ? t("file", { count: fileCount })
      : t("files", { count: fileCount });

  // Get current lightbox file
  const currentLightboxFile =
    lightboxIndex !== null ? sortedFiles[lightboxIndex] : null;

  // Count previewable files for lightbox counter
  const previewableCount = sortedFiles.filter((f) => f.isPreviewable).length;
  const currentPreviewableIndex =
    lightboxIndex !== null
      ? sortedFiles.slice(0, lightboxIndex + 1).filter((f) => f.isPreviewable)
          .length
      : 0;

  // Get selected file for FilePreviewView
  const selectedFile =
    selectedFileIndex !== null ? sortedFiles[selectedFileIndex] : null;

  // Convert sorted files to FileData format for navigation
  const allFilesForNav = sortedFiles.map((f) => ({
    id: f.id,
    name: f.fileName,
    size: f.fileSize,
    mimeType: f.mimeType,
    thumbnailUrl: f.thumbnailUrl || null,
    previewClipUrl: (f as Record<string, unknown>).previewClipUrl as
      | string
      | null
      | undefined,
    waveformUrl: (f as Record<string, unknown>).waveformUrl as
      | string
      | null
      | undefined,
  }));

  // Handle navigation between files
  const handleFileNavigate = useCallback((index: number) => {
    setSelectedFileIndex(index);
  }, []);

  // Show file preview view when a file is selected
  // Back navigation is handled by the drawer's onBeforeBack mechanism (set in useEffect above)
  if (selectedFile && selectedFileIndex !== null) {
    return (
      <FilePreviewView
        file={{
          id: selectedFile.id,
          name: selectedFile.fileName,
          size: selectedFile.fileSize,
          mimeType: selectedFile.mimeType,
          thumbnailUrl: selectedFile.thumbnailUrl || null,
          previewClipUrl: (selectedFile as Record<string, unknown>)
            .previewClipUrl as string | null | undefined,
          waveformUrl: (selectedFile as Record<string, unknown>).waveformUrl as
            | string
            | null
            | undefined,
        }}
        shortCode={transfer.shortCode}
        transferId={transfer.id}
        role={role === "sender" ? "sender" : "recipient"}
        userEmail={
          role === "receiver" ? recipientEmail : senderEmail || undefined
        }
        sessionToken={sessionToken}
        allFiles={allFilesForNav}
        currentIndex={selectedFileIndex}
        onNavigate={handleFileNavigate}
        isPaid={transfer.isPaid}
        requiresPayment={requiresPayment}
      />
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-[oklch(0.91_0_0)] mb-4 line-clamp-2">
            {getDisplayTitle()}
          </h1>
          {senderEmail && (
            <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)] mb-2 flex items-center gap-1">
              {t("from", { email: senderEmail })}
              {senderVerified && <VerifiedBadge size="sm" />}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
            {fileCountText} • {formatSize(totalSize)} • {getExpiryText()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Report Link */}
          <ReportIssueButton
            transferId={transfer.id}
            shortCode={transfer.shortCode}
            userEmail={senderEmail || undefined}
            role={role === "sender" ? "sender" : "recipient"}
            variant="button"
            className="text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.75_0_0)] hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] border-0"
          />

          {/* Pay Button (shown when transfer has price, user is receiver, and not already paid) */}
          {showPayButton && (
            <button
              onClick={handlePayClick}
              disabled={isExpired}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isExpired ? t("transferExpired") : undefined}
            >
              <CreditCard className="w-5 h-5" />
              {isExpired
                ? t("expired")
                : `${paymentT("payFor")} ${formatPrice(transfer.price || 0, transfer.currency)}`}
            </button>
          )}

          {/* Download All Button - hidden (download available from TransferDetailsPanel) */}
        </div>
      </div>

      {/* Public Access Message - shown for public transfers */}
      {isPublicTransfer && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-lg mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center">
            {t("publicAccessMessage")}
          </p>
        </div>
      )}

      {/* Version Context Bar - shows when multiple versions exist */}
      {versions.length > 1 && selectedVersion && (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-border rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center gap-3">
            <RefreshDouble className="w-5 h-5 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
            <span className="text-sm text-gray-700 dark:text-[oklch(0.75_0_0)]">
              {versionT("viewingVersion", {
                current: selectedVersion.versionNumber,
                total: versions.length,
              })}
            </span>
            {!selectedVersion.isDefault && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                {versionT("notLatest")}
              </span>
            )}
          </div>

          {/* Version selector dropdown */}
          <div className="relative" data-version-dropdown>
            <button
              onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-[oklch(0.75_0_0)] bg-white dark:bg-card border border-gray-200 dark:border-border hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] rounded transition-colors"
            >
              <span className="font-medium">
                {selectedVersion.versionLabel}
              </span>
              <NavArrowDown
                className={`w-4 h-4 transition-transform ${isVersionDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isVersionDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg shadow-lg dark:shadow-black/30 z-20">
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => {
                      setSelectedVersionId(version.id);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] first:rounded-t-lg last:rounded-b-lg ${
                      selectedVersionId === version.id ? "bg-gray-50 dark:bg-[oklch(0.28_0_0)]" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-medium ${version.isDefault ? "text-[#5E53E0]" : "text-gray-700 dark:text-[oklch(0.75_0_0)]"}`}
                      >
                        {version.versionLabel}
                        {version.isDefault && (
                          <span className="ml-2 text-xs text-[#87E64B]">
                            ({versionT("current")})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)]">
                        {versionT("fileCount", { count: version.fileCount })}
                      </span>
                    </div>
                    {selectedVersionId === version.id && (
                      <span className="text-[#5E53E0]">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center justify-end mb-4">
        <div className="relative" data-sort-dropdown>
          <button
            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-[oklch(0.75_0_0)] bg-gray-100 dark:bg-[oklch(0.22_0_0)] hover:bg-gray-200 dark:hover:bg-[oklch(0.28_0_0)] rounded transition-colors"
          >
            <Sort className="w-4 h-4" />
            {getSortLabel(sortField)}
            <NavArrowDown
              className={`w-4 h-4 transition-transform ${isSortDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isSortDropdownOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-card border border-gray-200 dark:border-border rounded-lg shadow-lg dark:shadow-black/30 z-10">
              {(["name", "date", "size"] as SortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSortChange(field)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] first:rounded-t-lg last:rounded-b-lg ${
                    sortField === field
                      ? "bg-gray-50 dark:bg-[oklch(0.28_0_0)] text-[#5E53E0] font-medium"
                      : "text-gray-700 dark:text-[oklch(0.75_0_0)]"
                  }`}
                >
                  <span>{getSortLabel(field)}</span>
                  {sortField === field && (
                    <span className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)]">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File grid - responsive 4/5/6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {sortedFiles.map((file, index) => (
          <div
            key={file.id || index}
            className="group relative bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-lg dark:hover:shadow-black/30 hover:scale-[1.02]"
            onClick={() => openFilePreview(index)}
          >
            {/* Preview area */}
            <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.19_0_0)] relative overflow-hidden">
              <ThumbnailCell
                url={getThumbnailUrl(file)}
                icon={getFileIcon(file.fileType)}
                alt={file.fileName}
                generating={
                  file.fileType === "image" || file.fileType === "video"
                }
              />

              {/* Video play indicator */}
              {file.fileType === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center">
                    <PlaySolid className="w-7 h-7 text-white ml-1" />
                  </div>
                </div>
              )}
            </div>

            {/* File info */}
            <div className="p-3">
              <p
                className="text-sm font-medium text-gray-900 dark:text-[oklch(0.91_0_0)] truncate"
                title={file.fileName}
              >
                {file.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)] mt-1">
                {formatSize(file.fileSize)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox for image/video preview */}
      {lightboxIndex !== null && currentLightboxFile && (
        <div
          className="fixed inset-0 z-[10002] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors z-10"
            aria-label={t("close")}
          >
            <Xmark className="w-8 h-8" />
          </button>

          {/* Navigation buttons */}
          {previewableCount > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("prev");
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors"
                aria-label={t("previous")}
              >
                <NavArrowLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateLightbox("next");
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors"
                aria-label={t("next")}
              >
                <NavArrowRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Preview content */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const previewUrl = getLightboxUrl(currentLightboxFile);

              // No watermarked preview available - show placeholder
              if (!previewUrl) {
                return (
                  <div className="flex flex-col items-center justify-center text-white/70">
                    {currentLightboxFile.fileType === "video" ? (
                      <VideoCamera className="w-24 h-24 mb-4" />
                    ) : (
                      <MediaImage className="w-24 h-24 mb-4" />
                    )}
                    <p className="text-lg">{t("previewNotReady")}</p>
                    <p className="text-sm mt-2 text-white/50">
                      {t("previewGenerating")}
                    </p>
                  </div>
                );
              }

              // Show watermarked preview
              if (currentLightboxFile.fileType === "image") {
                return (
                  <img
                    src={previewUrl}
                    alt={currentLightboxFile.fileName}
                    className="max-w-full max-h-[85vh] object-contain"
                  />
                );
              }

              if (currentLightboxFile.fileType === "video") {
                return (
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-[85vh]"
                  />
                );
              }

              return null;
            })()}
          </div>

          {/* File info at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg">
            <p className="text-white text-sm font-medium text-center">
              {currentLightboxFile.fileName}
            </p>
            <p className="text-white/70 text-xs text-center mt-1">
              {formatSize(currentLightboxFile.fileSize)} •{" "}
              {currentPreviewableIndex} / {previewableCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferPreviewPanel;
