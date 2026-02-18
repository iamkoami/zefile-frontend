"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { BrandingConfig } from "@/hooks/useCustomBranding";

interface BrandedHeaderProps {
  branding: BrandingConfig;
}

/**
 * Simplified branded header for custom domain download pages.
 * Replaces the standard Header when a custom domain is active.
 * Shows company logo + name, no navigation or auth controls.
 */
export default function BrandedHeader({ branding }: BrandedHeaderProps) {
  return (
    <header
      className="ze-header"
      style={{
        backgroundColor: branding.backgroundColor || "#FFFFFF",
      }}
    >
      <div className="ze-header-container flex items-center justify-between px-6 py-3">
        {/* Left: Company branding */}
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <Image
              src={branding.logoUrl}
              alt={branding.companyName}
              width={120}
              height={33}
              className="w-[90px] h-auto lg:w-[120px] object-contain"
              unoptimized
            />
          ) : (
            <span
              className="text-lg font-bold"
              style={{ color: branding.textColor || "#171717" }}
            >
              {branding.companyName}
            </span>
          )}
          {branding.logoUrl && (
            <span
              className="text-sm font-semibold hidden sm:inline"
              style={{ color: branding.textColor || "#171717" }}
            >
              {branding.companyName}
            </span>
          )}
        </div>

        {/* Right: Powered by ZeFile (if enabled) */}
        {branding.showPoweredByZefile && (
          <Link
            href="https://zefile.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-500 transition-colors"
          >
            <span>Powered by</span>
            <Image
              src="/zefile-logo.svg"
              alt="ZeFile"
              width={50}
              height={14}
              className="opacity-60"
            />
          </Link>
        )}
      </div>
    </header>
  );
}
