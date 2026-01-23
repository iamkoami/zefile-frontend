'use client';

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Download, FileText, Image, Film, Music, Archive, File, Flag, Play, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { TransferDto } from '@/services/transfer-api';
import { storageApi } from '@/services/storage-api';
import { toast } from '@/components/shared/Toast';

interface TransferPreviewPanelProps {
  transfer: TransferDto;
}

type FilePreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'archive' | 'other';

/**
 * TransferPreviewPanel - Shows file preview gallery for a transfer
 * Displays thumbnails for images/videos, icons for other file types
 * Supports 90vw width with full-screen preview lightbox
 */
const TransferPreviewPanel: React.FC<TransferPreviewPanelProps> = ({
  transfer,
}) => {
  const t = useTranslations('transferPreview');
  const locale = useLocale();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = locale === 'fr' ? ['o', 'Ko', 'Mo', 'Go', 'To'] : ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get file type category
  const getFileType = (mimeType: string, extension: string): FilePreviewType => {
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      return 'image';
    }
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'].includes(extension)) {
      return 'video';
    }
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'].includes(extension)) {
      return 'audio';
    }
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'archive';
    }
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf'].includes(extension)) {
      return 'document';
    }
    return 'other';
  };

  // Get file icon based on type
  const getFileIcon = (fileType: FilePreviewType) => {
    switch (fileType) {
      case 'image':
        return <Image className="w-12 h-12 text-gray-400" />;
      case 'video':
        return <Film className="w-12 h-12 text-gray-400" />;
      case 'audio':
        return <Music className="w-12 h-12 text-gray-400" />;
      case 'pdf':
        return <FileText className="w-12 h-12 text-red-400" />;
      case 'archive':
        return <Archive className="w-12 h-12 text-yellow-500" />;
      case 'document':
        return <FileText className="w-12 h-12 text-blue-400" />;
      default:
        return <File className="w-12 h-12 text-gray-400" />;
    }
  };

  // Check if file is previewable in lightbox
  const isLightboxPreviewable = (fileType: FilePreviewType): boolean => {
    return fileType === 'image' || fileType === 'video';
  };

  // Process files with normalized data
  const processedFiles = useMemo(() => {
    return (transfer.files || []).map((file, index) => {
      const fileName = file.filename || file.fileName || `File ${index + 1}`;
      const fileSizeRaw = file.size || file.fileSize || 0;
      const fileSize = typeof fileSizeRaw === 'string' ? parseInt(fileSizeRaw, 10) : fileSizeRaw;
      const mimeType = file.mimeType || file.fileType || '';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
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
  }, [transfer.files]);

  // Get display title
  const getDisplayTitle = (): string => {
    if (transfer.title) return transfer.title;
    const firstFile = processedFiles[0];
    if (firstFile) {
      return firstFile.fileName;
    }
    return t('untitled');
  };

  // Calculate total size
  const totalSize = processedFiles.reduce((acc, file) => acc + file.fileSize, 0);
  const fileCount = processedFiles.length;

  // Get expiry info
  const expiryDateStr = transfer.expireAt || transfer.expiryDate;
  const getExpiryText = (): string => {
    if (!expiryDateStr) return t('noExpiration');
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return t('invalidDate');
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return t('expired');
    if (diffDays === 1) return t('expiresIn1Day');
    return t('expiresInDays', { days: diffDays });
  };

  // Handle download all
  const handleDownloadAll = useCallback(async () => {
    if (!transfer.shortCode) {
      toast.error(t('downloadError'));
      return;
    }

    setIsDownloadingAll(true);
    try {
      // Get download URL for the entire transfer
      const response = await storageApi.getTransferDownloadUrl(transfer.shortCode);
      if (response.data?.url) {
        // Open download in new tab
        window.open(response.data.url, '_blank');
        toast.success(t('downloadAllStarted'));
      } else {
        toast.error(t('downloadError'));
      }
    } catch (error) {
      console.error('Download all failed:', error);
      toast.error(t('downloadError'));
    } finally {
      setIsDownloadingAll(false);
    }
  }, [transfer.shortCode, t]);

  // Handle download single file
  const handleDownloadFile = useCallback(async (fileId: string, fileName: string) => {
    setIsDownloading(fileId);
    try {
      const response = await storageApi.getFileDownloadUrl(fileId);
      if (response.data?.url) {
        // Create temporary link and trigger download
        const link = document.createElement('a');
        link.href = response.data.url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(t('downloadStarted'));
      } else {
        toast.error(t('downloadError'));
      }
    } catch (error) {
      console.error('File download failed:', error);
      toast.error(t('downloadError'));
    } finally {
      setIsDownloading(null);
    }
  }, [t]);

  // Handle report transfer
  const handleReport = useCallback(() => {
    // Open report page/modal
    const reportUrl = `mailto:report@zefile.io?subject=Report Transfer: ${transfer.shortCode}&body=I would like to report this transfer (${transfer.shortCode}) for the following reason:`;
    window.location.href = reportUrl;
  }, [transfer.shortCode]);

  // Open lightbox for previewable files
  const openLightbox = useCallback((index: number) => {
    const file = processedFiles[index];
    if (file.isPreviewable) {
      setLightboxIndex(index);
    }
  }, [processedFiles]);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Navigate lightbox
  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;

    // Find next/prev previewable file
    let newIndex = lightboxIndex;
    const step = direction === 'next' ? 1 : -1;

    do {
      newIndex = (newIndex + step + processedFiles.length) % processedFiles.length;
    } while (!processedFiles[newIndex].isPreviewable && newIndex !== lightboxIndex);

    if (processedFiles[newIndex].isPreviewable) {
      setLightboxIndex(newIndex);
    }
  }, [lightboxIndex, processedFiles]);

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      if (e.key === 'ArrowRight') navigateLightbox('next');
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, closeLightbox, navigateLightbox]);

  // File count text
  const fileCountText =
    fileCount === 1
      ? t('file', { count: fileCount })
      : t('files', { count: fileCount });

  // Get current lightbox file
  const currentLightboxFile = lightboxIndex !== null ? processedFiles[lightboxIndex] : null;

  // Count previewable files for lightbox counter
  const previewableCount = processedFiles.filter(f => f.isPreviewable).length;
  const currentPreviewableIndex = lightboxIndex !== null
    ? processedFiles.slice(0, lightboxIndex + 1).filter(f => f.isPreviewable).length
    : 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getDisplayTitle()}
          </h1>
          <p className="text-sm text-gray-500">
            {fileCountText} • {formatSize(totalSize)} • {getExpiryText()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Report Link */}
          <button
            onClick={handleReport}
            className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('reportTransfer')}
          >
            <Flag className="w-5 h-5" />
            <span className="hidden sm:inline">{t('report')}</span>
          </button>

          {/* Download All Button */}
          <button
            onClick={handleDownloadAll}
            disabled={isDownloadingAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#87E64B] text-[#171717] font-medium rounded-lg hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isDownloadingAll ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {isDownloadingAll ? t('downloading') : t('downloadAll')}
          </button>
        </div>
      </div>

      {/* File grid - responsive 4/5/6 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {processedFiles.map((file, index) => (
          <div
            key={file.id || index}
            className={`group relative bg-gray-50 rounded-xl overflow-hidden transition-all duration-200 ${
              file.isPreviewable ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''
            }`}
            onClick={() => openLightbox(index)}
          >
            {/* Preview area */}
            <div className="aspect-square flex items-center justify-center bg-gray-100 relative">
              {file.thumbnailUrl ? (
                <img
                  src={file.thumbnailUrl}
                  alt={file.fileName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getFileIcon(file.fileType)}
                </div>
              )}

              {/* Video play indicator */}
              {file.fileType === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 bg-black/50 rounded-full flex items-center justify-center">
                    <Play className="w-7 h-7 text-white ml-1" fill="white" />
                  </div>
                </div>
              )}

              {/* Hover overlay with download button */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadFile(file.id, file.fileName);
                  }}
                  disabled={isDownloading === file.id}
                  className="p-3 bg-white rounded-full text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  aria-label={t('downloadFile', { name: file.fileName })}
                >
                  {isDownloading === file.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* File info */}
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate" title={file.fileName}>
                {file.fileName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
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
            aria-label={t('close')}
          >
            <X className="w-8 h-8" />
          </button>

          {/* Navigation buttons */}
          {previewableCount > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors"
                aria-label={t('previous')}
              >
                <ChevronLeft className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white transition-colors"
                aria-label={t('next')}
              >
                <ChevronRight className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Preview content */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {currentLightboxFile.fileType === 'image' ? (
              <img
                src={currentLightboxFile.thumbnailUrl || ''}
                alt={currentLightboxFile.fileName}
                className="max-w-full max-h-[85vh] object-contain"
              />
            ) : currentLightboxFile.fileType === 'video' ? (
              <video
                src={currentLightboxFile.thumbnailUrl || ''}
                controls
                autoPlay
                className="max-w-full max-h-[85vh]"
              />
            ) : null}
          </div>

          {/* File info at bottom */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-lg">
            <p className="text-white text-sm font-medium text-center">
              {currentLightboxFile.fileName}
            </p>
            <p className="text-white/70 text-xs text-center mt-1">
              {formatSize(currentLightboxFile.fileSize)} • {currentPreviewableIndex} / {previewableCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferPreviewPanel;
