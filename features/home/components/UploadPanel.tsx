'use client';

import React, { useState, useRef } from 'react';

interface UploadPanelProps {
  onShowOptions: () => void;
}

const UploadPanel: React.FC<UploadPanelProps> = ({ onShowOptions }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 w-full max-w-md">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Plus Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 border-2 border-gray-400 rounded-lg flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="mb-2">
          <p className="text-base font-semibold text-gray-900">
            Ajouter des éléments
          </p>
          <p className="text-sm text-gray-500">Jusqu'à 2GB</p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Description Text */}
      <p className="text-sm text-gray-600 mt-4 mb-6 text-center">
        Vous pouvez déposer vos fichiers ou vos dossiers ici pour les ajouter
      </p>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-700 mb-2">
            {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''}{' '}
            sélectionné{selectedFiles.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button className="flex-1 bg-green-400 hover:bg-green-500 text-white font-medium py-3 px-4 rounded transition-colors">
          Transférer
        </button>

        <button
          onClick={onShowOptions}
          className="px-4 py-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          aria-label="Options"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <circle cx="10" cy="5" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="15" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default UploadPanel;
