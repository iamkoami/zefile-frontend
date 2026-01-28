"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  PageEdit,
  MediaImage,
  VideoCamera,
  MusicDoubleNote,
  Archive,
  Page,
  TriangleFlag,
  NavArrowLeft,
  NavArrowRight,
} from "iconoir-react";
import { useTranslations, useLocale } from "next-intl";
import { storageApi } from "@/services/storage-api";
import { toast } from "@/components/shared/Toast";
import LoadingPanel from "@/components/LoadingPanel";

// API URL for thumbnail proxy
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type FilePreviewType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "archive"
  | "other";

interface FileData {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string | null;
  previewClipUrl?: string | null;
  waveformUrl?: string | null;
}

interface FilePreviewViewProps {
  file: FileData;
  shortCode: string;
  password?: string;
  /** All files in the transfer for navigation */
  allFiles?: FileData[];
  /** Current file index in allFiles */
  currentIndex?: number;
  /** Callback when navigating to a different file */
  onNavigate?: (index: number) => void;
}

/**
 * FilePreviewView - Full-screen file preview with info panel
 * Shows file details on left, preview on right
 * Back navigation is handled by the drawer's onBeforeBack mechanism
 */
const FilePreviewView: React.FC<FilePreviewViewProps> = ({
  file,
  shortCode,
  password,
  allFiles,
  currentIndex,
  onNavigate,
}) => {
  const t = useTranslations("filePreview");
  const locale = useLocale();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigation helpers
  const canNavigate =
    allFiles && allFiles.length > 1 && onNavigate && currentIndex !== undefined;
  const canGoPrev = canNavigate && currentIndex > 0;
  const canGoNext = canNavigate && currentIndex < allFiles.length - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev && onNavigate && currentIndex !== undefined) {
      onNavigate(currentIndex - 1);
    }
  }, [canGoPrev, onNavigate, currentIndex]);

  const handleNext = useCallback(() => {
    if (canGoNext && onNavigate && currentIndex !== undefined && allFiles) {
      onNavigate(currentIndex + 1);
    }
  }, [canGoNext, onNavigate, currentIndex, allFiles]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  // Handle report
  const handleReport = useCallback(() => {
    const reportUrl = `mailto:report@zefile.io?subject=Report File: ${file.name}&body=I would like to report this file (${file.name}) from transfer (${shortCode}) for the following reason:`;
    window.location.href = reportUrl;
  }, [file.name, shortCode]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes =
      locale === "fr"
        ? ["o", "Ko", "Mo", "Go", "To"]
        : ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toUpperCase() || "";
  };

  // Get file type category
  const getFileType = (
    mimeType: string,
    extension: string,
  ): FilePreviewType => {
    const ext = extension.toLowerCase();
    const mime = mimeType.toLowerCase();
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

  // Check if file can be previewed in browser
  const isPreviewable = (fileType: FilePreviewType): boolean => {
    return ["image", "video", "audio", "pdf"].includes(fileType);
  };

  // Get file icon based on type
  const getFileIcon = (fileType: FilePreviewType) => {
    const iconClass = "w-24 h-24 text-gray-300";
    switch (fileType) {
      case "image":
        return <MediaImage className={iconClass} />;
      case "video":
        return <VideoCamera className={iconClass} />;
      case "audio":
        return <MusicDoubleNote className={iconClass} />;
      case "pdf":
        return <PageEdit className={`${iconClass} text-red-300`} />;
      case "archive":
        return <Archive className={`${iconClass} text-yellow-400`} />;
      case "document":
        return <PageEdit className={`${iconClass} text-blue-300`} />;
      default:
        return <Page className={iconClass} />;
    }
  };

  const extension = getFileExtension(file.name);
  const fileType = getFileType(file.mimeType, extension);
  const canPreview = isPreviewable(fileType);

  // Check if we have a pre-generated preview (watermarked)
  // For video/audio: use previewClipUrl (20-sec clip with watermark)
  // For images: use thumbnailUrl (watermarked thumbnail)
  // For PDFs: we always want to show the actual PDF in a viewer, not just a thumbnail
  // Returns the proxy URL that will redirect to a presigned S3 URL
  const hasPreGeneratedPreview = (): string | null => {
    // All pre-generated previews now go through the backend proxy endpoint
    // which converts S3 keys to presigned URLs
    if (fileType === "video" && file.previewClipUrl) {
      return `${API_URL}/storage/thumbnail/${file.id}?type=preview`;
    }
    if (fileType === "audio" && file.previewClipUrl) {
      return `${API_URL}/storage/thumbnail/${file.id}?type=preview`;
    }
    if (fileType === "image" && file.thumbnailUrl) {
      return `${API_URL}/storage/thumbnail/${file.id}?type=thumbnail`;
    }
    // PDFs: Don't return thumbnail - we want to fetch the actual PDF for viewing
    // The thumbnail is only used for grid display, not for preview view
    return null;
  };

  // Fetch presigned URL for preview (only if no pre-generated preview)
  useEffect(() => {
    const fetchPreviewUrl = async () => {
      if (!canPreview) {
        setIsLoading(false);
        return;
      }

      // Check if we have a pre-generated preview first
      const preGeneratedUrl = hasPreGeneratedPreview();
      if (preGeneratedUrl) {
        setPreviewUrl(preGeneratedUrl);
        setIsLoading(false);
        return;
      }

      // For PDF or files without pre-generated previews, fetch presigned URL
      setIsLoading(true);
      setError(null);

      try {
        const response = await storageApi.getFilePreviewUrl(
          shortCode,
          file.id,
          password,
        );

        if (response.error) {
          setError(response.error.message || t("previewError"));
        } else if (response.data) {
          const responseIsWatermarked = response.data.isWatermarked ?? false;

          // PDFs can be shown in iframe viewer without watermark requirement
          // since iframe viewing prevents easy downloading
          if (fileType === "pdf") {
            setPreviewUrl(response.data.url);
            setPreviewMimeType(response.data.mimeType);
          } else if (!responseIsWatermarked) {
            // SECURITY: Images/videos require watermarked preview - never show original
            setPreviewUrl(null);
            setPreviewMimeType(null);
            setError(t("previewNotAvailable"));
          } else {
            setPreviewUrl(response.data.url);
            setPreviewMimeType(response.data.mimeType);
          }
        }
      } catch (err) {
        setError(t("previewError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreviewUrl();
  }, [
    file.id,
    shortCode,
    password,
    canPreview,
    t,
    file.previewClipUrl,
    file.thumbnailUrl,
    fileType,
  ]);

  // Handle download
  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    try {
      const response = await storageApi.getFilePreviewUrl(
        shortCode,
        file.id,
        password,
      );

      if (response.error) {
        toast.error(response.error.message || t("downloadError"));
        return;
      }

      if (response.data?.url) {
        // Create download link
        const link = document.createElement("a");
        link.href = response.data.url;
        link.download = file.name;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      toast.error(t("downloadError"));
    } finally {
      setIsDownloading(false);
    }
  }, [shortCode, file.id, file.name, password, t]);

  // Render preview content based on file type
  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingPanel />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          {getFileIcon(fileType)}
          <p className="mt-4 text-sm">{error}</p>
        </div>
      );
    }

    if (!canPreview || !previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          {getFileIcon(fileType)}
          <p className="mt-4 text-sm">{t("noPreview")}</p>
        </div>
      );
    }

    switch (fileType) {
      case "image":
        return (
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
          />
        );
      case "video":
        return (
          <video
            src={previewUrl}
            controls
            autoPlay={false}
            className="max-w-full max-h-full object-contain"
          >
            {t("videoNotSupported")}
          </video>
        );
      case "audio":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            {file.waveformUrl ? (
              <img
                src={`${API_URL}/storage/thumbnail/${file.id}?type=waveform`}
                alt="Audio waveform"
                className="w-full max-w-md mb-8 rounded-lg"
              />
            ) : (
              <MusicDoubleNote className="w-32 h-32 text-gray-300 mb-8" />
            )}
            <audio src={previewUrl} controls className="w-full max-w-md">
              {t("audioNotSupported")}
            </audio>
          </div>
        );
      case "pdf":
        // Display watermarked first page - as PDF (iframe) or image (fallback)
        if (previewMimeType === "application/pdf") {
          // Watermarked single-page PDF - display in iframe with toolbar disabled
          return (
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              title={file.name}
              className="w-full h-full border-0 rounded-lg bg-white"
              style={{ minHeight: "80vh" }}
            />
          );
        }
        // Fallback: image thumbnail of first page
        return (
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            {getFileIcon(fileType)}
            <p className="mt-4 text-sm">{t("noPreview")}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Left panel - File info */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 p-6 flex flex-col">
        {/* File name */}
        <h2 className="text-lg font-semibold text-gray-900 mb-6 break-words">
          {file.name}
        </h2>

        {/* File metadata */}
        <div className="space-y-4 mb-8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("format")}
            </p>
            <p className="text-sm font-medium text-gray-900">
              {extension ||
                file.mimeType.split("/")[1]?.toUpperCase() ||
                "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("size")}
            </p>
            <p className="text-sm font-medium text-gray-900">
              {formatSize(file.size)}
            </p>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#87E64B] text-[#171717] font-semibold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
        >
          <Download className="w-5 h-5" />
          {isDownloading ? t("downloading") : t("download")}
        </button>
      </div>

      {/* Right panel - Preview */}
      <div className="flex-1 rounded-lg  bg-[#1a1a1a] flex flex-col overflow-hidden relative">
        {/* Top bar with report and navigation */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a]">
          {/* Report button */}
          <button
            onClick={handleReport}
            className="flex items-center gap-2 px-2 py-1 text-white/70 hover:text-white transition-colors"
            aria-label={t("report")}
          >
            <TriangleFlag className="w-5 h-5" />
            <span className="text-sm">{t("report")}</span>
          </button>

          {/* File navigation */}
          {canNavigate && allFiles && currentIndex !== undefined ? (
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrev}
                disabled={!canGoPrev}
                className="p-1 text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t("previousFile")}
              >
                <NavArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-white/90 text-sm font-medium">
                {t("fileOf", {
                  current: currentIndex + 1,
                  total: allFiles.length,
                })}
              </span>
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className="p-1 text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t("nextFile")}
              >
                <NavArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="text-white/70 text-sm">
              {t("fileOf", { current: 1, total: 1 })}
            </div>
          )}
        </div>

        {/* Preview content */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewView;
