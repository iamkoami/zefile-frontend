"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { SenderBrandingDto } from "@/services/transfer-api";

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
  /** true if ANY branding source is active (cookie or API) */
  isBranded: boolean;
  /** The active branding config from whichever source won */
  activeBranding: BrandingConfig | null;
  /** Which source provided the branding */
  brandingSource: "cookie" | "api" | null;
  /** @deprecated Use isBranded + activeBranding instead */
  isCustomDomain: boolean;
  /** @deprecated Use activeBranding instead */
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
  value: string | null | undefined,
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
 * Convert API SenderBrandingDto to BrandingConfig.
 * Sanitizes all values the same way as the cookie path.
 */
function apiToBrandingConfig(
  sender: SenderBrandingDto,
): BrandingConfig | null {
  // Need at least a company name or colors to be useful
  if (
    !sender.companyName &&
    !sender.primaryColor &&
    !sender.logoUrl
  ) {
    return null;
  }

  return {
    companyName: sender.companyName
      ? sanitizeCompanyName(sender.companyName)
      : "",
    primaryColor: sanitizeColor(sender.primaryColor, "#5E53E0"),
    backgroundColor: sanitizeColor(sender.backgroundColor, "#FFFFFF"),
    textColor: sanitizeColor(sender.textColor, "#171717"),
    buttonTextColor: sanitizeColor(sender.buttonTextColor, "#171717"),
    showPoweredByZefile: sender.showPoweredByZefile !== false,
    logoUrl: sanitizeUrl(sender.logoUrl),
    faviconUrl: sanitizeUrl(sender.faviconUrl),
    domain: "",
  };
}

/**
 * Unified branding hook supporting both cookie-based (custom domain) and
 * API-based (senderBranding from transfer response) branding sources.
 *
 * Priority: cookie > API > no branding
 *
 * @param senderBranding Optional API branding from GET /transfers/code/:shortCode
 */
export function useCustomBranding(
  senderBranding?: SenderBrandingDto | null,
): CustomBrandingResult {
  const [cookieBranding, setCookieBranding] = useState<BrandingConfig | null>(
    null,
  );
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
    setCookieBranding(config);
  }, [parseBrandingCookie]);

  // Resolve active branding: cookie wins over API (memoized to avoid useEffect churn)
  const activeBranding = useMemo(
    () =>
      cookieBranding ??
      (senderBranding ? apiToBrandingConfig(senderBranding) : null),
    [cookieBranding, senderBranding],
  );
  const brandingSource: "cookie" | "api" | null = cookieBranding
    ? "cookie"
    : activeBranding
      ? "api"
      : null;

  // Apply CSS custom properties and page metadata when branding is active
  useEffect(() => {
    if (!activeBranding) return;

    // Set CSS custom properties on :root (already validated as hex)
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", activeBranding.primaryColor);
    if (activeBranding.backgroundColor) {
      root.style.setProperty("--brand-bg", activeBranding.backgroundColor);
    }
    if (activeBranding.textColor) {
      root.style.setProperty("--brand-text", activeBranding.textColor);
    }
    if (activeBranding.buttonTextColor) {
      root.style.setProperty(
        "--brand-button-text",
        activeBranding.buttonTextColor,
      );
    }

    // Save original favicon for cleanup
    const existingFavicon = document.querySelector(
      'link[rel="icon"]',
    ) as HTMLLinkElement | null;
    if (!originalFaviconRef.current && existingFavicon) {
      originalFaviconRef.current = existingFavicon.href;
    }

    // Set favicon dynamically (URL already validated)
    if (activeBranding.faviconUrl) {
      let link = existingFavicon;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = activeBranding.faviconUrl;
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
  }, [activeBranding]);

  return {
    isBranded: activeBranding !== null,
    activeBranding,
    brandingSource,
    // Backward compat
    isCustomDomain: cookieBranding !== null,
    branding: activeBranding,
  };
}

export default useCustomBranding;
