"use client";
export const runtime = "edge";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GitFork, CheckCircle, Clock } from "iconoir-react";
import {
  fileRequestApi,
  FileRequestDto,
} from "@/services/file-request-api";
import { authApi } from "@/services/auth-api";
import { formatCurrencyAmount, type CurrencyCode } from "@/lib/currency";
import { useTimeOfDay, type TimeOfDay } from "@/hooks/useTimeOfDay";
import Header from "@/components/shared/Header";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";
import HeroText from "@/components/shared/HeroText";
import PaperPlaneAnimation from "@/components/shared/PaperPlaneAnimation";
import LoadingPanel from "@/components/LoadingPanel";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { toast } from "@/components/shared/Toast";
import ToastContainer from "@/components/shared/Toast";

function ContentPanelBackground({
  timeOfDay,
  isAuthenticated,
}: {
  timeOfDay: TimeOfDay;
  isAuthenticated?: boolean;
}) {
  return (
    <>
      <TimeOfDayBackground timeOfDay={timeOfDay} />
      <HeroText
        isVisible={true}
        timeOfDay={timeOfDay}
        isAuthenticated={isAuthenticated}
      />
      <PaperPlaneAnimation isVisible={true} timeOfDay={timeOfDay} />
    </>
  );
}

export default function ReviewPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const t = useTranslations("fileRequests");
  const { timeOfDay } = useTimeOfDay();
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
        const response = await fileRequestApi.getMyRequests(1, 100);
        if (response.data) {
          const found = response.data.data.find(
            (r) => r.shortCode === shortCode,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              timeOfDay={timeOfDay}
              isAuthenticated={false}
            />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <LoadingPanel />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              timeOfDay={timeOfDay}
              isAuthenticated={false}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div className="ze-upload-panel text-center">
                <div className="flex flex-col items-center mb-6">
                  <GitFork
                    className="w-16 h-16 text-[#5E53E0]"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-gray-500 mb-6">{t("pleaseLogIn")}</p>
                <button
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent("open-auth-modal"))
                  }
                  className="pointer-events-auto inline-flex items-center justify-center w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
                >
                  {t("loginCta")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error or not found
  if (error || !request) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div className="ze-upload-panel text-center">
                <div className="flex flex-col items-center mb-6">
                  <GitFork
                    className="w-16 h-16 text-gray-300"
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-gray-500">
                  {error || t("notAvailableForReview")}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const budgetMajor = request.budgetMinorUnits / 100;
  const formattedBudget = formatCurrencyAmount(
    budgetMajor,
    request.currency as CurrencyCode,
  );
  const revisionsRemaining =
    (request.maxRevisions ?? 0) - (request.revisionCount ?? 0);
  const canRevise = revisionsRemaining > 0;
  const latestDelivery =
    request.deliveries && request.deliveries.length > 0
      ? request.deliveries[request.deliveries.length - 1]
      : null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const renderContent = () => {
    switch (request.status) {
      case "delivered":
        return (
          <div className="space-y-4">
            {/* Latest delivery */}
            {latestDelivery && (
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-[#171717]">
                    {t("latestDelivery")} #{latestDelivery.deliveryNumber}
                  </p>
                  <span className="text-xs text-gray-400">
                    {latestDelivery.createdAt &&
                      new Date(latestDelivery.createdAt).toLocaleDateString(
                        undefined,
                        {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
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
                className="flex-1 bg-[#87E64B] text-[#171717] py-3.5 rounded font-bold hover:bg-[#78d43f] transition-colors"
              >
                {t("approveDelivery")}
              </button>
              <button
                onClick={() => setShowRevisionForm(!showRevisionForm)}
                disabled={!canRevise}
                className="flex-1 border border-gray-200 text-[#171717] py-3.5 rounded font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                    className="bg-[#87E64B] text-[#171717] px-6 py-2.5 rounded font-bold hover:bg-[#78d43f] transition-colors disabled:opacity-50 text-sm"
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
            <Clock className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {t("requestPendingPayment")}
            </p>
          </div>
        );

      case "funded":
        return (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-gray-500">{t("waitingForDelivery")}</p>
          </div>
        );

      case "revision_requested":
        return (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-orange-500 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-gray-500">{t("waitingForUpdate")}</p>
          </div>
        );

      case "approved":
      case "completed":
        return (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-10 h-10 text-[#87E64B] mx-auto" />
            <p className="text-sm font-bold text-[#171717]">
              {t("requestCompleted")}
            </p>
            <p className="text-xs text-gray-400">
              {t("downloadAvailableSoon")}
            </p>
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
    <div className="min-h-screen bg-white">
      <ToastContainer />
      <Header />
      <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
        <div
          className={`ze-content-panel ze-time-${timeOfDay}`}
          style={{ position: "relative", overflow: "hidden" }}
        >
          <ContentPanelBackground
            timeOfDay={timeOfDay}
            isAuthenticated={isAuthenticated}
          />
          <div
            className="ze-panels-container"
            style={{
              position: "relative",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            <div className="ze-upload-panel" style={{ maxWidth: "460px" }}>
              {/* Header icon + title */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <GitFork
                    className="w-7 h-7 text-blue-500"
                    strokeWidth={1.5}
                  />
                </div>
                <h1 className="text-xl font-bold text-[#171717] mb-1">
                  {t("reviewTitle")}
                </h1>
                <p className="text-sm text-gray-500">
                  {request.creativeEmail}
                </p>
              </div>

              {/* Request summary card */}
              <div className="pointer-events-auto bg-[#FDF8F0] rounded-xl p-6 mb-6">
                <h2 className="font-bold text-[#171717] mb-1">
                  {request.title}
                </h2>
                {request.description && (
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    {request.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#171717]">
                    {formattedBudget}
                  </span>
                  {request.deadline && (
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(request.deadline)}
                    </span>
                  )}
                </div>
              </div>

              {/* Status-specific content */}
              <div className="pointer-events-auto">{renderContent()}</div>
            </div>
          </div>
        </div>
      </main>

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
