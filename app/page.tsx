'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/shared';
import UploadPanel, { PanelState } from '@/features/home/components/UploadPanel';
import FilePreviewPanel from '@/features/home/components/FilePreviewPanel';
import TransferOptionsPanel from '@/features/home/components/TransferOptionsPanel';
import GlobalDragDropOverlay from '@/features/home/components/GlobalDragDropOverlay';
import LoadingFullscreen from '@/components/LoadingFullscreen';
import { platformApi } from '@/services/platform-api';
import { SideDrawer } from '@/features/drawer';
import ToastContainer from '@/components/shared/Toast';
import { UploadProtectionProvider } from '@/components/providers/UploadProtectionProvider';

export default function Home() {
  const [showOptions, setShowOptions] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [maxUploadSize, setMaxUploadSize] = useState<number>(2147483648); // Default 2GB
  const [isLoading, setIsLoading] = useState(true);
  const [uploadPanelState, setUploadPanelState] = useState<PanelState>('initial');

  // Calculate total size of selected files using useMemo
  const selectedFilesSize = useMemo(() => {
    return selectedFiles.reduce((sum, file) => sum + file.size, 0);
  }, [selectedFiles]);

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
      }
    };
    fetchConfig();
    // Don't block page render - set loading to false immediately
    setIsLoading(false);
  }, []);

  const handleFilesChange = useCallback((files: File[]) => {
    setSelectedFiles(files);
  }, []);

  const handleAddMoreFiles = useCallback((newFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleToggleOptions = useCallback(() => {
    setShowOptions(prev => !prev);
  }, []);

  // Show loading screen while fetching configuration
  if (isLoading) {
    return <LoadingFullscreen />;
  }

  return (
    <UploadProtectionProvider>
      <div id="ze-home-page" className="min-h-screen bg-white">
        {/* Toast notifications */}
        <ToastContainer />

        {/* Global Drag and Drop Overlay */}
        <GlobalDragDropOverlay onFilesDropped={handleAddMoreFiles} />

        {/* Side Drawer - Transfers & Contacts */}
        <SideDrawer />

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
                onShowOptions={handleToggleOptions}
                maxUploadSize={maxUploadSize}
                selectedFilesSize={selectedFilesSize}
                onPanelStateChange={setUploadPanelState}
              />

              {/* File Preview Panel - Visible when files selected OR form is showing (for add-to-transfer case) */}
              {/* Hidden during OTP, uploading, cancel-confirm, and complete states */}
              <FilePreviewPanel
                files={selectedFiles}
                onRemoveFile={handleRemoveFile}
                onAddMoreFiles={handleAddMoreFiles}
                isVisible={(selectedFiles.length > 0 || uploadPanelState === 'form') && uploadPanelState !== 'otp' && uploadPanelState !== 'uploading' && uploadPanelState !== 'cancel-confirm' && uploadPanelState !== 'complete'}
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
    </UploadProtectionProvider>
  );
}
