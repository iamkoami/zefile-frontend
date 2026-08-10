"use client";
export const runtime = "edge";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toIntlLocale } from "@/lib/locale";
import {
  fileRequestApi,
  PublicFileRequestDto,
} from "@/services/file-request-api";
import { authApi } from "@/services/auth-api";
import LoadingPanel from "@/components/LoadingPanel";
import { toast } from "@/components/shared/Toast";
import ToastContainer from "@/components/shared/Toast";

export default function DeliverPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const t = useTranslations("fileRequests");
  const locale = useLocale();
  const [request, setRequest] = useState<PublicFileRequestDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = authApi.getStoredUser();
    setIsAuthenticated(!!user);

    const handleAuthChange = () => {
      setIsAuthenticated(!!authApi.getStoredUser());
    };
    window.addEventListener("auth-state-change", handleAuthChange);
    return () =>
      window.removeEventListener("auth-state-change", handleAuthChange);
  }, []);

  useEffect(() => {
    async function fetchRequest() {
      if (!shortCode) return;
      setIsLoading(true);
      try {
        const response = await fileRequestApi.getPublicRequest(shortCode);
        if (response.error) {
          setError(t("requestNotFound"));
          return;
        }
        if (response.data) {
          setRequest(response.data);
        }
      } catch {
        setError(t("networkError"));
      } finally {
        setIsLoading(false);
      }
    }
    fetchRequest();
  }, [shortCode, t]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      }
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles((prev) => [
        ...prev,
        ...Array.from(e.dataTransfer.files),
      ]);
    }
  }, []);

  const handleDeliver = async () => {
    if (!request) return;

    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fileRequestApi.deliver(request.id, {
        message: message.trim() || undefined,
      });
      if (response.error) {
        const errorMsg =
          typeof response.error.message === "string"
            ? response.error.message
            : t("genericError");
        toast.error(errorMsg);
        return;
      }
      setDelivered(true);
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[oklch(0.19_0_0)]">
        <LoadingPanel />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{error || t("requestNotFound")}</p>
      </div>
    );
  }

  // Story 144.15 — the app's locale, not the browser's. Symbol left as the raw currency code,
  // which is what this screen has always shown.
  const formatBudget = (amount: number, curr: string) => {
    return `${amount.toLocaleString(toIntlLocale(locale))} ${curr}`;
  };

  const renderContent = () => {
    switch (request.status) {
      case "pending_payment":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("requestPendingPayment")}</p>
          </div>
        );
      case "funded":
      case "revision_requested":
        return (
          <div className="space-y-6">
            {request.status === "revision_requested" && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded p-4">
                <p className="font-bold text-amber-800 dark:text-amber-200 mb-1">
                  {t("revisionRequested")}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t("revisionFeedbackHint")}
                </p>
              </div>
            )}

            {/* File upload area */}
            <div
              className="border-2 border-dashed border-gray-300 dark:border-[oklch(0.30_0_0)] rounded p-8 text-center cursor-pointer hover:border-[#5E53E0] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <p className="text-gray-500 dark:text-[oklch(0.65_0_0)] mb-2">{t("dropFilesHere")}</p>
              <p className="text-sm text-gray-400 dark:text-[oklch(0.50_0_0)]">{t("orClickToSelect")}</p>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between bg-gray-50 dark:bg-[oklch(0.24_0_0)] rounded px-3 py-2"
                  >
                    <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-red-500 dark:hover:text-red-400 ml-2 text-sm"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Message */}
            <div>
              <label
                htmlFor="deliver-message"
                className="block text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1"
              >
                {t("deliverMessage")}
              </label>
              <textarea
                id="deliver-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("deliverMessagePlaceholder")}
                maxLength={2000}
                rows={3}
                className="w-full border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-3 py-2 text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] bg-white dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:outline-none focus:ring-2 focus:ring-[#5E53E0]/30 resize-y"
              />
            </div>

            {!isAuthenticated && (
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
                {t("loginToDeliver")}
              </p>
            )}

            <button
              onClick={handleDeliver}
              disabled={isSubmitting || selectedFiles.length === 0}
              className="w-full bg-[#87E64B] text-[#171717] py-3 rounded font-bold hover:bg-[#78d43f] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t("submitting") : t("submitDelivery")}
            </button>
          </div>
        );
      case "delivered":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("alreadyDelivered")}</p>
          </div>
        );
      case "approved":
      case "completed":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("requestCompleted")}</p>
          </div>
        );
      case "expired":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("requestExpired")}</p>
          </div>
        );
      case "refunded":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("requestRefunded")}</p>
          </div>
        );
      case "cancelled":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("requestCancelled")}</p>
          </div>
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("requestInactive")}</p>
          </div>
        );
    }
  };

  if (delivered) {
    return (
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)] flex items-center justify-center">
        <ToastContainer />
        <div className="max-w-lg mx-auto px-6 text-center">
          <h1 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
            {t("deliverySubmitted")}
          </h1>
          <p className="text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("deliverySubmittedDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
      <ToastContainer />
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
          {t("deliverTitle")}
        </h1>
        <p className="text-gray-500 dark:text-[oklch(0.65_0_0)] mb-8">{t("deliverDesc")}</p>

        {/* Request details */}
        <div className="bg-gray-50 dark:bg-[oklch(0.24_0_0)] rounded p-4 mb-8 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("formTitle")}</span>
            <span className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {request.title}
            </span>
          </div>
          {request.description && (
            <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">{request.description}</p>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">{t("formBudget")}</span>
            <span className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {formatBudget(request.budgetMinorUnits, request.currency)}
            </span>
          </div>
          {request.deadline && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
                {t("formDeadline")}
              </span>
              <span className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                {new Date(request.deadline).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
