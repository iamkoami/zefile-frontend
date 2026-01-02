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
import { transferApi } from "@/services/transfer-api";
import { authApi } from "@/services/auth-api";
import { platformApi } from "@/services/platform-api";

interface UploadPanelProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onShowOptions: () => void;
  maxUploadSize: number;
  selectedFilesSize: number;
}

type PanelState =
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
}) => {
  const t = useTranslations("upload");
  const tCurrency = useTranslations("currency");
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
  } | null>(null);

  // Upload control
  const uploadStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  // Also transition back to initial when all files are removed
  useEffect(() => {
    if (selectedFiles.length > 0 && panelState === "initial") {
      setPanelState("form");
    } else if (selectedFiles.length === 0 && panelState === "form") {
      setPanelState("initial");
    }
  }, [selectedFiles.length, panelState]);

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
      // Calculate charge info before sending OTP
      const chargeCalc = await platformApi.getPublicConfig();
      if (chargeCalc.data) {
        const priceNum = parsePriceToNumber(price);
        const serviceCharge =
          (priceNum * chargeCalc.data.serviceChargePercentage) / 100;
        const receivedAmt = priceNum - serviceCharge;
        setReceivedAmount(receivedAmt);
      }

      // Request OTP to authenticate user
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

  const calculateTimeRemaining = (
    progress: number,
    startTime: number,
    totalBytes: number
  ): number => {
    if (progress === 0) return 0;

    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const uploadedBytes = (progress / 100) * totalBytes;
    const bytesPerSecond = uploadedBytes / elapsed;
    const remainingBytes = totalBytes - uploadedBytes;

    return remainingBytes / bytesPerSecond;
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
    setPanelState("uploading");
    setUploadProgress(0);
    uploadStartTimeRef.current = Date.now();

    // Calculate total size
    const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    setTotalSize(total);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Use title if provided, otherwise use first file name
    const transferTitle =
      title.trim() || selectedFiles[0]?.name || "Untitled Transfer";

    try {
      const response = await transferApi.createTransferWithFiles(
        {
          senderId: userId,
          recipientEmails: recipientEmails,
          title: transferTitle,
          price: parsePriceToNumber(price),
          currency: currency,
          message: message || undefined,
          files: selectedFiles,
        },
        (progress) => {
          setUploadProgress(progress);
          const uploaded = (progress / 100) * total;
          setUploadedSize(uploaded);

          // Calculate estimated time remaining
          const timeRemaining = calculateTimeRemaining(
            progress,
            uploadStartTimeRef.current,
            total
          );
          setEstimatedTimeRemaining(timeRemaining);
        }
      );

      if (response.error) {
        console.error("Upload failed:", response.error.message);
        // Handle error - could show error panel or go back to form
        setPanelState("form");
        setFormErrors({ email: response.error.message });
        return;
      }

      console.log("Transfer created successfully:", response.data);

      // Build transfer links
      const shortLinkDomain =
        process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "localhost:3000";
      const transferLink = `${process.env.NEXT_PUBLIC_APP_URL}/transfer/${
        response.data!.id
      }`;
      const shortLink = `${shortLinkDomain}/${response.data!.shortCode}`;

      setTransferResult({
        transferLink,
        shortLink,
      });

      setPanelState("complete");
    } catch (error) {
      console.error("Upload error:", error);
      setPanelState("form");
      setFormErrors({ email: "Upload failed. Please try again." });
    }
  };

  const handleCancelClick = () => {
    setPanelState("cancel-confirm");
  };

  const handleConfirmCancel = () => {
    // Abort the upload if in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset to form state
    resetForm();
  };

  const handleContinueUpload = () => {
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
    setMessage("");
    setFormErrors({});
    setUploadProgress(0);
    setUploadedSize(0);
    setTotalSize(0);
    setEstimatedTimeRemaining(0);
    setTransferResult(null);
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
              <div className="grid grid-cols-[110px_1fr] gap-3">
                {/* Currency Selector */}
                <div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="ze-form-select h-full"
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
                  {formErrors.price && (
                    <p className="text-sm text-red-600 mt-1">
                      {formErrors.price}
                    </p>
                  )}
                </div>
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
