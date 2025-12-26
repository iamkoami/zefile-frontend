'use client';

import { useState } from 'react';
import { TransferEntity, TrackingParams } from '../../domain/entities/transfer.entity';
import { storageApi } from '@/services/storage-api';

interface DownloadPageProps {
  transfer: TransferEntity | null;
  trackingParams: TrackingParams;
  passwordRequired: boolean;
  onPasswordSubmit: (password: string) => void;
  error: string | null;
}

export function DownloadPage({
  transfer,
  trackingParams,
  passwordRequired,
  onPasswordSubmit,
  error,
}: DownloadPageProps) {
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onPasswordSubmit(password);
    }
  };

  const handleDownload = async (fileId?: string) => {
    if (!transfer) return;

    try {
      setDownloading(true);

      const response = await storageApi.getDownloadUrl({
        shortCode: transfer.shortCode,
        fileIds: fileId ? [fileId] : undefined,
        password: password || undefined,
      });

      if (response.error) {
        alert(response.error.message || 'Failed to generate download link');
        return;
      }

      if (response.data?.urls) {
        // Download all files
        for (const file of response.data.urls) {
          window.open(file.url, '_blank');
        }
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download files');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!transfer) return;

    try {
      setDownloading(true);

      const response = await storageApi.getZipDownloadUrl({
        shortCode: transfer.shortCode,
        password: password || undefined,
      });

      if (response.error) {
        alert(response.error.message || 'Failed to generate ZIP download');
        return;
      }

      if (response.data?.zipUrl) {
        window.open(response.data.zipUrl, '_blank');
      }
    } catch (err: any) {
      console.error('ZIP download error:', err);
      alert(err.message || 'Failed to download ZIP');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Password form
  if (passwordRequired && !transfer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <svg
              className="w-16 h-16 text-blue-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Protected</h1>
            <p className="text-gray-600">This transfer requires a password to access</p>
            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Enter Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Unlock Transfer
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main download page
  if (!transfer) {
    return null;
  }

  const totalSize = transfer.files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <svg
              className="w-20 h-20 text-blue-600 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Files Ready for Download</h1>
            <p className="text-gray-600">
              From: <span className="font-medium">{transfer.senderEmail}</span>
            </p>
          </div>

          {transfer.message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900">{transfer.message}</p>
            </div>
          )}

          {/* Transfer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Files</p>
              <p className="text-2xl font-bold text-gray-900">{transfer.files.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Expires</p>
              <p className="text-lg font-bold text-gray-900">{formatDate(transfer.expiryDate)}</p>
            </div>
          </div>

          {/* Download All Button */}
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {downloading ? 'Preparing Download...' : 'Download All as ZIP'}
          </button>
        </div>

        {/* File List */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Files ({transfer.files.length})</h2>

          <div className="space-y-3">
            {transfer.files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <svg
                    className="w-10 h-10 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.filename}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(file.id)}
                  disabled={downloading}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Short code: {transfer.shortCode}</p>
          {transfer.maxDownloads && (
            <p className="mt-1">
              Downloads: {transfer.downloadCount} / {transfer.maxDownloads}
            </p>
          )}
          {trackingParams.z_sid && (
            <p className="mt-1 text-xs">Session ID: {trackingParams.z_sid}</p>
          )}
        </div>
      </div>
    </div>
  );
}
