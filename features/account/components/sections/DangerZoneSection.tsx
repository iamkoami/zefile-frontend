"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { toIntlLocale } from "@/lib/locale";
import { useRouter } from "next/navigation";
import { WarningTriangle, Trash, Xmark } from "iconoir-react";
import { usersApi, DeletionStatusResponse } from "@/services/users-api";
import { apiClient } from "@/services/api-client";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { toast } from "@/components/shared/Toast";
import { useDrawerStore } from "@/stores/drawer-store";

/**
 * DangerZoneSection - Account deletion with multi-step confirmation
 * Story 17.8: Frontend Account Deletion UI
 *
 * Features:
 * - Red-themed "Danger Zone" section
 * - Delete Account button
 * - Multi-step confirmation modal with "DELETE" text confirmation
 * - Pending deletion status display with countdown
 * - Cancel deletion option
 */
const DangerZoneSection: React.FC = () => {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const { closeDrawer } = useDrawerStore();

  const [deletionStatus, setDeletionStatus] =
    useState<DeletionStatusResponse | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    loadDeletionStatus();
    return () => setMounted(false);
  }, []);

  const loadDeletionStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await usersApi.getDeletionStatus();
      if (response.data) {
        setDeletionStatus(response.data);
      }
    } catch {
      // Silently handle - not critical
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setConfirmationText("");
    setShowDeleteModal(true);
    // Focus the input after modal opens
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setConfirmationText("");
  };

  const handleDeleteAccount = async () => {
    if (confirmationText !== "DELETE") {
      toast.error(t("deleteAccountInvalidConfirmation"));
      return;
    }

    setIsDeleting(true);
    try {
      const response = await usersApi.requestDeletion(confirmationText);

      if (response.data) {
        toast.success(t("deleteAccountRequested"));
        setShowDeleteModal(false);
        setConfirmationText("");
        // Reload status to show pending deletion
        await loadDeletionStatus();
      } else if (response.error) {
        toast.error(response.error.message || t("deleteAccountError"));
      }
    } catch {
      toast.error(t("deleteAccountError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancelling(true);
    try {
      const response = await usersApi.cancelDeletion();

      if (response.data?.success) {
        toast.success(t("cancelDeletionSuccess"));
        setShowCancelModal(false);
        // Reload status to clear pending deletion
        await loadDeletionStatus();
      } else if (response.error) {
        toast.error(response.error.message || t("cancelDeletionError"));
      }
    } catch {
      toast.error(t("cancelDeletionError"));
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString(toIntlLocale(locale), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle ESC key for delete modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showDeleteModal && !isDeleting) {
        handleCloseDeleteModal();
      }
    };

    if (showDeleteModal) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showDeleteModal, isDeleting]);

  // Check if confirmation text is valid
  const isConfirmationValid = confirmationText === "DELETE";

  // Render pending deletion status
  if (deletionStatus?.hasPendingDeletion) {
    return (
      <section className="border-t-2 border-red-200 pt-6 mt-6">
        <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
          <WarningTriangle className="w-5 h-5" />
          {t("dangerZoneSection")}
        </h3>

        {/* Pending Deletion Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Trash className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-red-800">
                {t("deletionPendingTitle")}
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {t("deletionPendingDescription", {
                  date: formatDate(deletionStatus.scheduledDeletionAt),
                  days: deletionStatus.daysRemaining?.toString() || "7",
                })}
              </p>
              <div className="mt-3 flex items-center gap-4">
                <span className="text-sm font-medium text-red-600 bg-red-100 px-3 py-1 rounded-full">
                  {t("deletionPendingDaysRemaining", {
                    days: deletionStatus.daysRemaining?.toString() || "7",
                  })}
                </span>
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={isCancelling}
                  className="text-sm font-bold text-[#171717] underline disabled:opacity-50"
                >
                  {t("cancelDeletionButton")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Deletion Confirmation Modal */}
        <ConfirmationModal
          isOpen={showCancelModal}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={handleCancelDeletion}
          title={t("cancelDeletionConfirmTitle")}
          message={t("cancelDeletionConfirmMessage")}
          confirmLabel={t("cancelDeletionConfirm")}
          cancelLabel={t("cancelDeletionCancel")}
          type="warning"
          isLoading={isCancelling}
        />
      </section>
    );
  }

  // Render delete account section
  return (
    <section className="border-t-2 border-red-200 pt-6 mt-6">
      <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
        <WarningTriangle className="w-5 h-5" />
        {t("dangerZoneSection")}
      </h3>

      {/* Delete Account Option */}
      <div className="flex items-start justify-between py-3">
        <div className="flex-1 pr-4">
          <p className="font-medium text-red-700">{t("deleteAccount")}</p>
          <p className="text-sm text-red-600/80 mt-1">
            {t("deleteAccountDescription")}
          </p>
        </div>
        <button
          onClick={handleOpenDeleteModal}
          disabled={isLoadingStatus}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          aria-label={t("deleteAccount")}
        >
          <Trash className="w-4 h-4" />
          {t("deleteAccountButton")}
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal &&
        mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 z-[10000] transition-opacity duration-200"
              onClick={handleCloseDeleteModal}
              aria-hidden="true"
            />

            {/* Modal */}
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              aria-describedby="delete-account-description"
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
              onClick={handleCloseDeleteModal}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={isDeleting}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  aria-label="Close"
                >
                  <Xmark className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 flex items-center justify-center bg-red-100 rounded-full">
                    <Trash
                      className="w-12 h-12 text-red-600"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                {/* Title */}
                <h2
                  id="delete-account-title"
                  className="text-xl font-bold text-gray-900 text-center mb-4"
                >
                  {t("deleteAccountModalTitle")}
                </h2>

                {/* Description */}
                <div id="delete-account-description" className="mb-6">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    {t("deleteAccountModalStep1")}
                  </p>
                  <ul className="text-sm text-gray-500 space-y-2 pl-6 list-disc">
                    <li>{t("deleteAccountDataTransfers")}</li>
                    <li>{t("deleteAccountDataContacts")}</li>
                    <li>{t("deleteAccountDataPayments")}</li>
                    <li>{t("deleteAccountDataSettings")}</li>
                  </ul>
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                  <label
                    htmlFor="confirmation-input"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t("deleteAccountConfirmLabel")}
                  </label>
                  <input
                    ref={inputRef}
                    id="confirmation-input"
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder={t("deleteAccountConfirmPlaceholder")}
                    disabled={isDeleting}
                    className={`w-full px-4 py-3 border rounded-lg text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 transition-colors ${
                      confirmationText === ""
                        ? "border-gray-300 focus:ring-gray-300"
                        : isConfirmationValid
                          ? "border-red-500 focus:ring-red-500 bg-red-50"
                          : "border-gray-300 focus:ring-gray-300"
                    }`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={handleCloseDeleteModal}
                    disabled={isDeleting}
                    className="flex-1 max-w-[140px] px-6 py-3 text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("deleteAccountCancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || !isConfirmationValid}
                    className="flex-1 max-w-[180px] px-6 py-3 text-base font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting
                      ? t("deleteAccountRequesting")
                      : t("deleteAccountConfirmButton")}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </section>
  );
};

export default DangerZoneSection;
