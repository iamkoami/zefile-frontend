"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { NavArrowLeft, Check, Page } from "iconoir-react";
import { storageApi } from "@/services/storage-api";
import {
  AnalyticsEventType,
  trackEvent,
} from "@/lib/posthog";

interface TransferFile {
  id: string;
  fileName?: string;
  filename?: string;
  fileSize?: number | string;
  size?: number | string;
}

interface PerFileDownloadListProps {
  /** Transfer short code (without z- prefix) */
  shortCode: string;
  /** Files available in the transfer */
  files: TransferFile[];
  /** Optional password (already verified upstream, used to sign per-file URLs) */
  password?: string;
  /** Session token for protected/password-verified sessions */
  sessionToken?: string;
  /** Optional version ID if viewing a specific version */
  versionId?: string;
  /** Buyer email — required to unlock per-file downloads on paid transfers when not logged in */
  email?: string;
  /** Return to the normal bundle-download flow */
  onBackToBundle: () => void;
  /**
   * Story 133-1 (HIGH-2): called when the backend refuses a self-asserted email for a paid
   * download in strict mode ({ code: 'EMAIL_VERIFICATION_REQUIRED' }). The page routes the user
   * back through the email OTP step. When provided, the row is not marked as a generic error.
   */
  onEmailVerificationRequired?: () => void;
}

type RowState =
  | { kind: "idle" }
  | { kind: "downloading" }
  | { kind: "done" }
  | { kind: "error" };

/**
 * PerFileDownloadList — Story 132.3 (AC #4)
 *
 * Fallback download UX: one row per file with an individual download button.
 * Successfully downloaded rows show a check indicator so the user can track
 * what they've already grabbed.
 *
 * Reuses the existing `POST /storage/download/url` endpoint with a single
 * fileId — no new backend route needed.
 */
export default function PerFileDownloadList({
  shortCode,
  files,
  password,
  sessionToken,
  versionId,
  email,
  onBackToBundle,
  onEmailVerificationRequired,
}: PerFileDownloadListProps) {
  const t = useTranslations("transferLanding");
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  const updateRow = (fileId: string, state: RowState) => {
    setRowStates((prev) => ({ ...prev, [fileId]: state }));
  };

  const handleDownload = async (file: TransferFile) => {
    updateRow(file.id, { kind: "downloading" });

    try {
      const response = await storageApi.getDownloadUrl({
        shortCode,
        fileIds: [file.id],
        password,
        sessionToken,
        versionId,
        email,
      });

      // Strict-mode paid downloads require a proven email; route back to the OTP step instead
      // of surfacing a dead-end row error (Story 133-1 / HIGH-2).
      if (response.error?.code === "EMAIL_VERIFICATION_REQUIRED" && onEmailVerificationRequired) {
        updateRow(file.id, { kind: "idle" });
        onEmailVerificationRequired();
        return;
      }

      const signed = response.data?.urls?.[0];
      if (response.error || !signed?.url) {
        updateRow(file.id, { kind: "error" });
        return;
      }

      // Trigger a plain navigation to the signed URL — browser handles
      // Content-Disposition: attachment and keeps memory footprint low
      // for large files. An invisible <a> with download attribute lets
      // us set a preferred filename where the CDN doesn't provide one.
      const link = document.createElement("a");
      link.href = signed.url;
      link.download = signed.filename || file.fileName || file.filename || "file";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      updateRow(file.id, { kind: "done" });

      trackEvent(AnalyticsEventType.DOWNLOAD_FALLBACK_FILE_DOWNLOADED, {
        short_code: shortCode,
        file_id: file.id,
      });
    } catch {
      updateRow(file.id, { kind: "error" });
    }
  };

  const formatBytes = (raw?: number | string): string => {
    const bytes = typeof raw === "string" ? Number(raw) : raw;
    if (!bytes || bytes <= 0 || Number.isNaN(bytes)) return "";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  return (
    <div
      role="region"
      aria-label={t("perFileListTitle")}
      className="mt-4 rounded border border-gray-200 dark:border-[oklch(0.30_0_0)] bg-white dark:bg-[oklch(0.20_0_0)] p-4 text-left"
      data-testid="per-file-download-list"
    >
      <h2 className="text-base font-semibold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
        {t("perFileListTitle")}
      </h2>
      <p className="text-sm text-gray-600 dark:text-[oklch(0.70_0_0)] mb-4 leading-relaxed">
        {t("perFileListSubtitle")}
      </p>

      <ul className="divide-y divide-gray-100 dark:divide-[oklch(0.28_0_0)] mb-4">
        {files.map((file) => {
          const state = rowStates[file.id] ?? { kind: "idle" };
          const filename = file.fileName || file.filename || "file";
          const sizeLabel = formatBytes(file.fileSize ?? file.size);

          return (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {state.kind === "done" ? (
                  <Check
                    className="w-4 h-4 flex-shrink-0 text-[#87E64B]"
                    aria-hidden="true"
                  />
                ) : (
                  <Page
                    className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-[oklch(0.60_0_0)]"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <div className="text-sm text-[#171717] dark:text-[oklch(0.85_0_0)] truncate">
                    {filename}
                  </div>
                  {sizeLabel && (
                    <div className="text-xs text-gray-500 dark:text-[oklch(0.60_0_0)]">
                      {sizeLabel}
                    </div>
                  )}
                  {state.kind === "error" && (
                    <div
                      role="alert"
                      className="text-xs text-red-600 dark:text-red-400 mt-0.5"
                    >
                      {t("perFileError")}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(file)}
                disabled={state.kind === "downloading"}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-[oklch(0.35_0_0)] text-[#171717] dark:text-[oklch(0.85_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.24_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                data-testid={`per-file-download-${file.id}`}
              >
                {state.kind === "downloading"
                  ? t("perFileDownloading")
                  : state.kind === "done"
                    ? t("perFileDownloaded")
                    : t("perFileDownload")}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onBackToBundle}
        className="inline-flex items-center gap-1 text-sm text-[#5E53E0] dark:text-[oklch(0.72_0.18_280)] hover:underline"
      >
        <NavArrowLeft className="w-3 h-3" aria-hidden="true" />
        {t("perFileBackToBundle")}
      </button>
    </div>
  );
}
