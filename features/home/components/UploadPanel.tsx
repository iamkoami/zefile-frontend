"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, MoreHoriz } from "iconoir-react";
import { useTranslations } from "next-intl";
import {
  getFileInputAccept,
  validateFiles,
} from "@/lib/constants/supported-file-types";
import OTPVerification from "./OTPVerification";
import UploadProgressPanel from "./UploadProgressPanel";
import CancelConfirmationPanel from "./CancelConfirmationPanel";
import TransferCompletePanel from "./TransferCompletePanel";
import MultiEmailInput from "./MultiEmailInput";
import { transferApi, TransferDto } from "@/services/transfer-api";
import { authApi } from "@/services/auth-api";
import { platformApi } from "@/services/platform-api";
import { multipartUploadService } from "@/services/multipart-upload.service";
import { useUploadStore } from "@/stores/upload-store";

interface UploadPanelProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onShowOptions: () => void;
  maxUploadSize: number;
  selectedFilesSize: number;
  onPanelStateChange?: (state: PanelState) => void;
}

export type PanelState =
  | "initial"
  | "form"
  | "otp"
  | "uploading"
  | "cancel-confirm"
  | "complete";

const UploadPanel: React.FC<UploadPanelProps> = ({
  selectedFiles,
  onFilesChange,
  onShowOptions,
  maxUploadSize,
  selectedFilesSize,
  onPanelStateChange,
}) => {
  const t = useTranslations("upload");
  const tCurrency = useTranslations("currency");

  // Global upload state for protection across the app
  const {
    setUploading: setGlobalUploading,
    setPaused: setGlobalPaused,
    setProgress: setGlobalProgress,
    setComplete: setGlobalComplete,
    reset: resetGlobalUpload,
  } = useUploadStore();

  const [isDragging, setIsDragging] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]); // Changed from sendTo
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("XOF"); // Currency selection
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [fileError, setFileError] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [panelState, setPanelState] = useState<PanelState>("initial");
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [serviceChargePercentage, setServiceChargePercentage] =
    useState<number>(15);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedSize, setUploadedSize] = useState<number>(0);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] =
    useState<number>(0);
  const [transferResult, setTransferResult] = useState<{
    transferLink: string;
    shortLink: string;
    transfer: TransferDto;
  } | null>(null);

  // Upload control
  const uploadStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentUploadsRef = useRef<Array<{ uploadId: string; objectKey: string; transferId: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch service charge percentage on mount
  useEffect(() => {
    const fetchConfig = async () => {
      const response = await platformApi.getPublicConfig();
      if (response.data) {
        setServiceChargePercentage(response.data.serviceChargePercentage);
      }
    };
    fetchConfig();
  }, []);

  // Auto-transition to form when files are added (e.g., via global drag & drop)
  // Also transition back to initial when all files are removed (unless recipients are pre-filled)
  useEffect(() => {
    if (selectedFiles.length > 0 && panelState === "initial") {
      setPanelState("form");
    } else if (selectedFiles.length === 0 && panelState === "form" && recipientEmails.length === 0) {
      // Only revert to initial if no pre-filled recipients
      setPanelState("initial");
    }
  }, [selectedFiles.length, panelState, recipientEmails.length]);

  // Listen for add-recipient-to-transfer event from ContactsPanel
  // Pre-fills the recipient email and shows the form
  useEffect(() => {
    const handleAddRecipient = (event: CustomEvent<{ email: string }>) => {
      const { email: recipientEmail } = event.detail;
      if (recipientEmail && !recipientEmails.includes(recipientEmail)) {
        setRecipientEmails((prev) => [...prev, recipientEmail]);
      }
      // Show the form when adding a recipient
      if (panelState === "initial" || panelState === "complete") {
        setPanelState("form");
      }
    };

    window.addEventListener(
      "add-recipient-to-transfer",
      handleAddRecipient as EventListener
    );

    return () => {
      window.removeEventListener(
        "add-recipient-to-transfer",
        handleAddRecipient as EventListener
      );
    };
  }, [recipientEmails, panelState]);

  // Notify parent component when panel state changes
  useEffect(() => {
    if (onPanelStateChange) {
      onPanelStateChange(panelState);
    }
  }, [panelState, onPanelStateChange]);

  // Helper function to get currency symbol
  const getCurrencySymbol = (currencyCode: string): string => {
    const symbols: { [key: string]: string } = {
      NGN: "₦",
      GHS: "₵",
      ZAR: "R",
      KES: "KSh",
      XOF: "CFA",
      // USD removed
    };
    return symbols[currencyCode] || currencyCode;
  };

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  // Check if adding new files would exceed limit
  const checkSizeLimit = (newFiles: File[]): boolean => {
    const currentSize = selectedFilesSize;
    const newFilesSize = newFiles.reduce((sum, file) => sum + file.size, 0);
    const totalSize = currentSize + newFilesSize;

    if (totalSize > maxUploadSize) {
      const remainingSize = maxUploadSize - currentSize;
      setFileError(
        `Files exceed upload limit. You can upload up to ${formatBytes(
          remainingSize
        )} more.`
      );
      setTimeout(() => setFileError(""), 5000);
      return false;
    }
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Disable drag if already at max size
    if (selectedFilesSize >= maxUploadSize) {
      return;
    }
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // Check if already at max size
    if (selectedFilesSize >= maxUploadSize) {
      setFileError(`Upload limit of ${formatBytes(maxUploadSize)} reached.`);
      setTimeout(() => setFileError(""), 5000);
      return;
    }

    const files = Array.from(e.dataTransfer.files);
    const validation = validateFiles(files);

    if (!validation.valid) {
      setFileError(validation.errors[0]);
      setTimeout(() => setFileError(""), 5000);
      return;
    }

    // Check size limit
    if (!checkSizeLimit(files)) {
      return;
    }

    setFileError("");
    onFilesChange([...selectedFiles, ...files]);
    setPanelState("form");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validation = validateFiles(files);

      if (!validation.valid) {
        setFileError(validation.errors[0]);
        setTimeout(() => setFileError(""), 5000);
        e.target.value = ""; // Reset input
        return;
      }

      // Check size limit
      if (!checkSizeLimit(files)) {
        e.target.value = ""; // Reset input
        return;
      }

      setFileError("");
      onFilesChange(files);
      setPanelState("form");
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, "");

    if (numericValue === "") {
      setPrice("");
      return;
    }

    // Format with thousand separators
    const formattedValue = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseInt(numericValue, 10));

    setPrice(formattedValue);
  };

  const parsePriceToNumber = (formattedPrice: string): number => {
    // Remove all spaces (thousand separators in French format)
    const numericString = formattedPrice.replace(/\s/g, "");
    return parseFloat(numericString) || 0;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (recipientEmails.length === 0) {
      errors.recipientEmails = t("sendToRequired");
    }

    if (!email.trim()) {
      errors.email = t("yourEmailRequired");
    } else if (!validateEmail(email.trim())) {
      errors.email = t("invalidEmail");
    }

    if (!price.trim()) {
      errors.price = t("priceRequired");
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTransfer = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Calculate charge info before processing
      const chargeCalc = await platformApi.getPublicConfig();
      if (chargeCalc.data) {
        const priceNum = parsePriceToNumber(price);
        const serviceCharge =
          (priceNum * chargeCalc.data.serviceChargePercentage) / 100;
        const receivedAmt = priceNum - serviceCharge;
        setReceivedAmount(receivedAmt);
      }

      // Check if user is already logged in
      const isLoggedIn = authApi.isAuthenticated();
      const storedUser = authApi.getStoredUser();

      if (isLoggedIn && storedUser) {
        // User is logged in, skip OTP and proceed directly to upload
        console.log("User is already logged in, skipping OTP:", storedUser);
        await startFileUpload(storedUser.id);
        return;
      }

      // User not logged in, request OTP to authenticate
      const response = await authApi.requestOTP({ email });

      if (response.error) {
        setFormErrors({ email: response.error.message });
        return;
      }

      console.log("OTP sent successfully:", response.data);

      setPanelState("otp");
    } catch (error) {
      console.error("Failed to send OTP:", error);
      setFormErrors({ email: "Failed to send OTP. Please try again." });
    }
  };

  const handleOTPVerify = async (code: string) => {
    try {
      // Verify OTP to authenticate user and get senderId
      const authResponse = await authApi.verifyOTP({
        email: email,
        otp: code,
      });

      if (authResponse.error) {
        console.error("OTP verification failed:", authResponse.error.message);
        throw new Error(authResponse.error.message);
      }

      console.log(
        "OTP verified successfully, user authenticated:",
        authResponse.data
      );

      // Now proceed with file upload
      await startFileUpload(authResponse.data!.user.id);
    } catch (error: any) {
      console.error("Failed to verify OTP:", error);
      throw error; // Let OTPVerification component handle the error
    }
  };

  const startFileUpload = async (userId: string) => {
    // Calculate total size first
    const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    console.log('[Multipart Upload] Starting upload', {
      totalSize: total,
      fileCount: selectedFiles.length,
      timestamp: new Date().toISOString()
    });

    setPanelState("uploading");
    setUploadProgress(0);
    setUploadedSize(0);
    setTotalSize(total);
    setEstimatedTimeRemaining(0);
    uploadStartTimeRef.current = Date.now();

    // Update global upload state for protection
    setGlobalUploading(selectedFiles.length, total);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Use title if provided, otherwise use first file name
    const transferTitle =
      title.trim() || selectedFiles[0]?.name || "Untitled Transfer";

    try {
      // Step 1: Create transfer metadata (without files)
      console.log('[Multipart Upload] Creating transfer metadata');
      const transferResponse = await transferApi.createTransfer({
        senderId: userId,
        recipientEmails: recipientEmails,
        title: transferTitle,
        price: parsePriceToNumber(price),
        currency: currency,
        message: message || undefined,
      });

      if (transferResponse.error) {
        console.error("[Multipart Upload] Failed to create transfer:", transferResponse.error.message);
        resetGlobalUpload();
        setPanelState("form");
        setFormErrors({ email: transferResponse.error.message });
        return;
      }

      const transfer = transferResponse.data!;
      console.log('[Multipart Upload] Transfer created:', transfer.id, transfer.shortCode);

      // Step 2: Upload each file using multipart upload (directly to Wasabi)
      let totalBytesUploaded = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileStartBytes = totalBytesUploaded;

        console.log(`[Multipart Upload] Uploading file ${i + 1}/${selectedFiles.length}: ${file.name}`);

        try {
          await multipartUploadService.uploadFile(
            file,
            transfer.shortCode,
            userId,
            transfer.id,
            (fileProgress) => {
              // Calculate overall progress across all files
              const currentFileBytes = fileProgress.bytesUploaded;
              const overallBytesUploaded = fileStartBytes + currentFileBytes;
              const overallProgress = (overallBytesUploaded / total) * 100;

              console.log('[Multipart Upload] Progress:', {
                file: file.name,
                fileProgress: fileProgress.progress.toFixed(2) + '%',
                overallProgress: overallProgress.toFixed(2) + '%',
                bytesUploaded: overallBytesUploaded,
                totalBytes: total,
                uploadSpeed: fileProgress.uploadSpeed.toFixed(0) + ' bytes/s',
                timeRemaining: fileProgress.estimatedTimeRemaining.toFixed(1) + 's'
              });

              // Update UI with REAL progress data (SINGLE SOURCE OF TRUTH)
              setUploadProgress(overallProgress);
              setUploadedSize(overallBytesUploaded);
              setEstimatedTimeRemaining(fileProgress.estimatedTimeRemaining);

              // Sync global state for upload protection
              setGlobalProgress(overallProgress, overallBytesUploaded);
            },
            (uploadId, objectKey) => {
              // Track upload for cancellation
              currentUploadsRef.current.push({
                uploadId,
                objectKey,
                transferId: transfer.id,
              });
              console.log('[Upload Tracking] Upload started:', { uploadId, objectKey });
            }
          );

          // Update total bytes uploaded after file completes
          totalBytesUploaded += file.size;
          console.log(`[Multipart Upload] File ${i + 1} completed`);

        } catch (fileError: any) {
          console.error(`[Multipart Upload] Failed to upload file ${file.name}:`, fileError);
          resetGlobalUpload();
          setPanelState("form");
          setFormErrors({ email: `Failed to upload ${file.name}: ${fileError.message}` });
          return;
        }
      }

      console.log("[Multipart Upload] All files uploaded successfully");

      // Clear tracked uploads (all completed successfully)
      currentUploadsRef.current = [];

      // Step 3: Finalize transfer - this sends email notifications
      console.log('[Multipart Upload] Finalizing transfer and sending notifications');
      try {
        const finalizeResponse = await transferApi.finalizeTransfer(transfer.id);
        if (finalizeResponse.error) {
          console.warn('[Multipart Upload] Failed to finalize transfer:', finalizeResponse.error.message);
          // Don't fail the upload, just log the warning
        } else {
          console.log('[Multipart Upload] Transfer finalized:', finalizeResponse.data?.message);
        }
      } catch (finalizeError) {
        console.warn('[Multipart Upload] Error finalizing transfer:', finalizeError);
        // Don't fail the upload, notifications can be retried
      }

      // Step 4: Upload complete - show 100%
      setUploadProgress(100);
      setUploadedSize(total);
      setEstimatedTimeRemaining(0);

      // Build transfer links
      const shortLinkDomain =
        process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "localhost:3000";
      const shortCodePrefix = process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || "z-";
      const protocol = shortLinkDomain.includes('localhost') ? 'http://' : 'https://';
      const transferLink = `${process.env.NEXT_PUBLIC_APP_URL}/transfer/${transfer.id}`;
      const shortLink = `${protocol}${shortLinkDomain}/${shortCodePrefix}${transfer.shortCode}`;

      setTransferResult({
        transferLink,
        shortLink,
        transfer,
      });

      // Update global state - upload complete
      setGlobalComplete();

      setPanelState("complete");
    } catch (error) {
      console.error("[Upload] Unexpected error:", error);
      resetGlobalUpload();
      setPanelState("form");
      setFormErrors({ email: "Upload failed. Please try again." });
    }
  };

  const handleCancelClick = () => {
    // Pause uploads while showing cancel confirmation
    multipartUploadService.pause();
    setGlobalPaused();
    setPanelState("cancel-confirm");
  };

  const handleConfirmCancel = async () => {
    // Resume first to unblock any waiting chunks before aborting
    multipartUploadService.resume();

    try {
      // Abort all ongoing multipart uploads
      if (currentUploadsRef.current.length > 0) {
        console.log('[Upload Cancel] Aborting uploads:', currentUploadsRef.current);

        await Promise.allSettled(
          currentUploadsRef.current.map(upload =>
            multipartUploadService.abortUpload(
              upload.uploadId,
              upload.objectKey,
              upload.transferId
            )
          )
        );

        console.log('[Upload Cancel] All uploads aborted');
        currentUploadsRef.current = [];
      }

      // Also abort XHR if in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    } catch (error) {
      console.error('[Upload Cancel] Error aborting uploads:', error);
    }

    // Reset global upload state
    resetGlobalUpload();

    // Reset to form state
    resetForm();
  };

  const handleContinueUpload = () => {
    // Resume paused uploads
    multipartUploadService.resume();
    // Re-set to uploading state in global store
    setGlobalUploading(selectedFiles.length, totalSize);
    setPanelState("uploading");
  };

  const handleBackFromOTP = () => {
    setPanelState("form");
  };

  const handleSendAnother = () => {
    resetForm();
  };

  const resetForm = () => {
    setPanelState("initial");
    setRecipientEmails([]);
    setEmail("");
    setTitle("");
    setPrice("");
    setCurrency("XOF"); // Reset currency to default
    setMessage("");
    setFormErrors({});
    setUploadProgress(0);
    setUploadedSize(0);
    setTotalSize(0);
    setEstimatedTimeRemaining(0);
    setTransferResult(null);
    setReceivedAmount(0); // Reset received amount
    resetGlobalUpload(); // Reset global upload protection state
    onFilesChange([]);
  };

  // Render appropriate panel based on state
  const renderPanel = () => {
    switch (panelState) {
      case "otp":
        return (
          <OTPVerification
            email={email}
            onBack={handleBackFromOTP}
            onVerify={handleOTPVerify}
          />
        );

      case "uploading":
        return (
          <UploadProgressPanel
            progress={uploadProgress}
            uploadedSize={uploadedSize}
            totalSize={totalSize}
            estimatedTimeRemaining={estimatedTimeRemaining}
            fileCount={selectedFiles.length}
            onCancel={handleCancelClick}
          />
        );

      case "cancel-confirm":
        return (
          <CancelConfirmationPanel
            progress={uploadProgress}
            onConfirmCancel={handleConfirmCancel}
            onContinue={handleContinueUpload}
          />
        );

      case "complete":
        return transferResult ? (
          <TransferCompletePanel
            transferLink={transferResult.transferLink}
            shortLink={transferResult.shortLink}
            transfer={transferResult.transfer}
            onSendAnother={handleSendAnother}
          />
        ) : null;

      case "initial":
        return (
          <>
            {/* Upload Area */}
            <div
              id="ze-upload-area"
              className={`ze-upload-area ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              {/* Icon and Text - Horizontal Layout */}
              <div className="flex items-center gap-3">
                {/* Plus Icon */}
                <div
                  id="ze-upload-icon"
                  className="ze-upload-icon w-12 h-12 flex items-center justify-center border-2 border-[#171717] rounded flex-shrink-0"
                >
                  <Plus
                    width={24}
                    height={24}
                    color="#171717"
                    strokeWidth={2}
                  />
                </div>

                {/* Text */}
                <div id="ze-upload-text" className="ze-upload-text text-left">
                  <p className="text-sm font-semibold text-black">
                    {t("addFiles")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedFilesSize >= maxUploadSize
                      ? t("uploadLimitReached")
                      : `${t("upTo")} ${formatBytes(
                          maxUploadSize - selectedFilesSize
                        )}`}
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={getFileInputAccept()}
                id="ze-file-input"
                className="ze-file-input hidden"
                onChange={handleFileSelect}
                disabled={selectedFilesSize >= maxUploadSize}
              />
            </div>

            {/* Error Message */}
            {fileError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{fileError}</p>
              </div>
            )}

            {/* Size limit warning when files exceed limit */}
            {selectedFilesSize > maxUploadSize && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 font-medium">
                  {t("filesExceedLimit", {
                    limit: formatBytes(maxUploadSize),
                    current: formatBytes(selectedFilesSize),
                  })}
                </p>
              </div>
            )}

            {/* Description Text */}
            <p
              id="ze-upload-description"
              className="ze-upload-description text-sm font-medium mt-5 mb-12 text-center text-gray-500"
            >
              {t("dropFilesHere")}
            </p>

            {/* Buttons */}
            <div
              id="ze-upload-actions"
              className="ze-upload-actions flex items-center gap-3"
            >
              <button
                id="ze-transfer-button"
                className="ze-transfer-button"
                disabled={true}
              >
                {t("transfer")}
              </button>

              <button
                id="ze-options-button"
                onClick={onShowOptions}
                className="ze-options-button"
                aria-label="Options"
              >
                <MoreHoriz width={20} height={20} color="#171717" />
              </button>
            </div>
          </>
        );

      case "form":
        return (
          <>
            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              {/* Recipient Emails */}
              <div>
                <MultiEmailInput
                  emails={recipientEmails}
                  onEmailsChange={setRecipientEmails}
                  placeholder={t("sendTo")}
                  maxEmails={10}
                  error={formErrors.recipientEmails}
                />
              </div>

              {/* Email */}
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("yourEmail")}
                  className={`ze-form-input ${
                    formErrors.email ? "border-red-500" : ""
                  }`}
                />
                {formErrors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("title")}
                  className="ze-form-input"
                />
              </div>

              {/* Currency & Price */}
              <div>
                <div className="grid grid-cols-[110px_1fr] gap-3">
                  {/* Currency Selector */}
                  <div>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={`ze-form-select h-full ${
                        formErrors.price ? "border-red-500" : ""
                      }`}
                    >
                      <option value="XOF">XOF</option>
                      <option value="NGN">NGN</option>
                      <option value="GHS">GHS</option>
                      <option value="ZAR">ZAR</option>
                      <option value="KES">KES</option>
                    </select>
                  </div>

                  {/* Price Input */}
                  <div>
                    <input
                      type="text"
                      value={price}
                      onChange={handlePriceChange}
                      placeholder={t("setPrice")}
                      className={`ze-form-input ${
                        formErrors.price ? "border-red-500" : ""
                      }`}
                      inputMode="numeric"
                    />
                  </div>
                </div>
                {/* Error message under both fields */}
                {formErrors.price && (
                  <p className="text-sm text-red-600 mt-1">
                    {formErrors.price}
                  </p>
                )}
              </div>

              {/* Info Text */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {t("youWillReceive")}
                </span>
                <span className="text-sm font-medium">
                  {receivedAmount > 0
                    ? new Intl.NumberFormat("fr-FR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(receivedAmount)
                    : price
                    ? new Intl.NumberFormat("fr-FR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        parsePriceToNumber(price) *
                          (1 - serviceChargePercentage / 100)
                      )
                    : "0"}{" "}
                  {getCurrencySymbol(currency)}
                </span>
              </div>
              <div className="flex items-center gap-1 relative">
                <p className="text-xs font-medium text-gray-500">
                  {t("estimatedAmount")}
                </p>
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ backgroundColor: "#87E64B" }}
                  onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                >
                  <span className="text-white text-[8px]">i</span>
                </div>

                {/* Info Tooltip */}
                {showInfoTooltip && (
                  <div className="absolute left-0 bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-64">
                    <p className="text-xs text-gray-700">
                      {t("serviceCharge", {
                        percentage: serviceChargePercentage,
                      })}
                      <br />
                      {price &&
                        `Amount: ${new Intl.NumberFormat("fr-FR").format(
                          parsePriceToNumber(price)
                        )} ${getCurrencySymbol(currency)}`}
                      <br />
                      {price &&
                        `Service fee: ${new Intl.NumberFormat("fr-FR").format(
                          (parsePriceToNumber(price) *
                            serviceChargePercentage) /
                            100
                        )} ${getCurrencySymbol(currency)}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("message")}
                  className="ze-form-input resize-none pt-4"
                  rows={2}
                  style={{ height: "60px" }}
                />
              </div>
            </div>

            {/* Size limit warning when files exceed limit */}
            {selectedFilesSize > maxUploadSize && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 font-medium">
                  {t("filesExceedLimit", {
                    limit: formatBytes(maxUploadSize),
                    current: formatBytes(selectedFilesSize),
                  })}
                </p>
              </div>
            )}

            {/* Buttons */}
            <div
              id="ze-upload-actions"
              className="ze-upload-actions flex items-center gap-3"
            >
              <button
                id="ze-transfer-button"
                className="ze-transfer-button"
                disabled={
                  selectedFiles.length === 0 ||
                  selectedFilesSize > maxUploadSize
                }
                onClick={handleTransfer}
              >
                {t("transfer")}
              </button>

              <button
                id="ze-options-button"
                onClick={onShowOptions}
                className="ze-options-button"
                aria-label="Options"
              >
                <MoreHoriz width={20} height={20} color="#171717" />
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div id="ze-upload-panel" className="ze-upload-panel">
      {renderPanel()}
    </div>
  );
};

export default UploadPanel;
