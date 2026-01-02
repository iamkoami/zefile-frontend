'use client';

import React, { useRef, useState } from 'react';
import { Plus, Xmark } from 'iconoir-react';
import { useTranslations } from 'next-intl';
import { getFileInputAccept, validateFiles } from '@/lib/constants/supported-file-types';

interface FilePreviewPanelProps {
  files: File[];
  onRemoveFile: (index: number) => void;
  onAddMoreFiles: (files: File[]) => void;
  isVisible: boolean;
  maxUploadSize: number;
  selectedFilesSize: number;
}

const FilePreviewPanel: React.FC<FilePreviewPanelProps> = ({
  files,
  onRemoveFile,
  onAddMoreFiles,
  isVisible,
  maxUploadSize,
  selectedFilesSize,
}) => {
  const t = useTranslations('filePreview');
  const tUpload = useTranslations('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string>('');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  const getTotalSize = (): string => {
    const total = files.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(total);
  };

  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

  const checkSizeLimit = (newFiles: File[]): boolean => {
    const currentSize = selectedFilesSize;
    const newFilesSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSize = currentSize + newFilesSize;

    if (totalSize > maxUploadSize) {
      const remainingSize = maxUploadSize - currentSize;
      setFileError(
        tUpload('filesExceedLimit', {
          limit: formatBytes(maxUploadSize),
          current: formatBytes(totalSize)
        })
      );
      setTimeout(() => setFileError(''), 5000);
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validation = validateFiles(newFiles);

      if (!validation.valid) {
        setFileError(validation.errors[0]);
        setTimeout(() => setFileError(''), 5000);
        e.target.value = ''; // Reset input
        return;
      }

      // Check size limit
      if (!checkSizeLimit(newFiles)) {
        e.target.value = ''; // Reset input
        return;
      }

      setFileError('');
      onAddMoreFiles(newFiles);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      id="ze-file-preview-panel"
      className={`ze-file-preview-panel ${isVisible ? 'visible' : ''}`}
    >
      <div id="ze-file-preview-content" className="ze-file-preview-content">
        {/* Header */}
        <h2 className="text-lg font-bold mb-6 text-black">
          {files.length} {files.length > 1 ? t('elements') : t('element')}{' '}
          <span className="font-normal text-gray-500">({getTotalSize()})</span>
        </h2>

        {/* File List */}
        <div className="space-y-3 mb-6 max-h-[280px] overflow-y-auto">
          {files.map((file, index) => (
            <div
              key={index}
              className="ze-file-item flex items-center justify-between bg-gray-100 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)} - {getFileExtension(file.name)}
                </p>
              </div>
              <button
                onClick={() => onRemoveFile(index)}
                className="ml-3 flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label="Supprimer le fichier"
              >
                <Xmark width={20} height={20} color="#171717" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>

        {/* Add More Files Section */}
        <div>
          <div className={`ze-add-more-section p-4 bg-primary-sub rounded-lg mb-3 ${selectedFilesSize >= maxUploadSize ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div
              className={`flex items-center gap-3 ${selectedFilesSize >= maxUploadSize ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={selectedFilesSize >= maxUploadSize ? undefined : handleClick}
            >
              <div className="w-12 h-12 flex items-center justify-center border-2 border-[#E1E1E1] rounded flex-shrink-0">
                <Plus width={24} height={24} color="#171717" strokeWidth={2} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-black">
                  {t('addMoreFiles')}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedFilesSize >= maxUploadSize
                    ? tUpload('uploadLimitReached')
                    : `${tUpload('upTo')} ${formatBytes(maxUploadSize - selectedFilesSize)}`
                  }
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={getFileInputAccept()}
              className="hidden"
              onChange={handleFileSelect}
              disabled={selectedFilesSize >= maxUploadSize}
            />
          </div>

          {/* Error Message */}
          {fileError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{fileError}</p>
            </div>
          )}

          <p className="text-sm font-medium text-center text-gray-500">
            {t('dropFilesToAdd')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewPanel;
