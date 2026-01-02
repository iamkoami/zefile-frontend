'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface GlobalDragDropOverlayProps {
  onFilesDropped: (files: File[]) => void;
}

const GlobalDragDropOverlay: React.FC<GlobalDragDropOverlayProps> = ({ onFilesDropped }) => {
  const t = useTranslations('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setDragCounter(prev => prev + 1);
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setDragCounter(prev => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);
      setDragCounter(0);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        onFilesDropped(fileArray);
      }
    };

    // Attach event listeners to document
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [onFilesDropped]);

  if (!isDragging) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(135, 230, 75, 0.95)', // Primary color #87E64B with opacity
        animation: 'fadeIn 0.2s ease-in-out'
      }}
    >
      <div className="text-center px-8" style={{ color: '#171717' }}> {/* Secondary color */}
        <h1 className="font-bold mb-4" style={{ fontSize: '44px' }}>
          {t('dropItLikeItsHot')}
        </h1>
        <p className="font-medium" style={{ fontSize: '16px' }}>
          {t('uploadFilesOrFolders')}
        </p>
      </div>
    </div>
  );
};

export default GlobalDragDropOverlay;
