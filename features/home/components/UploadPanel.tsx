"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, MediaImagePlus, Xmark, NavArrowLeft } from "iconoir-react";
import { useTranslations } from "next-intl";
import {
  getFileInputAccept,
  validateFiles,
} from "@/lib/constants/supported-file-types";
import OTPVerification from "./OTPVerification";
import UploadProgressPanel from "./UploadProgressPanel";
import CancelConfirmationPanel from "./CancelConfirmationPanel";
import TransferCompletePanel from "@/features/transfer/components/TransferCompletePanel";
import MultiEmailInput from "./MultiEmailInput";
import { transferApi, TransferDto } from "@/services/transfer-api";
import { authApi } from "@/services/auth-api";
import { apiClient } from "@/services/api-client";
import { getAnalyticsConsent } from "@/components/shared/CookieConsentBanner";
import { platformApi } from "@/services/platform-api";
import { multipartUploadService } from "@/services/multipart-upload.service";
import { useUploadStore } from "@/stores/upload-store";
import { useCurrentCurrency } from "@/stores/currency-store";
import { TransferOptions } from "@/features/transfer/components/TransferOptionsPanel";
import { storageApi } from "@/services/storage-api";
import { getTierTranslationKey } from "@/hooks/useTierLimits";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { toast } from "@/components/shared/Toast";
import Image from "next/image";
import { trackFilesSelected, trackTransferStarted } from "@/lib/posthog";

// Interface for files from an existing transfer (reuse flow)
export interface ReuseFile {
  id: string;
  filename?: string;
  fileName?: string;
  size?: number | string;
  fileSize?: number | string;
  mimeType?: string;
}

export interface ReuseTransferData {
  transferId: string;
  files: ReuseFile[];
  title?: string;
}

interface UploadPanelProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  maxUploadSize: number;
  selectedFilesSize: number;
  onPanelStateChange?: (state: PanelState) => void;
  reuseTransferData?: ReuseTransferData | null;
  onClearReuseData?: () => void;
  /** Transfer options from page-level state (accessControl, validityDuration, password) */
  transferOptions?: TransferOptions;
  /** Callback when transfer options change (for expiry selector in main form) */
  onTransferOptionsChange?: (options: TransferOptions) => void;
  /** Dynamic tier limits data from API */
  tierLimitsData?: import("@/hooks/useTierLimits").UseTierLimitsReturn;
  /** User's subscription tier */
  userTier?: import("@/hooks/useTierLimits").SubscriptionTier;
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
  maxUploadSize,
  selectedFilesSize,
  onPanelStateChange,
  reuseTransferData,
  onClearReuseData,
  transferOptions,
  onTransferOptionsChange,
  tierLimitsData,
  userTier = "free",
}) => {
  const t = useTranslations("upload");
  const tCurrency = useTranslations("currency");
  const tOptions = useTranslations("transferOptions");

  // Global upload state for protection across the app
  const {
    setUploading: setGlobalUploading,
    setResumed: setGlobalResumed,
    setPaused: setGlobalPaused,
    setProgress: setGlobalProgress,
    setComplete: setGlobalComplete,
    reset: resetGlobalUpload,
  } = useUploadStore();

  // Get global currency for initial value (one-way: global → local)
  const { currency: globalCurrency } = useCurrentCurrency();

  // Poll eligibility - fire after_transfer trigger on completion
  const { checkForPoll } = usePollEligibility();

  const [isDragging, setIsDragging] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]); // Changed from sendTo
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("XOF"); // Local currency for this transfer
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [fileError, setFileError] = useState<string>("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [panelState, setPanelState] = useState<PanelState>("initial");
  const [formView, setFormView] = useState<'main' | 'options'>('main');
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
    isFirstTransfer?: boolean;
  } | null>(null);

  // Upload control
  const uploadStartTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentUploadsRef = useRef<
    Array<{ uploadId: string; objectKey: string; transferId: string }>
  >([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Wallpaper constants
  const MAX_WALLPAPER_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_WALLPAPER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MIN_PASSWORD_LENGTH = 8;

  // Wallpaper handlers
  const handleWallpaperSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!ALLOWED_WALLPAPER_TYPES.includes(file.type)) {
      toast.error(tOptions('invalidFileType'));
      return;
    }
    if (file.size > MAX_WALLPAPER_SIZE) {
      toast.error(tOptions('fileTooLarge'));
      return;
    }
    if (transferOptions?.wallpaperPreview) {
      URL.revokeObjectURL(transferOptions.wallpaperPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    onTransferOptionsChange?.({
      ...transferOptions!,
      wallpaperFile: file,
      wallpaperPreview: previewUrl,
    });
  };

  const handleRemoveWallpaper = () => {
    if (transferOptions?.wallpaperPreview) {
      URL.revokeObjectURL(transferOptions.wallpaperPreview);
    }
    onTransferOptionsChange?.({
      ...transferOptions!,
      wallpaperFile: undefined,
      wallpaperPreview: undefined,
    });
  };

  // Access control handler — clears password when switching away from password mode
  const handleAccessControlChange = (value: string) => {
    if (!transferOptions || !onTransferOptionsChange) return;
    const newAccessControl = value as TransferOptions['accessControl'];
    onTransferOptionsChange({
      ...transferOptions,
      accessControl: newAccessControl,
      password: newAccessControl === 'password' ? transferOptions.password : '',
    });
  };

  const handlePasswordChange = (value: string) => {
    if (!transferOptions || !onTransferOptionsChange) return;
    onTransferOptionsChange({ ...transferOptions, password: value });
  };

  // Password validation
  const isPasswordTooShort =
    transferOptions?.accessControl === 'password' &&
    (transferOptions?.password?.length ?? 0) > 0 &&
    (transferOptions?.password?.length ?? 0) < MIN_PASSWORD_LENGTH;

  // Size limit handler
  const handleSizeLimitChange = (value: string) => {
    if (!transferOptions || !onTransferOptionsChange) return;
    if (!value) {
      onTransferOptionsChange({ ...transferOptions, sizeLimit: '' });
      return;
    }
    const sizeGB = parseInt(value, 10);
    if (isNaN(sizeGB)) return;
    if (tierLimitsData?.isSizeLimitAvailable(sizeGB, userTier) ?? true) {
      onTransferOptionsChange({ ...transferOptions, sizeLimit: value });
    }
  };

  const isWallpaperDisabled = userTier === 'free';
  const sizeLimitOptions = tierLimitsData?.allSizeLimitOptions ?? [];

  // Reset to valid defaults if current selections become unavailable (e.g., tier downgrade)
  useEffect(() => {
    if (!tierLimitsData || tierLimitsData.isLoading || !transferOptions || !onTransferOptionsChange) return;

    let needsUpdate = false;
    const updates: Partial<TransferOptions> = {};

    if (transferOptions.validityDuration) {
      const currentDays = parseInt(transferOptions.validityDuration, 10);
      if (!isNaN(currentDays) && !tierLimitsData.isValidityAvailable(currentDays, userTier)) {
        updates.validityDuration = tierLimitsData.getDefaultValidity(userTier);
        needsUpdate = true;
      }
    }

    if (transferOptions.sizeLimit) {
      const currentSizeGB = parseInt(transferOptions.sizeLimit, 10);
      if (!isNaN(currentSizeGB) && !tierLimitsData.isSizeLimitAvailable(currentSizeGB, userTier)) {
        updates.sizeLimit = tierLimitsData.getDefaultSizeLimit(userTier);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      onTransferOptionsChange({ ...transferOptions, ...updates });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTier, tierLimitsData?.isLoading]);

  // Fetch service charge percentage on mount + on auth change
  // Uses tier-specific rate for authenticated users, default for anonymous
  useEffect(() => {
    const fetchConfig = async () => {
      const user = authApi.getStoredUser();
      if (user) {
        const response = await platformApi.getUserConfig();
        if (response.data) {
          setServiceChargePercentage(response.data.serviceChargePercentage);
          return;
        }
      }
      const publicResponse = await platformApi.getPublicConfig();
      if (publicResponse.data) {
        setServiceChargePercentage(publicResponse.data.serviceChargePercentage);
      }
    };

    fetchConfig();

    const handleAuthChange = () => { fetchConfig(); };
    window.addEventListener("auth-state-change", handleAuthChange);
    return () => window.removeEventListener("auth-state-change", handleAuthChange);
  }, []);

  // Detect authenticated user — auto-fill email, hide email field
  // Listens for auth-state-change so login during form view hides the field
  useEffect(() => {
    const syncAuth = () => {
      const user = authApi.getStoredUser();
      if (user && authApi.isAuthenticated()) {
        setIsUserAuthenticated(true);
        setEmail(user.email);
      } else {
        setIsUserAuthenticated(false);
      }
    };

    syncAuth();

    const handleAuthChange = (e: CustomEvent<{ isAuthenticated: boolean; user?: { email?: string } }>) => {
      if (e.detail.isAuthenticated && e.detail.user?.email) {
        setIsUserAuthenticated(true);
        setEmail(e.detail.user.email);
      } else {
        setIsUserAuthenticated(false);
      }
    };

    window.addEventListener("auth-state-change", handleAuthChange as EventListener);
    return () => window.removeEventListener("auth-state-change", handleAuthChange as EventListener);
  }, []);

  // Initialize local currency from global currency (one-time on mount)
  // This does NOT sync back - changing local currency won't update header
  useEffect(() => {
    if (globalCurrency && panelState === "initial") {
      setCurrency(globalCurrency);
    }
  }, [globalCurrency, panelState]);

  // Auto-transition to form when files are added (e.g., via global drag & drop)
  // Also transition back to initial when all files are removed (unless recipients or reuse files are pre-filled)
  useEffect(() => {
    if (selectedFiles.length > 0 && panelState === "initial") {
      setPanelState("form");
    } else if (
      selectedFiles.length === 0 &&
      panelState === "form" &&
      recipientEmails.length === 0 &&
      !reuseTransferData
    ) {
      // Only revert to initial if no pre-filled recipients and no reuse files
      setPanelState("initial");
    }
  }, [
    selectedFiles.length,
    panelState,
    recipientEmails.length,
    reuseTransferData,
  ]);

  // Reset formView to main when leaving form state
  useEffect(() => {
    if (panelState !== 'form') {
      setFormView('main');
    }
  }, [panelState]);

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
      handleAddRecipient as EventListener,
    );

    return () => {
      window.removeEventListener(
        "add-recipient-to-transfer",
        handleAddRecipient as EventListener,
      );
    };
  }, [recipientEmails, panelState]);

  // Transition to form when reuseTransferData is set from parent
  useEffect(() => {
    if (reuseTransferData && reuseTransferData.files.length > 0) {
      if (reuseTransferData.title) {
        setTitle(reuseTransferData.title);
      }
      if (panelState === "initial" || panelState === "complete") {
        setPanelState("form");
      }
    }
  }, [reuseTransferData, panelState]);

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
      USD: "$",
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
          remainingSize,
        )} more.`,
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
    trackFilesSelected(files.length, files.reduce((sum, f) => sum + f.size, 0));
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
      trackFilesSelected(files.length, files.reduce((sum, f) => sum + f.size, 0));
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

  // Calculate expiry date from validity duration in days
  const calculateExpiryDate = (days: string): string | undefined => {
    if (!days) return undefined;
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum <= 0) return undefined;
    const date = new Date();
    date.setDate(date.getDate() + daysNum);
    return date.toISOString();
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

    // Validate password when access control is 'password'
    if (transferOptions?.accessControl === "password") {
      if (!transferOptions.password || transferOptions.password.length < 8) {
        errors.password = t("passwordMinLength", { min: 8 });
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle reuse transfer - create new transfer using files from existing transfer
  const handleReuseTransfer = async (userId: string) => {
    if (!reuseTransferData) return;

    try {
      const transferTitle =
        title.trim() || reuseTransferData.title || "Untitled Transfer";

      const response = await transferApi.reuseTransfer(
        reuseTransferData.transferId,
        {
          senderId: userId,
          recipientEmails: recipientEmails,
          title: transferTitle,
          message: message || undefined,
        },
      );

      if (response.error) {
        setFormErrors({ email: response.error.message });
        return;
      }

      if (response.data?.success && response.data.transfer) {
        const transfer = response.data.transfer;

        // Build transfer links
        const shortLinkDomain =
          process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "localhost:3000";
        const shortCodePrefix =
          process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || "z-";
        const protocol = shortLinkDomain.includes("localhost")
          ? "http://"
          : "https://";
        const transferLink = `${process.env.NEXT_PUBLIC_APP_URL}/transfer/${transfer.id}`;
        const shortLink = `${protocol}${shortLinkDomain}/${shortCodePrefix}${transfer.shortCode}`;

        setTransferResult({
          transferLink,
          shortLink,
          transfer,
        });

        setPanelState("complete");
        checkForPoll("after_transfer", 3000);
      } else {
        setFormErrors({
          email: response.data?.message || "Failed to create transfer",
        });
      }
    } catch (error) {
      setFormErrors({ email: "Failed to create transfer. Please try again." });
    }
  };

  const handleTransfer = async () => {
    if (!validateForm()) {
      return;
    }

    trackTransferStarted(selectedFiles.length);

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
        // User is logged in, skip OTP and proceed directly
        // If reusing files from existing transfer, use reuse API
        if (reuseTransferData) {
          await handleReuseTransfer(storedUser.id);
        } else {
          await startFileUpload(storedUser.id);
        }
        return;
      }

      // User not logged in, request OTP to authenticate
      const response = await authApi.requestOTP({ email });

      if (response.error) {
        setFormErrors({ email: response.error.message });
        return;
      }

      setPanelState("otp");
    } catch (error) {
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
        throw new Error(authResponse.error.message);
      }

      // Save legal consent (implicit: using the service = accepting terms)
      apiClient
        .post("/users/me/legal-consent", {
          termsAccepted: true,
          privacyAccepted: true,
          cookieConsentAnalytics: getAnalyticsConsent(),
        })
        .catch(() => {
          // Non-blocking: consent will be prompted again on next login if this fails
        });

      // Now proceed with file upload or reuse transfer
      if (reuseTransferData) {
        await handleReuseTransfer(authResponse.data!.user.id);
      } else {
        await startFileUpload(authResponse.data!.user.id);
      }
    } catch (error: any) {
      throw error; // Let OTPVerification component handle the error
    }
  };

  const startFileUpload = async (userId: string) => {
    // Calculate total size first
    const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    setPanelState("uploading");
    setUploadProgress(0);
    setUploadedSize(0);
    setTotalSize(total);
    setEstimatedTimeRemaining(0);
    uploadStartTimeRef.current = Date.now();

    // Reset cancel state for new upload
    multipartUploadService.resetCancel();

    // Update global upload state for protection
    setGlobalUploading(selectedFiles.length, total);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    // Use title if provided, otherwise use first file name
    const transferTitle =
      title.trim() || selectedFiles[0]?.name || "Untitled Transfer";

    try {
      // Step 0: Upload wallpaper if selected (non-blocking — failure = no wallpaper)
      let wallpaperKey: string | undefined;
      if (transferOptions?.wallpaperFile) {
        try {
          const wpResponse = await storageApi.uploadWallpaper(
            transferOptions.wallpaperFile,
          );
          if (wpResponse.data?.wallpaperKey) {
            wallpaperKey = wpResponse.data.wallpaperKey;
          }
        } catch (wpError) {
          console.warn(
            "Wallpaper upload failed, continuing without wallpaper:",
            wpError,
          );
        }
      }

      // Step 1: Create transfer metadata (without files)
      const transferResponse = await transferApi.createTransfer({
        senderId: userId,
        recipientEmails: recipientEmails,
        title: transferTitle,
        price: parsePriceToNumber(price),
        currency: currency,
        message: message || undefined,
        // Include transfer options if provided
        accessControl: transferOptions?.accessControl,
        password:
          transferOptions?.accessControl === "password"
            ? transferOptions.password
            : undefined,
        expireAt: transferOptions?.validityDuration
          ? calculateExpiryDate(transferOptions.validityDuration)
          : undefined,
        wallpaperKey,
      });

      if (transferResponse.error) {
        resetGlobalUpload();
        setPanelState("form");
        setFormErrors({ email: transferResponse.error.message });
        return;
      }

      const transfer = transferResponse.data!;

      // Step 2: Upload each file using multipart upload (directly to Wasabi)
      let totalBytesUploaded = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileStartBytes = totalBytesUploaded;

        try {
          await multipartUploadService.uploadFile(
            file,
            transfer.shortCode,
            userId,
            transfer.id,
            (fileProgress) => {
              // Freeze progress display while paused (cancel confirmation showing)
              if (multipartUploadService.isUploadPaused()) return;

              // Calculate overall progress across all files
              const currentFileBytes = fileProgress.bytesUploaded;
              const overallBytesUploaded = fileStartBytes + currentFileBytes;
              const overallProgress = (overallBytesUploaded / total) * 100;

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
            },
          );

          // Update total bytes uploaded after file completes
          totalBytesUploaded += file.size;

          // Between files: flush pending events, wait if paused, bail if cancelled
          await new Promise((r) => setTimeout(r, 0));
          if (multipartUploadService.isUploadPaused()) {
            await multipartUploadService.waitIfPaused();
          }
          if (multipartUploadService.isUploadCancelled()) {
            resetGlobalUpload();
            resetForm();
            return;
          }
        } catch (fileError: any) {
          resetGlobalUpload();
          setPanelState("form");

          // Handle storage limit exceeded error with upgrade prompt
          if (fileError.code === "STORAGE_LIMIT_EXCEEDED") {
            const formatBytes = (bytes: number) => {
              if (bytes === 0) return "0 B";
              const k = 1024;
              const sizes = ["B", "KB", "MB", "GB", "TB"];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
            };

            const tierName = fileError.tier?.toUpperCase() || "FREE";
            const limitFormatted = formatBytes(fileError.limitBytes || 0);
            const fileSizeFormatted = formatBytes(file.size);

            setFormErrors({
              email: t("storageLimitExceeded", {
                fileSize: fileSizeFormatted,
                tier: tierName,
                limit: limitFormatted,
              }),
            });
          } else {
            setFormErrors({
              email: `Failed to upload ${file.name}: ${fileError.message}`,
            });
          }
          return;
        }
      }

      // Clear tracked uploads (all completed successfully)
      currentUploadsRef.current = [];

      // Yield to the macrotask queue so any pending Cancel click events
      // are processed BEFORE we check pause/cancel state.
      // (microtask yields like `await Promise.resolve()` run before
      //  macrotask events like click handlers, so they'd miss the click)
      await new Promise((r) => setTimeout(r, 0));

      // If user opened cancel confirmation while chunks were in-flight,
      // the upload loop finished but we must wait for their decision
      // before sending emails / finalizing.
      if (multipartUploadService.isUploadPaused()) {
        await multipartUploadService.waitIfPaused();
      }

      // User confirmed cancel while we were waiting — abort without finalizing
      if (multipartUploadService.isUploadCancelled()) {
        // Files are already on S3 but transfer was never finalized,
        // so no emails are sent. The unfinalised transfer will be
        // cleaned up by the backend's scheduled garbage collection.
        resetGlobalUpload();
        resetForm();
        return;
      }

      // Step 3: Finalize transfer - this sends email notifications
      // Also captures if this is the user's first transfer for celebration
      let isFirstTransfer = false;
      try {
        const finalizeResponse = await transferApi.finalizeTransfer(
          transfer.id,
        );
        if (finalizeResponse.data?.isFirstTransfer) {
          isFirstTransfer = true;
        }
      } catch (finalizeError) {
        // Don't fail the upload, notifications can be retried
      }

      // Step 4: Upload complete - show 100%
      setUploadProgress(100);
      setUploadedSize(total);
      setEstimatedTimeRemaining(0);

      // Step 5: Fetch updated transfer with file data (thumbnails, previews generated async)
      // Give backend a moment to process previews (they're generated asynchronously)
      let updatedTransfer = transfer;
      try {
        // Small delay to allow preview generation to start
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updatedResponse = await transferApi.getTransferById(transfer.id);
        if (updatedResponse.data) {
          updatedTransfer = updatedResponse.data;
        }
      } catch (fetchError) {
        // Use original transfer if fetch fails
        console.warn("Could not fetch updated transfer:", fetchError);
      }

      // Build transfer links
      const shortLinkDomain =
        process.env.NEXT_PUBLIC_SHORT_LINK_DOMAIN || "localhost:3000";
      const shortCodePrefix = process.env.NEXT_PUBLIC_SHORT_CODE_PREFIX || "z-";
      const protocol = shortLinkDomain.includes("localhost")
        ? "http://"
        : "https://";
      const transferLink = `${process.env.NEXT_PUBLIC_APP_URL}/transfer/${transfer.id}`;
      const shortLink = `${protocol}${shortLinkDomain}/${shortCodePrefix}${transfer.shortCode}`;

      setTransferResult({
        transferLink,
        shortLink,
        transfer: updatedTransfer,
        isFirstTransfer,
      });

      // Update global state - upload complete
      setGlobalComplete();

      setPanelState("complete");
      checkForPoll("after_transfer", 3000);
    } catch (error) {
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
    // Mark as cancelled so startFileUpload skips finalization
    multipartUploadService.cancel();
    // Resume to unblock any waiting chunks/finalization gate
    multipartUploadService.resume();

    try {
      // Abort all ongoing multipart uploads
      if (currentUploadsRef.current.length > 0) {
        await Promise.allSettled(
          currentUploadsRef.current.map((upload) =>
            multipartUploadService.abortUpload(
              upload.uploadId,
              upload.objectKey,
              upload.transferId,
            ),
          ),
        );

        currentUploadsRef.current = [];
      }

      // Also abort XHR if in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    } catch (error) {
      // Silently fail - abort is best-effort cleanup
    }

    // Reset global upload state
    resetGlobalUpload();

    // Reset to form state
    resetForm();
  };

  const handleContinueUpload = () => {
    // Resume paused uploads
    multipartUploadService.resume();
    // Resume uploading state without resetting progress
    setGlobalResumed();
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
    setCurrency(globalCurrency || "XOF"); // Reset to global currency
    setMessage("");
    setFormErrors({});
    setUploadProgress(0);
    setUploadedSize(0);
    setTotalSize(0);
    setEstimatedTimeRemaining(0);
    setTransferResult(null);
    setReceivedAmount(0); // Reset received amount
    onClearReuseData?.(); // Reset reuse transfer data
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
            isFirstTransfer={transferResult.isFirstTransfer}
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
                          maxUploadSize - selectedFilesSize,
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
            </div>
          </>
        );

      case "form":
        return formView === 'main' ? (
          <div key="form-main" className="animate-slideInLeft">
            {/* Core Form Fields */}
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

              {/* Email — hidden when authenticated (auto-filled) */}
              {!isUserAuthenticated && (
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
              )}

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
                      <option value="KES">KES</option>
                      <option value="ZAR">ZAR</option>
                      <option value="USD">USD</option>
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

              {/* Service Charge Breakdown (inline) */}
              {price && parsePriceToNumber(price) > 0 && (
                <div className="bg-gray-50 rounded p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">{t("price")}</span>
                    <span className="text-[#171717] text-xs font-medium">
                      {new Intl.NumberFormat("fr-FR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(parsePriceToNumber(price))}{" "}
                      {getCurrencySymbol(currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">
                      {t("serviceCharge", {
                        percentage: serviceChargePercentage,
                      })}
                    </span>
                    <span className="text-gray-500 text-xs">
                      -
                      {new Intl.NumberFormat("fr-FR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(
                        (parsePriceToNumber(price) * serviceChargePercentage) /
                          100,
                      )}{" "}
                      {getCurrencySymbol(currency)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-1.5 flex items-center justify-between">
                    <span className="text-[#171717] text-xs font-semibold">
                      {t("youWillReceive")}
                    </span>
                    <span className="text-[#171717] text-xs font-semibold">
                      {receivedAmount > 0
                        ? new Intl.NumberFormat("fr-FR", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(receivedAmount)
                        : new Intl.NumberFormat("fr-FR", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(
                            parsePriceToNumber(price) *
                              (1 - serviceChargePercentage / 100),
                          )}{" "}
                      {getCurrencySymbol(currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* More options link */}
              <button
                type="button"
                onClick={() => setFormView('options')}
                className="text-sm text-[#171717] underline font-medium"
              >
                {t("moreOptions")}
              </button>
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

            {/* Password validation error */}
            {formErrors.password && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{formErrors.password}</p>
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
                  (selectedFiles.length === 0 && !reuseTransferData) ||
                  selectedFilesSize > maxUploadSize
                }
                onClick={handleTransfer}
              >
                {t("transfer")}
              </button>
            </div>
          </div>
        ) : (
          <div key="form-options" className="animate-slideInRight">
            {/* Back button */}
            <button
              type="button"
              onClick={() => setFormView('main')}
              className="flex items-center gap-1 text-sm text-[#5E53E0] hover:text-[#4a42b3] mb-4 transition-colors"
            >
              <NavArrowLeft className="w-4 h-4" />
              {t("back")}
            </button>

            {/* Option Fields */}
            <div className="space-y-4">
              {/* Expiry Duration Selector */}
              {tierLimitsData && onTransferOptionsChange && transferOptions && (
                <div>
                  <select
                    value={transferOptions.validityDuration}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) return;
                      const days = parseInt(value, 10);
                      if (isNaN(days)) return;
                      if (tierLimitsData.isValidityAvailable(days, userTier)) {
                        onTransferOptionsChange({
                          ...transferOptions,
                          validityDuration: value,
                        });
                      }
                    }}
                    className="ze-form-select"
                    disabled={tierLimitsData.isLoading}
                  >
                    <option value="" disabled>
                      {tierLimitsData.isLoading
                        ? tOptions("loading")
                        : tOptions("validityDuration")}
                    </option>
                    {(tierLimitsData.allValidityOptions ?? []).map((option) => {
                      const isAvailable = tierLimitsData.isValidityAvailable(
                        option.days,
                        userTier,
                      );
                      const requiredTier = !isAvailable
                        ? tierLimitsData.getRequiredTierForValidity(option.days)
                        : null;
                      const tierBadge = requiredTier
                        ? ` (${tOptions(getTierTranslationKey(requiredTier))})`
                        : "";
                      return (
                        <option
                          key={option.value}
                          value={option.value}
                          disabled={!isAvailable}
                        >
                          {tOptions(option.labelKey)}
                          {tierBadge}
                        </option>
                      );
                    })}
                  </select>

                  {/* 1-day expiry warning */}
                  {transferOptions.validityDuration === "1" && (
                    <p className="text-xs text-yellow-600 mt-1.5 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                      {t("shortExpiryWarning")}
                    </p>
                  )}
                </div>
              )}

              {/* Message */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("message")}
                className="ze-form-input resize-none pt-4"
                rows={2}
                style={{ height: "60px" }}
              />

              {/* Access Control */}
              {transferOptions && (
                <select
                  value={transferOptions.accessControl}
                  onChange={(e) => handleAccessControlChange(e.target.value)}
                  className="ze-form-select"
                >
                  <option value="" disabled>{tOptions("accessControl")}</option>
                  <option value="private">{tOptions("accessPrivate")}</option>
                  <option value="public">{tOptions("accessPublic")}</option>
                  <option value="password">{tOptions("accessPassword")}</option>
                </select>
              )}

              {/* Password — conditional */}
              {transferOptions?.accessControl === "password" && (
                <div className="transition-all duration-200 ease-in-out">
                  <input
                    type="password"
                    value={transferOptions.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder={tOptions("setPassword")}
                    className={`ze-form-input ${isPasswordTooShort ? "border-red-500" : ""}`}
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                  {isPasswordTooShort && (
                    <p className="text-red-500 text-xs mt-1">
                      {tOptions("passwordMinLength", { min: MIN_PASSWORD_LENGTH })}
                    </p>
                  )}
                </div>
              )}

              {/* Size Limit */}
              {tierLimitsData && transferOptions && (
                <select
                  value={transferOptions.sizeLimit}
                  onChange={(e) => handleSizeLimitChange(e.target.value)}
                  className="ze-form-select"
                  disabled={tierLimitsData.isLoading}
                >
                  <option value="" disabled>
                    {tierLimitsData.isLoading ? tOptions("loading") : tOptions("sizeLimitLabel")}
                  </option>
                  {sizeLimitOptions.map((option) => {
                    const isAvailable = tierLimitsData.isSizeLimitAvailable(option.sizeGB, userTier) ?? true;
                    const requiredTier = !isAvailable ? tierLimitsData.getRequiredTierForSize(option.sizeGB) : null;
                    const tierBadge = requiredTier ? ` (${tOptions(getTierTranslationKey(requiredTier))})` : '';
                    return (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={!isAvailable}
                        className={!isAvailable ? 'text-gray-400' : ''}
                      >
                        {tOptions(option.labelKey)}{tierBadge}
                      </option>
                    );
                  })}
                </select>
              )}

              {/* Wallpaper Upload */}
              {transferOptions && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-2 block">
                    {tOptions("wallpaperLabel")}
                    {isWallpaperDisabled && (
                      <span className="ml-1 text-[#5E53E0] text-[10px] font-semibold uppercase">
                        ({tOptions("starterTier")})
                      </span>
                    )}
                  </label>

                  <input
                    ref={wallpaperInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleWallpaperSelect}
                    className="hidden"
                    disabled={isWallpaperDisabled}
                  />

                  {transferOptions.wallpaperPreview ? (
                    <div className="relative inline-block">
                      <div className="w-[80px] h-[80px] rounded border-2 border-[#87E64B] overflow-hidden">
                        <Image
                          src={transferOptions.wallpaperPreview}
                          alt={tOptions("wallpaperPreview")}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveWallpaper}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        aria-label={tOptions("removeWallpaper")}
                      >
                        <Xmark className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !isWallpaperDisabled && wallpaperInputRef.current?.click()}
                      className={`w-full h-[60px] rounded border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
                        isWallpaperDisabled
                          ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                          : 'cursor-pointer border-gray-300 bg-gray-50 hover:border-[#5E53E0] hover:bg-gray-100'
                      }`}
                      disabled={isWallpaperDisabled}
                    >
                      <MediaImagePlus className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-400">{tOptions("uploadWallpaper")}</span>
                    </button>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{tOptions("wallpaperHint")}</p>
                </div>
              )}
            </div>
          </div>
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
