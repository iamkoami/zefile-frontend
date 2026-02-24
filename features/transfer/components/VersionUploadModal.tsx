"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { GitPullRequest, Xmark, Check, CloudUpload, Upload } from "iconoir-react";
import { useTranslations, useLocale } from "next-intl";
import { transferApi, TransferDto, VersionLimitDto } from "@/services/transfer-api";
import { multipartUploadService, UploadProgress } from "@/services/multipart-upload.service";
import { getCurrentUserId } from "@/utils/auth";
import { useDrawerStore } from "@/stores/drawer-store";
import { toast } from "@/components/shared/Toast";
import {
  getFileInputAccept,
  validateFiles,
} from "@/lib/constants/supported-file-types";

interface VersionUploadModalProps {
  isOpen: boolean;
  transfer: TransferDto;
  onClose: () => void;
  onSuccess: () => void;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

/**
 * VersionUploadModal - Modal for uploading new version files
 * Creates a new version and uploads files with the versionId
 */
const VersionUploadModal: React.FC<VersionUploadModalProps> = ({
  isOpen,
  transfer,
  onClose,
  onSuccess,
}) => {
  const t = useTranslations("versionUpload");
  const locale = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [notifyRecipients, setNotifyRecipients] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [fileError, setFileError] = useState<string>("");

  // Version limit state
  const [versionLimit, setVersionLimit] = useState<VersionLimitDto | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(false);

  const { openDrawerToView } = useDrawerStore();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch version limits when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchVersionLimits = async () => {
      setIsLoadingLimits(true);
      try {
        const response = await transferApi.getVersionLimits(transfer.id);
        if (response.data) {
          setVersionLimit(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch version limits:", error);
      } finally {
        setIsLoadingLimits(false);
      }
    };

    fetchVersionLimits();
  }, [isOpen, transfer.id]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUploading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isUploading, onClose]);

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

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const newFiles = Array.from(files);

      // Validate files against supported types
      const validation = validateFiles(newFiles);
      if (!validation.valid) {
        setFileError(validation.errors[0]);
        setTimeout(() => setFileError(""), 5000);
        return;
      }

      setFileError("");
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    },
    []
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);

      // Validate files against supported types
      const validation = validateFiles(files);
      if (!validation.valid) {
        setFileError(validation.errors[0]);
        setTimeout(() => setFileError(""), 5000);
        return;
      }

      setFileError("");
      setSelectedFiles((prev) => [...prev, ...files]);
    },
    []
  );

  // Remove file from selection
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Upload files
  const handleUpload = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t("authRequired"));
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error(t("noFilesSelected"));
      return;
    }

    setIsUploading(true);
    setUploadComplete(false);

    // Initialize file states
    const initialStates: FileUploadState[] = selectedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending",
    }));
    setFileStates(initialStates);

    try {
      // Step 1: Create new version
      const versionResponse = await transferApi.createVersion(transfer.id, {
        senderId: userId,
        changelog: changelog.trim() || undefined,
        versionLabel: versionLabel.trim() || undefined,
        notifyRecipients,
      });

      if (versionResponse.error) {
        throw new Error(versionResponse.error.message || t("versionCreateError"));
      }

      const { versionId } = versionResponse.data!;

      // Step 2: Upload files with versionId
      let completedFiles = 0;
      const totalFiles = selectedFiles.length;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Update file state to uploading
        setFileStates((prev) =>
          prev.map((fs, idx) =>
            idx === i ? { ...fs, status: "uploading" } : fs
          )
        );

        try {
          await multipartUploadService.uploadFile(
            file,
            transfer.shortCode,
            userId,
            transfer.id,
            (progress: UploadProgress) => {
              // Update individual file progress
              setFileStates((prev) =>
                prev.map((fs, idx) =>
                  idx === i ? { ...fs, progress: progress.progress } : fs
                )
              );

              // Calculate overall progress
              const currentFileContribution =
                (progress.progress / 100) * (1 / totalFiles);
              const completedContribution = completedFiles / totalFiles;
              setOverallProgress(
                Math.round((completedContribution + currentFileContribution) * 100)
              );
            },
            undefined,
            undefined,
            versionId
          );

          // Mark file as completed
          setFileStates((prev) =>
            prev.map((fs, idx) =>
              idx === i ? { ...fs, status: "completed", progress: 100 } : fs
            )
          );
          completedFiles++;
        } catch (error: any) {
          // Mark file as error
          setFileStates((prev) =>
            prev.map((fs, idx) =>
              idx === i
                ? { ...fs, status: "error", error: error.message }
                : fs
            )
          );
          throw error;
        }
      }

      // All files uploaded successfully
      setOverallProgress(100);
      setUploadComplete(true);
      toast.success(t("uploadSuccess"));

      // Wait a moment to show completion, then close
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Version upload error:", error);
      toast.error(error.message || t("uploadError"));
      setIsUploading(false);
    }
  }, [
    selectedFiles,
    transfer,
    changelog,
    t,
    onSuccess,
    onClose,
  ]);

  // Reset state on close
  const handleClose = useCallback(() => {
    if (isUploading) return;
    setSelectedFiles([]);
    setFileStates([]);
    setChangelog("");
    setVersionLabel("");
    setNotifyRecipients(false);
    setOverallProgress(0);
    setUploadComplete(false);
    setFileError("");
    onClose();
  }, [isUploading, onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-[10000] transition-opacity duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-upload-title"
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2
              id="version-upload-title"
              className="text-xl font-semibold text-gray-900"
            >
              {t("title")}
            </h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors disabled:opacity-50"
              aria-label={t("close")}
            >
              <Xmark className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Transfer info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-[#5E53E0]" />
              <p className="text-sm text-gray-600">
                {t("uploadingTo")}: <span className="font-medium text-gray-900">{transfer.title}</span>
              </p>
            </div>

            {/* Version limit info */}
            {versionLimit && !versionLimit.canCreateNewVersion && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {t("versionLimitReached")}
                </p>
                <p className="text-sm text-amber-700 mb-3">
                  {t("versionLimitMessage", {
                    current: versionLimit.currentVersionCount,
                    max: versionLimit.maxVersions,
                    tier: versionLimit.tier,
                  })}
                </p>
                <button
                  onClick={() => {
                    onClose();
                    openDrawerToView("subscriptions", "list", undefined, "sender");
                  }}
                  className="text-sm font-medium text-[#171717] underline"
                >
                  {t("upgradeToCreateMore")}
                </button>
              </div>
            )}

            {/* Version count indicator */}
            {versionLimit && versionLimit.canCreateNewVersion && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700">
                  {versionLimit.maxVersions === -1
                    ? t("unlimitedVersions")
                    : t("versionsRemaining", {
                        remaining: versionLimit.remainingVersions,
                        max: versionLimit.maxVersions,
                      })}
                </p>
              </div>
            )}

            {/* Version label input */}
            <div className="mb-4">
              <label
                htmlFor="versionLabel"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("versionLabelLabel")}
              </label>
              <input
                id="versionLabel"
                type="text"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                disabled={isUploading}
                placeholder={t("versionLabelPlaceholder")}
                maxLength={50}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t("versionLabelHint")}
              </p>
            </div>

            {/* Changelog input */}
            <div className="mb-4">
              <label
                htmlFor="changelog"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("changelogLabel")}
              </label>
              <textarea
                id="changelog"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                disabled={isUploading}
                placeholder={t("changelogPlaceholder")}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                rows={2}
              />
            </div>

            {/* Notify recipients checkbox */}
            {transfer.recipientEmails && transfer.recipientEmails.length > 0 && (
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyRecipients}
                    onChange={(e) => setNotifyRecipients(e.target.checked)}
                    disabled={isUploading}
                    className="w-4 h-4 rounded border-gray-300 text-[#87E64B] focus:ring-[#87E64B]/50 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">
                    {t("notifyRecipients")}
                  </span>
                </label>
                <p className="mt-1 ml-7 text-xs text-gray-500">
                  {t("notifyRecipientsHint", { count: transfer.recipientEmails.length })}
                </p>
              </div>
            )}

            {/* Drop zone */}
            {!isUploading && selectedFiles.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-[#87E64B] bg-[#87E64B]/5"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <CloudUpload
                  className={`w-12 h-12 mx-auto mb-3 ${
                    isDragOver ? "text-[#87E64B]" : "text-gray-400"
                  }`}
                  strokeWidth={1.5}
                />
                <p className="text-sm text-gray-600 mb-1">
                  {t("dropFilesHere")}
                </p>
                <p className="text-xs text-gray-400">{t("orClickToSelect")}</p>
              </div>
            )}

            {/* File error message */}
            {fileError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{fileError}</p>
              </div>
            )}

            {/* File list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {t("selectedFiles", { count: selectedFiles.length })}
                  </h3>
                  {!isUploading && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-[#171717] underline font-medium"
                    >
                      {t("addMore")}
                    </button>
                  )}
                </div>

                {(isUploading ? fileStates : selectedFiles.map((file) => ({ file, progress: 0, status: "pending" as const }))).map(
                  (fileState, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {fileState.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatSize(fileState.file.size)}
                        </p>
                      </div>

                      {/* Progress indicator */}
                      {isUploading && (
                        <div className="flex items-center gap-2">
                          {fileState.status === "completed" ? (
                            <Check className="w-5 h-5 text-[#87E64B]" />
                          ) : fileState.status === "error" ? (
                            <span className="text-xs text-red-500">
                              {t("failed")}
                            </span>
                          ) : fileState.status === "uploading" ? (
                            <span className="text-xs text-gray-500">
                              {fileState.progress}%
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {t("pending")}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Remove button */}
                      {!isUploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          aria-label={t("removeFile")}
                        >
                          <Xmark className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Overall progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">
                    {uploadComplete ? t("complete") : t("uploading")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {overallProgress}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#87E64B] transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0 || (versionLimit !== null && !versionLimit.canCreateNewVersion)}
              className="px-6 py-2 text-sm font-medium text-[#171717] bg-[#87E64B] rounded hover:bg-[#7ad43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                t("uploading")
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {t("uploadVersion")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={getFileInputAccept()}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </>
  );

  return createPortal(modalContent, document.body);
};

export default VersionUploadModal;
