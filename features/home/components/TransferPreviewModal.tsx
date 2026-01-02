'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Xmark, NavArrowLeft, NavArrowRight } from 'iconoir-react';
import Image from 'next/image';

interface FilePreview {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  fileUrl?: string;
}

interface TransferPreviewModalProps {
  files: FilePreview[];
  isOpen: boolean;
  onClose: () => void;
  isPaid: boolean; // Show watermarked or unwatermarked
}

const TransferPreviewModal: React.FC<TransferPreviewModalProps> = ({
  files,
  isOpen,
  onClose,
  isPaid
}) => {
  const t = useTranslations('transferLanding');
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen || files.length === 0) return null;

  const currentFile = files[currentIndex];
  const previewUrl = isPaid ? currentFile.fileUrl : currentFile.thumbnailUrl;

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
              className="w-full h-full"
              style={{ border: 'none', backgroundColor: '#fff' }}
            />
          )}

          {!isImage && !isVideo && !isPdf && (
            <div className="text-white text-center">
              <p className="text-lg mb-2">{currentFile.filename}</p>
              <p className="text-sm opacity-75">Preview not available for this file type</p>
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
