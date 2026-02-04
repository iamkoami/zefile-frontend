"use client";

export const runtime = "edge";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { SendDiagonal } from "iconoir-react";
import Header from "@/components/shared/Header";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import error404Animation from "@/public/lotties/error-404.json";

/**
 * Custom 404 Not Found Page
 *
 * Handles three scenarios with playful, creative messaging:
 * 1. General 404 - Page not found
 * 2. Transfer not found - Invalid or deleted transfer link
 * 3. Transfer expired - Link past expiry date
 *
 * Also handles client-side routing for dynamic routes in static export.
 */

type NotFoundType = "general" | "transfer-not-found" | "transfer-expired";

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("notFound");
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [notFoundType, setNotFoundType] = useState<NotFoundType>("general");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Show loading state briefly while page assets load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = window.location.search;
    const urlParams = new URLSearchParams(searchParams);

    // Check for explicit error type from query params
    const errorType = urlParams.get("error");
    if (errorType === "expired") {
      setNotFoundType("transfer-expired");
      return;
    }
    if (errorType === "not-found") {
      setNotFoundType("transfer-not-found");
      return;
    }

    // Handle /z-{code} short links - redirect to /downloads?code={code}
    if (pathname?.startsWith("/z-")) {
      setIsRedirecting(true);
      const shortCode = pathname.replace("/z-", "");
      router.replace(`/downloads?code=${shortCode}${searchParams}`);
      return;
    }

    // Handle /downloads/{code} - redirect to /downloads?code={code}
    if (pathname?.startsWith("/downloads/")) {
      setIsRedirecting(true);
      const shortCode = pathname.replace("/downloads/", "");
      router.replace(
        `/downloads?code=${shortCode}${searchParams ? "&" + searchParams.substring(1) : ""}`,
      );
      return;
    }

    // Check if this is a transfer-related URL for context-aware messaging
    if (pathname?.includes("transfer") || pathname?.includes("download")) {
      setNotFoundType("transfer-not-found");
    }
  }, [pathname, router]);

  // Show loading state while page assets load
  if (isLoading) {
    return <LoadingFullscreen />;
  }

  // Show nothing while redirecting
  if (isRedirecting) {
    return null;
  }

  const getContent = () => {
    switch (notFoundType) {
      case "transfer-expired":
        return {
          title: t("transferExpiredTitle"),
          subtitle: t("transferExpiredSubtitle"),
          cta: t("createNew"),
        };
      case "transfer-not-found":
        return {
          title: t("transferNotFoundTitle"),
          subtitle: t("transferNotFoundSubtitle"),
          cta: t("startTransfer"),
        };
      default:
        return {
          title: t("generalTitle"),
          subtitle: t("generalSubtitle"),
          cta: t("startTransfer"),
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main
        className="flex flex-col items-center justify-center px-4"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        {/* Lottie Animation - 4 0 4 with hot air balloon */}
        <div className="mb-8">
          <Lottie
            lottieRef={lottieRef}
            animationData={error404Animation}
            loop={true}
            autoplay={true}
            style={{ width: 500, height: 380 }}
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#171717] mb-3 text-center">
          {content.title}
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 mb-8 text-center max-w-md leading-relaxed">
          {content.subtitle}
        </p>

        {/* Primary CTA - Start new transfer */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
        >
          <SendDiagonal className="w-5 h-5" />
          {content.cta}
        </Link>

        {/* Secondary link */}
        <div className="mt-4">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-[#5E53E0] transition-colors"
          >
            {t("goHome")}
          </Link>
        </div>
      </main>
    </div>
  );
}
