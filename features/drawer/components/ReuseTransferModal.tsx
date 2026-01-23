"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, Files, AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { TransferDto } from "@/services/transfer-api";

interface ReuseTransferModalProps {
  isOpen: boolean;
  transfer: TransferDto;
  onSubmit: (data: {
    recipientEmails: string[];
    title?: string;
    message?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

/**
 * ReuseTransferModal - Modal for resending/forwarding a transfer to new recipients
 * Allows users to enter new recipients and optionally modify title/message
 */
const ReuseTransferModal: React.FC<ReuseTransferModalProps> = ({
  isOpen,
  transfer,
  onSubmit,
  onCancel,
}) => {
  const t = useTranslations("reuseTransfer");
  const locale = useLocale();
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize title from transfer
  useEffect(() => {
    if (isOpen) {
      setTitle(transfer.title || "");
      setMessage("");
      setEmails([]);
      setInputValue("");
      setError(null);
    }
  }, [isOpen, transfer.title]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes =
      locale === "fr"
        ? ["o", "Ko", "Mo", "Go", "To"]
        : ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Calculate total size
  const totalSize = (transfer.files || []).reduce((acc, file) => {
    const size =
      typeof file?.size === "string"
        ? parseInt(file.size, 10)
        : file?.size || file?.fileSize || 0;
    const sizeNum = typeof size === "string" ? parseInt(size, 10) : size;
    return acc + sizeNum;
  }, 0);
  const fileCount = (transfer.files || []).length;

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Add email to the list
  const addEmail = useCallback(
    (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return;

      if (!isValidEmail(trimmed)) {
        setError(t("invalidEmail"));
        return;
      }

      if (emails.includes(trimmed)) {
        setError(t("duplicateEmail"));
        return;
      }

      if (emails.length >= 10) {
        setError(t("maxRecipientsReached", { max: 10 }));
        return;
      }

      setEmails([...emails, trimmed]);
      setInputValue("");
      setError(null);
    },
    [emails, t]
  );

  // Remove email from the list
  const removeEmail = useCallback((index: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  }, []);

  // Handle input key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "," || e.key === " ") {
        e.preventDefault();
        if (inputValue.trim()) {
          addEmail(inputValue);
        }
      } else if (
        e.key === "Backspace" &&
        !inputValue &&
        emails.length > 0
      ) {
        removeEmail(emails.length - 1);
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [inputValue, emails.length, addEmail, removeEmail, onCancel]
  );

  // Handle paste
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text");
      // Split by common separators
      const pastedEmails = pasted.split(/[,;\s]+/).filter(Boolean);

      let hasError = false;
      const validEmails: string[] = [];

      for (const email of pastedEmails) {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) continue;

        if (!isValidEmail(trimmed)) {
          hasError = true;
          continue;
        }

        if (emails.includes(trimmed) || validEmails.includes(trimmed)) {
          continue;
        }

        if (emails.length + validEmails.length >= 10) {
          hasError = true;
          break;
        }

        validEmails.push(trimmed);
      }

      if (validEmails.length > 0) {
        setEmails([...emails, ...validEmails]);
      }

      if (hasError) {
        setError(t("someEmailsInvalid"));
      } else {
        setError(null);
      }
    },
    [emails, t]
  );

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Add any remaining input
    if (inputValue.trim()) {
      if (!isValidEmail(inputValue.trim())) {
        setError(t("invalidEmail"));
        return;
      }
      emails.push(inputValue.trim().toLowerCase());
    }

    if (emails.length === 0) {
      setError(t("recipientRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        recipientEmails: emails,
        title: title.trim() || undefined,
        message: message.trim() || undefined,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t("submitError");
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [emails, inputValue, title, message, onSubmit, t]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isSubmitting) {
        onCancel();
      }
    },
    [isSubmitting, onCancel]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t("title")}</h2>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label={t("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Transfer summary */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="p-2 bg-[#87E64B]/10 rounded-lg">
              <Files className="w-6 h-6 text-[#87E64B]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {transfer.title ||
                  transfer.files?.[0]?.filename ||
                  transfer.files?.[0]?.fileName ||
                  t("untitled")}
              </p>
              <p className="text-xs text-gray-500">
                {fileCount} {fileCount === 1 ? t("file") : t("files")} •{" "}
                {formatSize(totalSize)}
              </p>
            </div>
          </div>

          {/* Recipients input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("recipientsLabel")} *
            </label>
            <div className="border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-[#87E64B]/50 focus-within:border-[#87E64B]">
              <div className="flex flex-wrap gap-2">
                {emails.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-md"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      disabled={isSubmitting}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  type="email"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  onBlur={() => {
                    if (inputValue.trim()) {
                      addEmail(inputValue);
                    }
                  }}
                  placeholder={
                    emails.length === 0 ? t("recipientsPlaceholder") : ""
                  }
                  disabled={isSubmitting}
                  className="flex-1 min-w-[150px] px-2 py-1 text-sm focus:outline-none disabled:bg-gray-50"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t("recipientsHint", { count: emails.length, max: 10 })}
            </p>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("titleLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] disabled:bg-gray-50"
            />
          </div>

          {/* Message input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("messageLabel")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              disabled={isSubmitting}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#87E64B]/50 focus:border-[#87E64B] disabled:bg-gray-50 resize-none"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || emails.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#171717] bg-[#87E64B] rounded-lg hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t("send")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
};

export default ReuseTransferModal;
