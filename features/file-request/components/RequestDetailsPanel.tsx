"use client";

import React, { useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toIntlLocale } from "@/lib/locale";
import { GitFork, Clock, Download, Eye, Link as LinkIcon, Trash } from "iconoir-react";
import type { FileRequestDto } from "@/services/file-request-api";
import { fileRequestApi } from "@/services/file-request-api";
import { formatCurrencyAmount, type CurrencyCode } from "@/lib/currency";
import { authApi } from "@/services/auth-api";
import { useDrawerStore } from "@/stores/drawer-store";
import { copyToClipboard } from "@/utils/clipboard";
import { toast } from "@/components/shared/Toast";
import ReportIssueButton from "@/components/shared/ReportIssueButton";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { getCurrentUserEmail } from "@/utils/auth";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  funded: "bg-blue-100 text-blue-800",
  delivered: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  revision_requested: "bg-orange-100 text-orange-800",
  expired: "bg-gray-100 text-gray-500",
  refunded: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

interface RequestDetailsPanelProps {
  request: FileRequestDto & { _role?: "client" | "creative" };
}

const RequestDetailsPanel: React.FC<RequestDetailsPanelProps> = ({
  request,
}) => {
  const t = useTranslations("transfers");
  const locale = useLocale();
  const tReq = useTranslations("fileRequests");
  const tDetails = useTranslations("transferDetails");
  const { pushView } = useDrawerStore();
  const user = authApi.getStoredUser();
  const isClient =
    request._role === "client" || request.clientEmail === user?.email;
  const statusColor =
    STATUS_COLORS[request.status] || "bg-gray-100 text-gray-600";
  const budgetMajor = request.budgetMinorUnits / 100;
  const formattedBudget = formatCurrencyAmount(
    budgetMajor,
    request.currency as CurrencyCode,
    locale,
  );

  const isApprovedOrCompleted =
    request.status === "approved" || request.status === "completed";
  const isTerminal =
    request.status === "expired" || request.status === "cancelled" || request.status === "refunded" || request.status === "completed";
  const isCancellable =
    isClient && (request.status === "pending_payment" || request.status === "funded");

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      const response = await fileRequestApi.cancel(request.id);
      if (response.error) {
        const errorMsg =
          typeof response.error.message === "string"
            ? response.error.message
            : tReq("genericError");
        toast.error(errorMsg);
        return;
      }
      toast.success(tReq("requestCancelled"));
      setShowCancelConfirm(false);
      // Close drawer after cancel
      const { closeDrawer } = useDrawerStore.getState();
      closeDrawer();
    } catch {
      toast.error(tReq("genericError"));
    } finally {
      setIsCancelling(false);
    }
  }, [request.id, tReq]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString(toIntlLocale(locale), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

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

  const handleReviewOrDeliver = () => {
    if (isClient) {
      pushView("request-review");
    } else {
      window.location.href = `/deliver/${request.shortCode}`;
    }
  };

  const handleCopyLink = useCallback(async () => {
    const path = isClient
      ? `/review/${request.shortCode}`
      : `/deliver/${request.shortCode}`;
    const url = `${window.location.origin}${path}`;
    await copyToClipboard(url, {
      successMessage: t("linkCopied"),
      errorMessage: t("linkCopyFailed"),
    });
  }, [request.shortCode, isClient, t]);

  const handleDownload = useCallback(() => {
    // Download is only available for approved/completed requests
    // TODO: Implement file download when backend supports it
    toast.success(tReq("downloadAvailableSoon"));
  }, [tReq]);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isClient ? "bg-blue-50" : "bg-purple-50"}`}
          >
            <GitFork
              className={`w-4 h-4 ${isClient ? "text-blue-500" : "text-purple-500"}`}
              strokeWidth={1.5}
            />
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}
          >
            {t(`requestStatus.${request.status}`)}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#171717] mb-1">
          {request.title}
        </h1>
        <p className="text-sm text-gray-500">
          {isClient ? t("requestSent") : t("requestReceived")}
        </p>
      </div>

      {/* Action buttons - same style as TransferDetailsPanel */}
      <div className="flex items-center gap-2 mb-6">
        {/* Review / Deliver */}
        <button
          onClick={handleReviewOrDeliver}
          disabled={isTerminal}
          className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Eye className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs">
            {isClient ? tReq("review") : tReq("deliver")}
          </span>
        </button>

        {/* Download - only active when approved/completed */}
        <button
          onClick={handleDownload}
          disabled={!isApprovedOrCompleted}
          className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={
            !isApprovedOrCompleted
              ? tReq("downloadAvailableSoon")
              : undefined
          }
        >
          <Download className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs">{tDetails("download")}</span>
        </button>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex flex-col items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <LinkIcon className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs">{t("copyLink")}</span>
        </button>

        {/* Report */}
        <ReportIssueButton
          transferId={request.id}
          shortCode={request.shortCode}
          userEmail={getCurrentUserEmail() || undefined}
          role={isClient ? "sender" : "recipient"}
          variant="icon"
        />

        {/* Cancel - only for client, only pending_payment or funded */}
        {isCancellable && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs">{tReq("cancelRequest")}</span>
          </button>
        )}
      </div>

      {/* Budget */}
      <div className="bg-[#FDF8F0] rounded-xl p-6 mb-6">
        <p className="text-sm text-gray-500 mb-1">{tReq("budget")}</p>
        <p className="text-2xl font-bold text-[#171717]">{formattedBudget}</p>
      </div>

      {/* Details */}
      <div className="space-y-4 mb-6">
        {/* Description */}
        {request.description && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">
              {tReq("description")}
            </p>
            <p className="text-sm text-[#171717] leading-relaxed">
              {request.description}
            </p>
          </div>
        )}

        {/* Counterparty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">
              {isClient ? tReq("creative") : tReq("client")}
            </p>
            <p className="text-sm text-[#171717]">
              {isClient ? request.creativeEmail : request.clientEmail}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">
              {tReq("createdOn")}
            </p>
            <p className="text-sm text-[#171717]">
              {formatDate(request.createdAt)}
            </p>
          </div>
        </div>

        {/* Deadline */}
        {request.deadline && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-600">
              {tReq("deadline")}: {formatDate(request.deadline)}
            </p>
          </div>
        )}

        {/* Revisions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">
              {tReq("revisions")}
            </p>
            <p className="text-sm text-[#171717]">
              {request.revisionCount} / {request.maxRevisions}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">
              {tReq("autoApprove")}
            </p>
            <p className="text-sm text-[#171717]">
              {request.autoApproveDays}{" "}
              {request.autoApproveDays === 1 ? tReq("day") : tReq("days")}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-500 uppercase mb-3">
          {tReq("timeline")}
        </p>
        <div className="space-y-3">
          <TimelineEntry
            label={tReq("created")}
            date={formatDateTime(request.createdAt)}
          />
          {request.paidAt && (
            <TimelineEntry
              label={tReq("paid")}
              date={formatDateTime(request.paidAt)}
            />
          )}
          {request.deliveredAt && (
            <TimelineEntry
              label={tReq("delivered")}
              date={formatDateTime(request.deliveredAt)}
            />
          )}
          {request.approvedAt && (
            <TimelineEntry
              label={tReq("approved")}
              date={formatDateTime(request.approvedAt)}
            />
          )}
        </div>
      </div>

      {/* Deliveries */}
      {request.deliveries && request.deliveries.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-xs font-bold text-gray-500 uppercase mb-3">
            {tReq("deliveries")} ({request.deliveries.length})
          </p>
          <div className="space-y-3">
            {request.deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-gray-50 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#171717]">
                    #{delivery.deliveryNumber}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(delivery.createdAt)}
                  </span>
                </div>
                {delivery.message && (
                  <p className="text-gray-600 text-xs">{delivery.message}</p>
                )}
                {delivery.revisionFeedback && (
                  <p className="text-orange-600 text-xs mt-1">
                    {tReq("feedback")}: {delivery.revisionFeedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        type="warning"
        title={tReq("cancelRequestTitle")}
        message={
          request.status === "funded"
            ? tReq("cancelRequestMessageFunded")
            : tReq("cancelRequestMessage")
        }
        confirmLabel={tReq("cancelRequestConfirm")}
        isLoading={isCancelling}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};

const TimelineEntry: React.FC<{ label: string; date: string }> = ({
  label,
  date,
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-600">{label}</span>
    <span className="text-[#171717] font-medium">{date}</span>
  </div>
);

export default RequestDetailsPanel;
