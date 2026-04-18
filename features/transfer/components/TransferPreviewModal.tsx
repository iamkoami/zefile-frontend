'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Xmark, NavArrowLeft, NavArrowRight } from 'iconoir-react';
import Image from 'next/image';
import PreviewPlaceholder, {
  type PreviewPlaceholderStatus,
} from '@/components/shared/PreviewPlaceholder';
import { usePreviewStatus } from '@/hooks/usePreviewStatus';
import { storageApi } from '@/services/storage-api';

// API URL for thumbnail proxy
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FilePreview {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  /** Async preview generation state (Story 132.2) */
  previewStatus?: 'pending' | 'ready' | 'failed' | 'skipped';
}

interface TransferPreviewModalProps {
  files: FilePreview[];
  isOpen: boolean;
  onClose: () => void;
  isPaid: boolean; // Show watermarked or unwatermarked
  shortCode?: string;
  /** Pass-through session token for password-protected transfers. */
  sessionToken?: string;
}

const TransferPreviewModal: React.FC<TransferPreviewModalProps> = ({
  files,
  isOpen,
  onClose,
  isPaid,
  shortCode,
  sessionToken,
}) => {
  const previewT = useTranslations('filePreview');
  const [currentIndex, setCurrentIndex] = useState(0);
  // URLs fetched post-ready keyed by fileId — lets us render a preview when the
  // initial file payload didn't include thumbnailUrl but polling reports ready.
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  const currentFile = files[currentIndex];
  const hasPrecomputedThumbnail = Boolean(currentFile?.thumbnailUrl);

  // Only poll when this file isn't already renderable.
  const pollEnabled =
    isOpen &&
    Boolean(shortCode) &&
    Boolean(currentFile) &&
    !hasPrecomputedThumbnail &&
    !resolvedUrls[currentFile?.id ?? ''] &&
    (currentFile?.previewStatus ?? 'pending') === 'pending';

  const {
    status: livePreviewStatus,
    exhausted: pollExhausted,
    retry: retryPoll,
  } = usePreviewStatus({
    shortCode: shortCode ?? '',
    fileId: currentFile?.id ?? '',
    initialStatus: currentFile?.previewStatus ?? 'pending',
    enabled: pollEnabled,
    sessionToken,
  });

  // When polling flips to READY, fetch the actual preview URL once. The status
  // endpoint intentionally doesn't return URLs.
  useEffect(() => {
    if (livePreviewStatus !== 'ready' || !shortCode || !currentFile) return;
    if (currentFile.thumbnailUrl || resolvedUrls[currentFile.id]) return;
    let cancelled = false;
    (async () => {
      const response = await storageApi.getFilePreviewUrl(shortCode, currentFile.id, {
        sessionToken,
      });
      if (cancelled || !response.data?.url) return;
      setResolvedUrls((prev) => ({ ...prev, [currentFile.id]: response.data!.url }));
    })();
    return () => {
      cancelled = true;
    };
  }, [livePreviewStatus, shortCode, currentFile, sessionToken, resolvedUrls]);

  const previewUrl = useMemo(() => {
    if (!currentFile) return null;
    if (currentFile.thumbnailUrl) {
      const sc = shortCode ? `&shortCode=${encodeURIComponent(shortCode)}` : '';
      return `${API_URL}/storage/thumbnail/${currentFile.id}?type=thumbnail${sc}`;
    }
    return resolvedUrls[currentFile.id] ?? null;
  }, [currentFile, shortCode, resolvedUrls]);

  // Hooks above — early return safe from here.
  if (!isOpen || files.length === 0 || !currentFile) return null;

  const effectiveStatus: 'pending' | 'ready' | 'failed' | 'skipped' =
    livePreviewStatus ?? currentFile.previewStatus ?? 'pending';
  const placeholderStatus: PreviewPlaceholderStatus | null = !previewUrl
    ? effectiveStatus !== 'ready'
      ? (effectiveStatus as PreviewPlaceholderStatus)
      : 'pending'
    : null;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? files.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === files.length - 1 ? 0 : prev + 1));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = currentFile.mimeType.startsWith('image/');
  const isVideo = currentFile.mimeType.startsWith('video/');
  const isPdf = currentFile.mimeType === 'application/pdf';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-screen p-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-white">
            <h3 className="font-medium text-lg">{currentFile.filename}</h3>
            <p className="text-sm opacity-75">
              {formatFileSize(currentFile.size)} • {currentIndex + 1} of {files.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:opacity-75 transition-opacity"
          >
            <Xmark width={32} height={32} strokeWidth={2} />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 flex items-center justify-center mb-4 relative">
          {!isPaid && (
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded text-sm font-medium z-10"
              style={{ backgroundColor: '#87E64B', color: '#171717' }}
            >
              Watermarked Preview
            </div>
          )}

          {isImage && previewUrl && (
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={previewUrl}
                alt={currentFile.filename}
                width={1200}
                height={800}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                unoptimized
              />
            </div>
          )}

          {isVideo && previewUrl && (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full"
              style={{ backgroundColor: '#000' }}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {isPdf && previewUrl && (
            <iframe
              src={previewUrl}
              title="PDF preview"
              className="w-full h-full"
              style={{ border: 'none', backgroundColor: '#fff' }}
              sandbox="allow-same-origin"
            />
          )}

          {!isImage && !isVideo && !isPdf && (
            <div className="text-white text-center">
              <p className="text-lg mb-2">{currentFile.filename}</p>
              <p className="text-sm opacity-75">Preview not available for this file type</p>
            </div>
          )}

          {(isImage || isVideo || isPdf) && !previewUrl && placeholderStatus && (
            <div className="w-full max-w-2xl flex flex-col items-center gap-4">
              <PreviewPlaceholder
                status={placeholderStatus}
                aspect={isVideo ? 'video' : isPdf ? 'pdf' : 'image'}
              />
              {pollExhausted && (
                <button
                  type="button"
                  onClick={retryPoll}
                  className="text-sm text-white/80 hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-white/60 rounded px-2 py-1"
                >
                  {previewT('retryPreview')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        {files.length > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevious}
              className="text-white hover:opacity-75 transition-opacity p-2"
            >
              <NavArrowLeft width={32} height={32} strokeWidth={2} />
            </button>
            <div className="text-white text-sm">
              {currentIndex + 1} / {files.length}
            </div>
            <button
              onClick={handleNext}
              className="text-white hover:opacity-75 transition-opacity p-2"
            >
              <NavArrowRight width={32} height={32} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferPreviewModal;
