"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RefreshDouble } from "iconoir-react";
import Header from "@/components/shared/Header";
import { captureException } from "@/lib/sentry";

/**
 * Custom Error Page (500/505)
 *
 * Handles server errors with playful, creative messaging
 * matching the style of the 404 page.
 */

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("serverError");

  useEffect(() => {
    captureException(error, { digest: error.digest, boundary: 'route-error' });
  }, [error]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main
        className="flex flex-col items-center justify-center px-4"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        {/* Error Code Display */}
        <div className="mb-8 flex items-center justify-center">
          <div className="relative">
            <span className="text-[180px] font-bold text-gray-100 select-none">
              500
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-[#87E64B]/20 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 bg-[#87E64B]/40 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-[#87E64B] rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-[#171717] mb-3 text-center">
          {t("title")}
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 mb-8 text-center max-w-md leading-relaxed">
          {t("subtitle")}
        </p>

        {/* Primary CTA - Try Again */}
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
        >
          <RefreshDouble className="w-5 h-5" />
          {t("tryAgain")}
        </button>
      </main>
    </div>
  );
}
