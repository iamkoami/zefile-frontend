"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Branding configuration set by the Cloudflare Worker
 * via the __zefile_branding cookie (base64-encoded JSON)
 */
export interface BrandingConfig {
  companyName: string;
  primaryColor: string;
  backgroundColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  showPoweredByZefile: boolean;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  domain: string;
}

export interface CustomBrandingResult {
  isCustomDomain: boolean;
  branding: BrandingConfig | null;
}

const COOKIE_NAME = "__zefile_branding";

/** Strict hex color regex: #RGB or #RRGGBB */
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Allowed URL protocols for logo/favicon */
const ALLOWED_URL_PROTOCOLS = ["https:"];

/** Backend API domain for presigned URLs */
const API_DOMAIN = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).hostname
  : "api.zefile.io";

/** Allowed domains for logo/favicon URLs (presigned S3 URLs come from backend or Wasabi) */
const ALLOWED_URL_DOMAINS = [
  API_DOMAIN,
  "s3.eu-central-1.wasabisys.com",
  "s3.wasabisys.com",
];

/**
 * Validate a hex color value. Returns the value if valid, fallback otherwise.
 */
function sanitizeColor(
  value: string | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  return HEX_COLOR_RE.test(value) ? value : fallback;
}

/**
 * Validate a URL to prevent injection. Only allows HTTPS from known domains.
 */
function sanitizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      !ALLOWED_URL_PROTOCOLS.includes(url.protocol) ||
      !ALLOWED_URL_DOMAINS.some(
        (d) => url.hostname === d || url.hostname.endsWith(`.${d}`),
      )
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/**
 * Sanitize company name — strip HTML tags and limit length
 */
function sanitizeCompanyName(name: string): string {
  // Strip any HTML tags
  const clean = name.replace(/<[^>]*>/g, "").trim();
  // Limit to 100 characters
  return clean.substring(0, 100);
}

/**
 * Read and parse the __zefile_branding cookie set by the custom domain Worker.
 * Returns { isCustomDomain: false } when no cookie is present (standard zefile.io).
 *
 * All values from the cookie are validated/sanitized to prevent:
 * - CSS injection via color values
 * - URL injection via logo/favicon URLs
 * - HTML injection via company name
 */
export function useCustomBranding(): CustomBrandingResult {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const originalFaviconRef = useRef<string | null>(null);

  const parseBrandingCookie = useCallback((): BrandingConfig | null => {
    if (typeof document === "undefined") return null;

    try {
      const cookies = document.cookie.split(";");
      const brandingCookie = cookies
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${COOKIE_NAME}=`));

      if (!brandingCookie) return null;

      const value = brandingCookie.substring(COOKIE_NAME.length + 1);
      const decoded = atob(decodeURIComponent(value));
      const config = JSON.parse(decoded) as BrandingConfig;

      // Validate required fields
      if (!config.companyName || !config.domain) return null;

      // Sanitize all values
      return {
        companyName: sanitizeCompanyName(config.companyName),
        primaryColor: sanitizeColor(config.primaryColor, "#5E53E0"),
        backgroundColor: sanitizeColor(config.backgroundColor, "#FFFFFF"),
        textColor: sanitizeColor(config.textColor, "#171717"),
        buttonTextColor: sanitizeColor(config.buttonTextColor, "#171717"),
        showPoweredByZefile: config.showPoweredByZefile !== false,
        logoUrl: sanitizeUrl(config.logoUrl),
        faviconUrl: sanitizeUrl(config.faviconUrl),
        domain: config.domain,
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const config = parseBrandingCookie();
    setBranding(config);
  }, [parseBrandingCookie]);

  // Apply CSS custom properties and page metadata when branding is active
  useEffect(() => {
    if (!branding) return;

    // Set CSS custom properties on :root (already validated as hex)
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", branding.primaryColor);
    if (branding.backgroundColor) {
      root.style.setProperty("--brand-bg", branding.backgroundColor);
    }
    if (branding.textColor) {
      root.style.setProperty("--brand-text", branding.textColor);
    }
    if (branding.buttonTextColor) {
      root.style.setProperty("--brand-button-text", branding.buttonTextColor);
    }

    // Save original favicon for cleanup
    const existingFavicon = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;
    if (!originalFaviconRef.current && existingFavicon) {
      originalFaviconRef.current = existingFavicon.href;
    }

    // Set favicon dynamically (URL already validated)
    if (branding.faviconUrl) {
      let link = existingFavicon;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }

    return () => {
      // Cleanup CSS custom properties
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-bg");
      root.style.removeProperty("--brand-text");
      root.style.removeProperty("--brand-button-text");

      // Restore original favicon
      if (originalFaviconRef.current) {
        const link = document.querySelector(
          'link[rel="icon"]',
        ) as HTMLLinkElement | null;
        if (link) {
          link.href = originalFaviconRef.current;
        }
      }
    };
  }, [branding]);

  return {
    isCustomDomain: branding !== null,
    branding,
  };
}

export default useCustomBranding;
