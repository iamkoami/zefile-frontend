'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/features/home/components/Header';
import UploadPanel from '@/features/home/components/UploadPanel';
import FilePreviewPanel from '@/features/home/components/FilePreviewPanel';
import TransferOptionsPanel from '@/features/home/components/TransferOptionsPanel';
import GlobalDragDropOverlay from '@/features/home/components/GlobalDragDropOverlay';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import { platformApi } from '@/services/platform-api';

export default function Home() {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2147483648); // Default 2GB
  const [selectedFilesSize, setSelectedFilesSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch platform configuration on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await platformApi.getPublicConfig();
        if (response.data) {
          setMaxUploadSize(response.data.maxUploadSize);
        }
      } catch (error) {
        console.error('Failed to fetch platform config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Calculate total size of selected files
  useEffect(() => {
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    setSelectedFilesSize(totalSize);
  }, [selectedFiles]);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleAddMoreFiles = (newFiles: File[]) => {
    setSelectedFiles([...selectedFiles, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
  };

  // Show loading screen while fetching configuration
  if (isLoading) {
    return <LoadingFullscreen />;
  }

  return (
    <div id="ze-home-page" className="min-h-screen bg-white">
      {/* Global Drag and Drop Overlay */}
      <GlobalDragDropOverlay onFilesDropped={handleAddMoreFiles} />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main id="ze-main-content" className="pt-0 pb-0" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div id="ze-content-panel" className="ze-content-panel">
          <div
            id="ze-panels-container"
            className="ze-panels-container"
            style={{
              position: 'relative',
              transition: 'all 800ms ease-in-out',
            }}
          >
            {/* Upload Panel */}
            <UploadPanel
              selectedFiles={selectedFiles}
              onFilesChange={handleFilesChange}
              onShowOptions={() => setShowOptions(!showOptions)}
              maxUploadSize={maxUploadSize}
              selectedFilesSize={selectedFilesSize}
            />

            {/* File Preview Panel */}
            <FilePreviewPanel
              files={selectedFiles}
              onRemoveFile={handleRemoveFile}
              onAddMoreFiles={handleAddMoreFiles}
              isVisible={selectedFiles.length > 0}
              maxUploadSize={maxUploadSize}
              selectedFilesSize={selectedFilesSize}
            />

            {/* Transfer Options Panel */}
            <TransferOptionsPanel
              isVisible={showOptions}
              hasFilesSelected={selectedFiles.length > 0}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
