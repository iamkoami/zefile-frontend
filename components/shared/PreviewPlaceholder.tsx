"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type PreviewPlaceholderStatus = "pending" | "failed" | "skipped";

type AspectRatio = "video" | "image" | "pdf" | "square";

interface PreviewPlaceholderProps {
  status: PreviewPlaceholderStatus;
  /**
   * Hint for aspect ratio. Defaults:
   *   video → 16:9
   *   image → 1:1
   *   pdf   → 4:3
   *   square → 1:1 (generic fallback)
   */
  aspect?: AspectRatio;
  className?: string;
}

const ASPECT_CLASS: Record<AspectRatio, string> = {
  video: "aspect-video",
  image: "aspect-square",
  pdf: "aspect-[4/3]",
  square: "aspect-square",
};

const SLOW_THRESHOLD_MS = 3 * 60 * 1000;

const PreviewPlaceholder: React.FC<PreviewPlaceholderProps> = ({
  status,
  aspect = "video",
  className = "",
}) => {
  const t = useTranslations("previewPlaceholder");
  const mountedAtRef = useRef<number>(Date.now());
  const [isSlow, setIsSlow] = useState<boolean>(
    status === "pending" && Date.now() - mountedAtRef.current > SLOW_THRESHOLD_MS,
  );

  useEffect(() => {
    if (status !== "pending") return;
    const elapsed = Date.now() - mountedAtRef.current;
    if (elapsed >= SLOW_THRESHOLD_MS) {
      setIsSlow(true);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS - elapsed);
    return () => clearTimeout(timer);
  }, [status]);

  const caption =
    status === "pending"
      ? isSlow
        ? t("pendingSlow")
        : t("pendingFresh")
      : t("unavailable");

  return (
    <div
      className={`relative w-full ${ASPECT_CLASS[aspect]} overflow-hidden rounded bg-[#FDFAF4] dark:bg-[#1A1A1A] ${className}`}
      role="status"
      aria-live="polite"
      aria-label={caption}
      data-testid="preview-placeholder"
      data-status={status}
    >
      {status === "pending" && (
        <div
          className="absolute inset-0 animate-shimmer"
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <p className="text-center text-xs text-[#171717] dark:text-[#E5E5E5] sm:text-sm">
          {caption}
        </p>
      </div>
    </div>
  );
};

export default PreviewPlaceholder;
