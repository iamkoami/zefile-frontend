"use client";

import React, { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toIntlLocale } from "@/lib/locale";
import { CheckCircle } from "iconoir-react";
import type { FileRequestDto } from "@/services/file-request-api";
import { fileRequestApi } from "@/services/file-request-api";
import { formatCurrencyAmount, type CurrencyCode } from "@/lib/currency";
import { toast } from "@/components/shared/Toast";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { useDrawerStore } from "@/stores/drawer-store";

interface RequestReviewPanelProps {
  request: FileRequestDto & { _role?: "client" | "creative" };
}

const RequestReviewPanel: React.FC<RequestReviewPanelProps> = ({
  request: initialRequest,
}) => {
  const t = useTranslations("fileRequests");
  const locale = useLocale();
  const [request, setRequest] = useState(initialRequest);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const { setSelectedFileRequest } = useDrawerStore();

  const budgetMajor = request.budgetMinorUnits / 100;
  const formattedBudget = formatCurrencyAmount(
    budgetMajor,
    request.currency as CurrencyCode,
    locale,
  );
  const revisionsRemaining =
    (request.maxRevisions ?? 0) - (request.revisionCount ?? 0);
  const canRevise = revisionsRemaining > 0;

  const latestDelivery =
    request.deliveries && request.deliveries.length > 0
      ? request.deliveries[request.deliveries.length - 1]
      : null;

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString(toIntlLocale(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const updateRequest = (updated: FileRequestDto) => {
    setRequest(updated);
    // Also update the drawer store so RequestDetailsPanel reflects changes on back
    setSelectedFileRequest({ ...updated, _role: initialRequest._role });
  };

  const handleApprove = useCallback(async () => {
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
        updateRequest(response.data);
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
    if (feedback.length < 10) return;
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
        updateRequest(response.data);
      }
      setShowRevisionForm(false);
      setFeedback("");
      toast.success(t("revisionRequested"));
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsSubmittingRevision(false);
    }
  }, [request, feedback, t]);

  const renderStatusContent = () => {
    switch (request.status) {
      case "delivered":
        return (
          <div className="space-y-6">
            {/* Latest delivery */}
            {latestDelivery && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-[#171717]">
                    {t("latestDelivery")} #{latestDelivery.deliveryNumber}
                  </p>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(latestDelivery.createdAt)}
                  </span>
                </div>
                {latestDelivery.message && (
                  <p className="text-sm text-gray-600">
                    {latestDelivery.message}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveConfirm(true)}
                className="flex-1 bg-[#87E64B] text-[#171717] py-3 rounded font-bold hover:bg-[#78d43f] transition-colors"
              >
                {t("approveDelivery")}
              </button>
              <button
                onClick={() => setShowRevisionForm(!showRevisionForm)}
                disabled={!canRevise}
                className="flex-1 border border-gray-200 text-[#171717] py-3 rounded font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {canRevise ? t("requestRevision") : t("noRevisionsLeft")}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              {t("revisionsUsed", {
                used: request.revisionCount,
                max: request.maxRevisions,
              })}
            </p>

            {/* Revision feedback form */}
            {showRevisionForm && (
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={t("revisionFeedbackPlaceholder")}
                  className="w-full border border-gray-200 rounded-lg p-3 min-h-[100px] text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#5E53E0]/30"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {feedback.length}/2000
                  </span>
                  <button
                    onClick={handleRequestRevision}
                    disabled={feedback.length < 10 || isSubmittingRevision}
                    className="bg-[#87E64B] text-[#171717] px-6 py-2 rounded font-bold hover:bg-[#78d43f] transition-colors disabled:opacity-50 text-sm"
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
            <p className="text-sm text-gray-500">
              {t("requestPendingPayment")}
            </p>
          </div>
        );

      case "funded":
        return (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t("waitingForDelivery")}</p>
          </div>
        );

      case "revision_requested":
        return (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t("waitingForUpdate")}</p>
          </div>
        );

      case "approved":
      case "completed":
        return (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-10 h-10 text-[#87E64B] mx-auto" />
            <p className="text-sm text-gray-500">{t("requestCompleted")}</p>
          </div>
        );

      case "expired":
        return (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t("requestExpired")}</p>
          </div>
        );

      case "refunded":
        return (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t("requestRefunded")}</p>
          </div>
        );

      case "cancelled":
        return (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t("requestCancelled")}</p>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              {t("notAvailableForReview")}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="w-full mt-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-[#171717] mb-6">
        {t("reviewTitle")}
      </h1>

      {/* Request summary card */}
      <div className="bg-[#FDF8F0] rounded-xl p-6 mb-6">
        <h2 className="font-bold text-[#171717] mb-1">{request.title}</h2>
        {request.description && (
          <p className="text-sm text-gray-600 mb-3">{request.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm">
          <span className="font-bold text-[#171717]">{formattedBudget}</span>
          {request.deadline && (
            <span className="text-gray-500">
              {new Date(request.deadline).toLocaleDateString(toIntlLocale(locale), {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Status-specific content */}
      {renderStatusContent()}

      {/* Approve confirmation modal */}
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
};

export default RequestReviewPanel;
