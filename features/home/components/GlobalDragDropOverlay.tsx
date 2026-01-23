"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";

interface GlobalDragDropOverlayProps {
  onFilesDropped: (files: File[]) => void;
}

const GlobalDragDropOverlay: React.FC<GlobalDragDropOverlayProps> = ({
  onFilesDropped,
}) => {
  const t = useTranslations("upload");
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if the drag event contains files
  const containsFiles = useCallback((e: DragEvent): boolean => {
    if (e.dataTransfer?.types) {
      for (let i = 0; i < e.dataTransfer.types.length; i++) {
        if (e.dataTransfer.types[i] === "Files") {
          return true;
        }
      }
    }
    return false;
  }, []);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only show overlay for file drags
      if (!containsFiles(e)) return;

      dragCounterRef.current++;

      // Clear any pending hide timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (dragCounterRef.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current--;

      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        // Small delay to prevent flicker when moving between elements
        timeoutRef.current = setTimeout(() => {
          setIsDragging(false);
        }, 50);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Reset state
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        onFilesDropped(fileArray);
      }
    };

    // Reset drag state when window loses focus (user dragged outside)
    const handleWindowBlur = () => {
      dragCounterRef.current = 0;
      setIsDragging(false);
    };

    // Attach event listeners to document
    document.addEventListener("dragenter", handleDragEnter, true);
    document.addEventListener("dragleave", handleDragLeave, true);
    document.addEventListener("dragover", handleDragOver, true);
    document.addEventListener("drop", handleDrop, true);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter, true);
      document.removeEventListener("dragleave", handleDragLeave, true);
      document.removeEventListener("dragover", handleDragOver, true);
      document.removeEventListener("drop", handleDrop, true);
      window.removeEventListener("blur", handleWindowBlur);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onFilesDropped, containsFiles]);

  if (!isDragging) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-auto"
      style={{
        backgroundColor: "rgba(135, 230, 75, 0.95)",
        zIndex: 99999,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const fileArray = Array.from(files);
          onFilesDropped(fileArray);
        }
      }}
      onDragLeave={(e) => {
        // Only hide if leaving the overlay itself (not a child element)
        if (e.currentTarget === e.target) {
          dragCounterRef.current = 0;
          setIsDragging(false);
        }
      }}
    >
      <div className="text-center px-8 pointer-events-none" style={{ color: "#171717" }}>
        <h1 className="font-bold mb-4" style={{ fontSize: "33px" }}>
          {t("dropItLikeItsHot")}
        </h1>
        <p className="font-medium" style={{ fontSize: "16px" }}>
          {t("uploadFilesOrFolders")}
        </p>
      </div>
    </div>
  );
};

export default GlobalDragDropOverlay;
