"use client";

import React from "react";
import Image from "next/image";
import type { BrandingConfig } from "@/hooks/useCustomBranding";
import LanguageSwitcher from "./LanguageSwitcher";

interface BrandedHeaderProps {
  branding: BrandingConfig;
}

/**
 * Simplified branded header for custom domain download pages.
 * Replaces the standard Header when a custom domain is active.
 * Shows company logo + name + language switcher, no navigation or auth controls.
 * "Powered by ZeFile" is in the footer, not here.
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
              className="text-sm font-bold hidden sm:inline"
              style={{ color: branding.textColor || "#171717" }}
            >
              {branding.companyName}
            </span>
          )}
        </div>

        {/* Right: Language switcher */}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
