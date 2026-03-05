"use client";
export const runtime = "edge";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  fileRequestApi,
  FileRequestDto,
} from "@/services/file-request-api";
import { authApi } from "@/services/auth-api";
import LoadingPanel from "@/components/LoadingPanel";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { toast } from "@/components/shared/Toast";
import ToastContainer from "@/components/shared/Toast";

export default function ReviewPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const t = useTranslations("fileRequests");
  const [request, setRequest] = useState<FileRequestDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const user = authApi.getStoredUser();
    setIsAuthenticated(!!user);

    if (!shortCode) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function fetchRequest() {
      setIsLoading(true);
      try {
        // Fetch from client/mine and find by shortCode
        const response = await fileRequestApi.getMyRequests(1, 100);
        if (response.data) {
          const found = response.data.data.find(
            (r) => r.shortCode === shortCode
          );
          if (found) {
            setRequest(found);
          } else {
            setError(t("notAvailableForReview"));
          }
        }
      } catch {
        setError(t("networkError"));
      } finally {
        setIsLoading(false);
      }
    }
    fetchRequest();
  }, [shortCode, t]);

  const handleApprove = useCallback(async () => {
    if (!request) return;
    setIsApproving(true);
    try {
      const response = await fileRequestApi.approve(request.id);
      if (response.error) {
        const errorMsg =
          typeof response.error.message === "string"
            ? response.error.message
            : t("genericError");
        toast.error(errorMsg);
        return;
      }
      if (response.data) {
        setRequest(response.data);
      }
      setShowApproveConfirm(false);
      toast.success(t("deliveryApproved"));
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsApproving(false);
    }
  }, [request, t]);

  const handleRequestRevision = useCallback(async () => {
    if (!request || feedback.length < 10) return;
    setIsSubmittingRevision(true);
    try {
      const response = await fileRequestApi.requestRevision(request.id, {
        feedback,
      });
      if (response.error) {
        const errorMsg =
          typeof response.error.message === "string"
            ? response.error.message
            : t("genericError");
        toast.error(errorMsg);
        return;
      }
      if (response.data) {
        setRequest(response.data);
      }
      setShowRevisionForm(false);
      setFeedback("");
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsSubmittingRevision(false);
    }
  }, [request, feedback, t]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <LoadingPanel />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <ToastContainer />
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t("pleaseLogIn")}</p>
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-auth-modal"))
            }
            className="bg-[#87E64B] text-[#171717] px-6 py-2 rounded font-semibold hover:bg-[#78d43f] transition-colors"
          >
            {t("loginCta")}
          </button>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <ToastContainer />
        <p className="text-gray-500">{error || t("notAvailableForReview")}</p>
      </div>
    );
  }

  const revisionsRemaining =
    (request.maxRevisions ?? 0) - (request.revisionCount ?? 0);
  const canRevise = revisionsRemaining > 0;

  const renderContent = () => {
    switch (request.status) {
      case "delivered":
        return (
          <div className="space-y-6">
            {/* Delivery info */}
            {request.deliveries && request.deliveries.length > 0 && (
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm font-medium text-[#171717] mb-1">
                  {t("latestDelivery")}
                </p>
                {request.deliveries[request.deliveries.length - 1]
                  .message && (
                  <p className="text-sm text-gray-600">
                    {
                      request.deliveries[request.deliveries.length - 1]
                        .message
                    }
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="flex-1 bg-[#87E64B] text-[#171717] py-3 rounded font-semibold hover:bg-[#78d43f] transition-colors"
              >
                {t("approveDelivery")}
              </button>
              <button
                onClick={() => setShowRevisionForm(!showRevisionForm)}
                disabled={!canRevise}
                className="flex-1 border border-gray-300 text-[#171717] py-3 rounded font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {canRevise ? t("requestRevision") : t("noRevisionsLeft")}
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center">
              {t("revisionsUsed", {
                used: request.revisionCount,
                max: request.maxRevisions,
              })}
            </p>

            {/* Revision feedback form */}
            {showRevisionForm && (
              <div className="mt-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t("revisionFeedbackPlaceholder")}
                  className="w-full border border-gray-200 rounded p-3 min-h-[100px] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#5E53E0]/30"
                  maxLength={2000}
                />
                <div className="flex items-center justify-end mt-3">
                  <button
                    onClick={handleRequestRevision}
                    disabled={
                      feedback.length < 10 || isSubmittingRevision
                    }
                    className="bg-[#87E64B] text-[#171717] px-6 py-2 rounded font-semibold hover:bg-[#78d43f] transition-colors disabled:opacity-50"
                  >
                    {isSubmittingRevision
                      ? t("submitting")
                      : t("submitRevision")}
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case "pending_payment":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("requestPendingPayment")}</p>
          </div>
        );

      case "funded":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("waitingForDelivery")}</p>
          </div>
        );

      case "revision_requested":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("waitingForUpdate")}</p>
          </div>
        );

      case "approved":
      case "completed":
        return (
          <div className="text-center py-8 space-y-4">
            <p className="text-gray-500">{t("requestCompleted")}</p>
            <p className="text-sm text-gray-400">
              {t("downloadAvailableSoon")}
            </p>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("requestExpired")}</p>
          </div>
        );

      case "refunded":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("requestRefunded")}</p>
          </div>
        );

      case "cancelled":
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("requestCancelled")}</p>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">{t("notAvailableForReview")}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-[#171717] mb-2">
          {t("reviewTitle")}
        </h1>

        {/* Request details */}
        <div className="bg-gray-50 rounded p-4 mb-8 space-y-2">
          <h2 className="font-semibold text-[#171717]">{request.title}</h2>
          {request.description && (
            <p className="text-sm text-gray-600">{request.description}</p>
          )}
          <div className="flex gap-4 text-sm text-gray-500">
            <span>
              {request.budgetMinorUnits.toLocaleString()} {request.currency}
            </span>
            {request.deadline && (
              <span>
                {new Date(request.deadline).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {renderContent()}
      </div>

      <ConfirmationModal
        isOpen={showApproveConfirm}
        type="warning"
        title={t("approveConfirmTitle")}
        message={t("approveConfirmMessage")}
        confirmLabel={t("approveConfirmButton")}
        isLoading={isApproving}
        onConfirm={handleApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />
    </div>
  );
}
