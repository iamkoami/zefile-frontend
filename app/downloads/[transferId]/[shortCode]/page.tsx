"use client";

export const runtime = "edge";

/**
 * Transfer Landing Page
 *
 * Full landing page at /downloads/{transferId}/{shortCode}?tracking_params
 * Handles password protection, email/OTP verification, payment, and preview.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Lock,
  SmartphoneDevice,
  CreditCard,
  Download,
  Xmark,
  Eye,
  WarningCircle,
  MessageAlert,
} from "iconoir-react";
import Link from "next/link";
import Lottie from "lottie-react";
import catAnimation from "@/public/lotties/cat.json";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import LoadingPanel from "@/components/LoadingPanel";
import Header from "@/components/shared/Header";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";
import HeroText from "@/components/shared/HeroText";
import PaperPlaneAnimation from "@/components/shared/PaperPlaneAnimation";
import { useTimeOfDay } from "@/hooks/useTimeOfDay";
import ToastContainer from "@/components/shared/Toast";
import { TransferSummaryCard } from "@/components/shared/TransferSummaryCard";
import { transferApi, TransferDto } from "@/services/transfer-api";
import { paymentApi } from "@/services/payment-api";
import { storageApi } from "@/services/storage-api";
import { authApi } from "@/services/auth-api";
import { toast } from "@/components/shared/Toast";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import type { CountryCode } from "libphonenumber-js";
import usePaymentStatus from "@/hooks/usePaymentStatus";
import ReportIssueModal from "@/components/shared/ReportIssueModal";
import TransferPreviewModal from "@/features/transfer/components/TransferPreviewModal";
import { useDrawerStore } from "@/stores/drawer-store";
import FloatingPollWidget from "@/components/shared/FloatingPollWidget";

// Helper to extract sender email from senderId
const getSenderEmail = (transfer: TransferDto): string | undefined => {
  if (!transfer.senderId) return undefined;
  if (typeof transfer.senderId === "object") {
    return transfer.senderId.email;
  }
  return undefined;
};

// Tracking params interface (from documentation)
interface TrackingParams {
  z_exp: string | null; // Expiration timestamp (Unix)
  z_sid: string | null; // Session ID
  z_src: string | null; // Source (link, email, qr)
  z_network: string | null; // Network type (direct, social, sms)
  z_ts: string | null; // Access timestamp (Unix)
}

// Valid source values for access logging
type AccessSource = "link" | "email" | "qr";
// Valid network values for access logging
type AccessNetwork =
  | "direct"
  | "whatsapp"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "instagram"
  | "telegram"
  | "email"
  | "other";

type PageState =
  | "loading"
  | "password"
  | "email"
  | "otp"
  | "payment"
  | "phone-input"
  | "payment-prompt"
  | "preview"
  | "ready"
  | "error";

export default function TransferLandingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("transferLanding");
  const tPayment = useTranslations("payment");
  const tNotFound = useTranslations("notFound");
  const { timeOfDay } = useTimeOfDay();

  // Extract params from URL
  const transferId = params.transferId as string;
  const shortCode = params.shortCode as string;

  // Parse tracking params from URL query string (memoized to prevent useEffect re-runs)
  const trackingParams: TrackingParams = useMemo(
    () => ({
      z_exp: searchParams.get("z_exp"),
      z_sid: searchParams.get("z_sid"),
      z_src: searchParams.get("z_src"),
      z_network: searchParams.get("z_network"),
      z_ts: searchParams.get("z_ts"),
    }),
    [searchParams],
  );

  const { openDrawerToView } = useDrawerStore();

  // Store original page title on mount
  const originalTitleRef = useRef<string>(
    typeof document !== "undefined" ? document.title : "ZeFile",
  );

  // Page state
  const [pageState, setPageState] = useState<PageState>("loading");
  const [transfer, setTransfer] = useState<TransferDto | null>(null);
  const [error, setError] = useState<string>("");
  const [isExpiredError, setIsExpiredError] = useState(false);

  // Password form
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Payment form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    "mobile_money" | "card" | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  // Mobile money
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>("GH");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<MobileMoneyProvider | null>(null);
  const [providers, setProviders] = useState<
    Array<{ provider: MobileMoneyProvider; name: string; icon: string }>
  >([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Payment prompt
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Email confirmed (for logging access)
  const [emailConfirmed, setEmailConfirmed] = useState(false);

  // Access logging state
  const [accessLogged, setAccessLogged] = useState(false);

  // OTP verification
  const [otpValue, setOtpValue] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);

  // Payment status polling
  const {
    pollingStatus,
    error: pollingError,
    startPolling,
    stopPolling,
    reset: resetPolling,
  } = usePaymentStatus({
    interval: 3000,
    timeout: 120000,
    onSuccess: () => {
      toast.success(tPayment("paymentSuccessful"));
      setTimeout(() => {
        setPageState("ready");
      }, 2000);
    },
    onFailed: (payment) => {
      toast.error(payment.failureReason || tPayment("paymentFailed"));
    },
    onTimeout: () => {
      // Keep showing prompt
    },
  });

  // Load transfer data
  useEffect(() => {
    const loadTransfer = async () => {
      try {
        setPageState("loading");
        const response = await transferApi.getTransferByShortCode(shortCode);

        if (!response.error && response.data) {
          // Verify transferId matches (extra security)
          if (response.data.id !== transferId) {
            setError(t("transferNotFound"));
            setPageState("error");
            return;
          }

          setTransfer(response.data);

          if (response.data.status === "expired") {
            setError(t("transferExpired"));
            setIsExpiredError(true);
            setPageState("error");
            return;
          }

          if (response.data.status === "cancelled") {
            setError(t("transferCancelled"));
            setPageState("error");
            return;
          }

          if (response.data.status === "pending") {
            setError(t("transferNotReady"));
            setPageState("error");
            return;
          }

          // For password-protected transfers (accessControl === 'password'),
          // users must first verify their email, then enter the password.
          // The password flow is triggered after email verification in handleOtpVerify.
          // Always show download panel first (payment happens when clicking download)
          setPageState("ready");
        } else {
          setError(response.error?.message || t("transferNotFound"));
          setPageState("error");
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : t("transferNotFound");
        setError(errorMessage);
        setPageState("error");
      }
    };

    if (shortCode && transferId) {
      loadTransfer();
    }
  }, [shortCode, transferId, t]);

  // Update page title when transfer is loaded
  useEffect(() => {
    if (transfer) {
      document.title = `${t("downloadFiles")} | ZeFile`;
    }

    // Cleanup: restore original title on unmount
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [transfer, t]);

  // Log link access when page loads successfully
  useEffect(() => {
    const logAccess = async () => {
      if (!shortCode || !transfer || accessLogged) return;

      // Generate session ID if not provided
      const sessionId =
        trackingParams.z_sid ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;

      // Parse source and network from tracking params
      const source = (trackingParams.z_src as AccessSource) || "link";
      const network = (trackingParams.z_network as AccessNetwork) || "direct";

      try {
        await transferApi.logLinkAccess(shortCode, {
          sessionId,
          source,
          network,
          referrer:
            typeof document !== "undefined" ? document.referrer : undefined,
        });
        setAccessLogged(true);
      } catch (error) {
        // Fire-and-forget - don't block user experience on logging failure
        console.warn("Failed to log link access:", error);
      }
    };

    logAccess();
  }, [shortCode, transfer, accessLogged, trackingParams]);

  // Fetch mobile money providers
  useEffect(() => {
    if (pageState === "payment" || pageState === "phone-input") {
      fetchProviders();
    }
  }, [pageState]);

  // Start polling when in payment prompt state
  useEffect(() => {
    if (pageState === "payment-prompt" && paymentReference) {
      startPolling(paymentReference);
    }
    return () => stopPolling();
  }, [pageState, paymentReference, startPolling, stopPolling]);

  const fetchProviders = async () => {
    setLoadingProviders(true);
    try {
      const cachedCountry = localStorage.getItem("zefile_detected_country");
      let url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods`;
      if (cachedCountry) {
        url = `${process.env.NEXT_PUBLIC_API_URL}/v2/payments/methods/${cachedCountry}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      if (data.countryCode && data.countryCode !== "UNKNOWN") {
        localStorage.setItem("zefile_detected_country", data.countryCode);
      }
      setProviders(data.mobileMoney || []);
      if (data.mobileMoney?.length > 0) {
        setSelectedProvider(data.mobileMoney[0].provider);
      }
    } catch {
      const fallback = [
        {
          provider: "mtn_momo" as MobileMoneyProvider,
          name: "MTN Mobile Money",
          icon: "mtn",
        },
        {
          provider: "vodafone_cash" as MobileMoneyProvider,
          name: "Vodafone Cash",
          icon: "vodafone",
        },
        {
          provider: "airtel_tigo" as MobileMoneyProvider,
          name: "AirtelTigo Money",
          icon: "airtel",
        },
      ];
      setProviders(fallback);
      setSelectedProvider("mtn_momo");
    } finally {
      setLoadingProviders(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !transfer) return;

    setIsLoading(true);
    setError("");

    try {
      // Use dedicated password verification endpoint
      const response = await storageApi.verifyTransferPassword(shortCode, password);

      if (!response.error && response.data?.success) {
        // Password verified - go to ready state and open preview drawer
        setPageState("ready");
        openDrawerToView("transfers", "transfer-preview", transfer, "receiver");
      } else {
        setError(t("incorrectPassword"));
        setPassword(""); // Clear password on error per AC3
      }
    } catch {
      setError(t("incorrectPassword"));
      setPassword(""); // Clear password on error per AC3
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = useCallback(
    (phone: string, isValid: boolean, countryCode: CountryCode) => {
      setPhoneNumber(phone);
      setIsPhoneValid(isValid);
      setPhoneCountryCode(countryCode);
    },
    [],
  );

  // Handle email confirmation - requests OTP
  const handleEmailConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerEmail || !transfer) return;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(tPayment("invalidEmail"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Check if email is authorized to access this transfer
      if (!isEmailAuthorized(customerEmail)) {
        setError(t("unauthorized"));
        setIsLoading(false);
        return;
      }

      // Request OTP using standard flow
      const response = await authApi.requestOTP({ email: customerEmail });

      if (response.error) {
        toast.error(response.error.message || t("error"));
        setIsLoading(false);
        return;
      }

      if (response.data) {
        setIsNewUser(response.data.isNewUser);
        setOtpExpiresIn(300); // Default 5 minutes
        setCanResendOtp(false);
        // Start countdown for resend
        setTimeout(() => setCanResendOtp(true), 30000); // 30 seconds
        setPageState("otp");
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue || !customerEmail) return;

    setIsLoading(true);
    setError("");

    try {
      // Verify OTP using standard flow (creates account if new user)
      const response = await authApi.verifyOTP({
        email: customerEmail,
        otp: otpValue,
      });

      if (response.error) {
        setError(response.error.message || t("invalidOtp"));
        setIsLoading(false);
        return;
      }

      // User is now logged in (account created if new)
      // Log recipient access
      try {
        await transferApi.logRecipientAccess(shortCode, customerEmail);
      } catch {
        console.warn("Failed to log recipient access");
      }

      setEmailConfirmed(true);

      // For password-protected transfers, go to password state
      // Otherwise, go directly to ready state and open preview
      if (transfer?.accessControl === "password") {
        setPageState("password");
      } else {
        setPageState("ready");
        // Open SideDrawer with TransferPreviewPanel
        if (transfer) {
          openDrawerToView("transfers", "transfer-preview", transfer, "receiver");
        }
      }
    } catch {
      setError(t("invalidOtp"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (!canResendOtp || !customerEmail) return;

    setIsLoading(true);

    try {
      // Resend OTP using standard flow
      const response = await authApi.requestOTP({ email: customerEmail });

      if (response.error) {
        toast.error(response.error.message || t("error"));
      } else {
        toast.success(t("otpResent"));
        setCanResendOtp(false);
        setTimeout(() => setCanResendOtp(true), 30000);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user email is authorized to access this transfer
  // - Public transfers: any email is authorized
  // - Private/Password transfers: only listed recipients are authorized
  // - Missing accessControl (older transfers): defaults to private behavior
  const isEmailAuthorized = (email: string): boolean => {
    if (!transfer) return false;

    // Public transfers allow any email
    if (transfer.accessControl === 'public') {
      return true;
    }

    // Private and password modes require listed recipient (case-insensitive)
    const normalizedEmail = email.toLowerCase();
    return (
      transfer.recipientEmails?.some(
        (recipientEmail) => recipientEmail.toLowerCase() === normalizedEmail,
      ) || false
    );
  };

  // Handle clicking preview button from ready state
  const handlePreviewClick = () => {
    if (!transfer) return;

    // Check if user is already logged in
    const user = authApi.getStoredUser();

    if (user?.email) {
      // User is logged in - check if their email is authorized
      if (isEmailAuthorized(user.email)) {
        // Authorized - open SideDrawer with TransferPreviewPanel
        setCustomerEmail(user.email);
        setEmailConfirmed(true);
        openDrawerToView("transfers", "transfer-preview", transfer, "receiver");
      } else {
        // Not authorized - show error
        setError(t("unauthorized"));
        setPageState("error");
      }
    } else {
      // Not logged in - show email confirmation panel
      setPageState("email");
    }
  };

  const handlePaymentContinue = async () => {
    if (!selectedPaymentType || !transfer) return;

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(tPayment("invalidEmail"));
      return;
    }

    if (selectedPaymentType === "mobile_money") {
      setPageState("phone-input");
    } else {
      setIsLoading(true);
      try {
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "card",
        });

        if (response.error) {
          toast.error(response.error.message || tPayment("paymentInitFailed"));
          return;
        }

        if (response.data?.authorizationUrl) {
          window.location.href = response.data.authorizationUrl;
        }
      } catch {
        toast.error(tPayment("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMobileMoneySubmit = async () => {
    if (!isPhoneValid || !transfer || !selectedProvider) return;

    setIsLoading(true);

    try {
      const response = await paymentApi.initializePaymentV2({
        transferId: transfer.id,
        customerEmail: customerEmail,
        requestedCurrency: transfer.currency,
        paymentMethod: "mobile_money",
        mobileMoneyProvider: selectedProvider,
        phoneNumber: phoneNumber,
      });

      if (response.error) {
        toast.error(response.error.message || tPayment("paymentInitFailed"));
        setIsLoading(false);
        return;
      }

      if (response.data) {
        setPaymentReference(response.data.reference);
        setPaymentAmount(response.data.pricingAmountMinorUnits);
        setPageState("payment-prompt");
      }
    } catch {
      toast.error(tPayment("paymentInitFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!transfer) return;

    setIsDownloading(true);

    try {
      const response = await storageApi.streamZipDownload(
        transfer.shortCode,
        password || undefined,
      );

      if (response.error) {
        toast.error(response.error.message || t("downloadFailed"));
      }
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateTotalSize = (): number => {
    if (!transfer?.files) return 0;
    return transfer.files.reduce((acc, file) => {
      // Backend uses fileSize, but some places may use size
      const fileSize = Number(file.fileSize) || Number(file.size) || 0;
      return acc + fileSize;
    }, 0);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getDaysUntilExpiry = (): string => {
    if (!transfer?.expireAt) return "";
    const now = new Date();
    const expiry = new Date(transfer.expireAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return t("expired");
    return `${diffDays} ${diffDays === 1 ? tPayment("day") : tPayment("days")}`;
  };

  const getProviderName = (provider?: string): string => {
    const names: Record<string, string> = {
      mtn_momo: "MTN Mobile Money",
      vodafone_cash: "Vodafone Cash",
      airtel_tigo: "AirtelTigo Money",
      mpesa: "M-Pesa",
      airtel_money: "Airtel Money",
      orange_money: "Orange Money",
      wave: "Wave",
    };
    return names[provider || ""] || provider || "";
  };

  const fileCount = transfer?.files?.length || 0;

  // Loading state
  if (pageState === "loading") {
    return <LoadingFullscreen />;
  }

  // Error state
  if (pageState === "error") {
    // Enhanced UI for expired transfers
    if (isExpiredError) {
      return (
        <div className="min-h-screen bg-white">
          <Header />
          <main
            style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}
          >
            <div
              className={`ze-content-panel ze-time-${timeOfDay}`}
              style={{ position: "relative", overflow: "hidden" }}
            >
              <TimeOfDayBackground timeOfDay={timeOfDay} />
              <HeroText isVisible={true} timeOfDay={timeOfDay} />
              <PaperPlaneAnimation isVisible={true} />
              <div
                className="ze-panels-container"
                style={{ position: "relative", zIndex: 10 }}
              >
                <div className="ze-upload-panel text-center py-8">
                  <div className="align-center mx-auto mb-3">
                    <Lottie
                      animationData={catAnimation}
                      loop={true}
                      autoplay={true}
                      style={{
                        width: "300px",
                        height: "auto",
                      }}
                    />
                  </div>
                  <h1 className="text-2xl font-bold text-[#171717] mb-3">
                    {tNotFound("transferExpiredTitle")}
                  </h1>
                  <p className="text-gray-600 text-sm font-medium max-w-md mx-auto mb-8 leading-relaxed">
                    {tNotFound("transferExpiredSubtitle")}
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
                  >
                    {tNotFound("startTransfer")}
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    // Generic error UI for other errors
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel text-center">
                <WarningCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-[#171717] mb-2">
                  {t("error")}
                </h1>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Password protection state
  if (pageState === "password") {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel">
                {/* Lock Icon */}
                <div className="flex flex-col items-center mb-6">
                  <Lock className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                </div>

                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t("passwordProtected")}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("enterPasswordToAccess")}
                </p>

                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type={isPasswordVisible ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("enterPassword")}
                        className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent pr-12 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-500 mt-2">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !password.trim()}
                    className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("unlockTransfer")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Payment state
  if (pageState === "payment") {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container flex-col lg:flex-row gap-6"
              style={{ position: "relative", zIndex: 10 }}
            >
              {/* Payment Form Panel */}
              <div className="ze-upload-panel" style={{ maxWidth: "400px" }}>
                <h1 className="text-xl font-bold text-[#171717] mb-1">
                  {tPayment("securePayment")}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  {tPayment("makePaymentToDownload")}
                </p>

                {/* Name Input */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={tPayment("yourName")}
                    className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent text-sm"
                  />
                </div>

                {/* Email Input */}
                <div className="mb-4">
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder={tPayment("yourEmail")}
                    className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent text-sm"
                  />
                </div>

                {/* Payment Method Section */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-[#171717] mb-3">
                    {tPayment("paymentMethodTitle")}
                  </h3>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedPaymentType("mobile_money")}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 rounded transition-all ${
                        selectedPaymentType === "mobile_money"
                          ? "border-[#5E53E0] bg-[#5E53E0]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <SmartphoneDevice
                        className={`w-6 h-6 ${selectedPaymentType === "mobile_money" ? "text-[#5E53E0]" : "text-gray-400"}`}
                      />
                      <span className="font-medium text-[#171717] text-sm">
                        {tPayment("mobileMoney")}
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedPaymentType("card")}
                      className={`flex-1 flex flex-col items-center justify-center gap-2 p-4 border-2 rounded transition-all ${
                        selectedPaymentType === "card"
                          ? "border-[#5E53E0] bg-[#5E53E0]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <CreditCard
                        className={`w-6 h-6 ${selectedPaymentType === "card" ? "text-[#5E53E0]" : "text-gray-400"}`}
                      />
                      <span className="font-medium text-[#171717] text-sm">
                        {tPayment("bankCard")}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => router.push("/")}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3.5 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    {tPayment("cancel")}
                  </button>
                  <button
                    onClick={handlePaymentContinue}
                    disabled={
                      !selectedPaymentType || !customerEmail || isLoading
                    }
                    className="flex-1 px-4 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {tPayment("payAndDownload")}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>{tPayment("securityGuarantee")}</p>
                </div>
              </div>

              {/* Transfer Summary */}
              {transfer && (
                <div className="w-full lg:w-[300px] flex-shrink-0">
                  <TransferSummaryCard
                    title={transfer.title || "Untitled"}
                    fileCount={transfer.files?.length || 0}
                    totalSize={calculateTotalSize()}
                    price={transfer.price || 0}
                    currency={transfer.currency || "XOF"}
                    message={transfer.message}
                    createdAt={transfer.createdAt}
                    senderEmail={getSenderEmail(transfer)}
                    versionCount={transfer.versionCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Phone input state (Mobile Money)
  if (pageState === "phone-input") {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container flex-col lg:flex-row gap-6"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel" style={{ maxWidth: "400px" }}>
                <h1 className="text-xl font-bold text-[#171717] mb-1">
                  {tPayment("enterPhoneNumber")}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  {tPayment("enterPhoneForMobileMoney")}
                </p>

                {/* Provider Selection */}
                {loadingProviders ? (
                  <LoadingPanel className="py-4" />
                ) : (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-[#171717] mb-2">
                      {tPayment("selectProvider")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {providers.map((provider) => (
                        <button
                          key={provider.provider}
                          onClick={() => setSelectedProvider(provider.provider)}
                          className={`px-3 py-2 border-2 rounded font-medium transition-all text-sm ${
                            selectedProvider === provider.provider
                              ? "border-[#5E53E0] bg-[#5E53E0]/5 text-[#5E53E0]"
                              : "border-gray-200 text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {provider.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phone Input */}
                <div className="mb-6">
                  <PhoneNumberInput
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    defaultCountry={phoneCountryCode}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setPageState("payment")}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3.5 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    {tPayment("cancel")}
                  </button>
                  <button
                    onClick={handleMobileMoneySubmit}
                    disabled={!isPhoneValid || !selectedProvider || isLoading}
                    className="flex-1 px-4 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {tPayment("payAndDownload")}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>{tPayment("securityGuarantee")}</p>
                </div>
              </div>

              {/* Transfer Summary */}
              {transfer && (
                <div className="w-full lg:w-[300px] flex-shrink-0">
                  <TransferSummaryCard
                    title={transfer.title || "Untitled"}
                    fileCount={transfer.files?.length || 0}
                    totalSize={calculateTotalSize()}
                    price={transfer.price || 0}
                    currency={transfer.currency || "XOF"}
                    message={transfer.message}
                    createdAt={transfer.createdAt}
                    senderEmail={getSenderEmail(transfer)}
                    versionCount={transfer.versionCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Payment prompt state (STK Push waiting)
  if (pageState === "payment-prompt") {
    const isSuccess = pollingStatus === "success";
    const isFailed = pollingStatus === "failed";
    const isTimeout = pollingStatus === "timeout";
    const isPolling = pollingStatus === "polling";

    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container flex-col lg:flex-row gap-6"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel" style={{ maxWidth: "400px" }}>
                {/* Status Icon */}
                <div className="flex justify-center mb-4">
                  {isSuccess ? (
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Download className="w-8 h-8 text-green-600" />
                    </div>
                  ) : isFailed ? (
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <Xmark className="w-8 h-8 text-red-600" />
                    </div>
                  ) : isTimeout ? (
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                      <WarningCircle className="w-8 h-8 text-yellow-600" />
                    </div>
                  ) : (
                    <LoadingPanel />
                  )}
                </div>

                {/* Status Message */}
                <div className="text-center mb-4">
                  {isSuccess ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment("paymentSuccessful")}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {t("readyToDownload")}
                      </p>
                    </>
                  ) : isFailed ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment("paymentFailed")}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {pollingError || tPayment("youWereNotCharged")}
                      </p>
                    </>
                  ) : isTimeout ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment("takingLongerThanUsual")}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {tPayment("didntReceivePrompt")}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] mb-2">
                        {tPayment("checkYourPhone")}
                      </h1>
                      <p className="text-sm text-gray-600">
                        {tPayment("confirmPaymentOn")}
                      </p>
                    </>
                  )}
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">{tPayment("payWith")}</span>
                    <span className="font-medium text-[#171717]">
                      {getProviderName(selectedProvider || "")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">
                      {tPayment("phoneNumber")}
                    </span>
                    <span className="font-medium text-[#171717]">
                      {phoneNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600">{tPayment("amount")}</span>
                    <span className="font-bold text-[#171717]">
                      {paymentAmount
                        ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`
                        : ""}
                    </span>
                  </div>
                </div>

                {/* Polling Status */}
                {isPolling && (
                  <p className="text-xs text-gray-500 text-center mb-4">
                    {tPayment("waitingForConfirmation")}
                  </p>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {isSuccess && (
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      {t("downloadFiles")}
                    </button>
                  )}

                  {(isFailed || isTimeout) && (
                    <button
                      onClick={() => {
                        resetPolling();
                        setPageState("phone-input");
                      }}
                      className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
                    >
                      {tPayment("resend")}
                    </button>
                  )}

                  {!isSuccess && (
                    <button
                      onClick={() => {
                        resetPolling();
                        setPageState("payment");
                      }}
                      className="w-full px-6 py-3.5 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors text-sm"
                    >
                      {tPayment("useDifferentMethod")}
                    </button>
                  )}
                </div>
              </div>

              {/* Transfer Summary */}
              {transfer && (
                <div className="w-full lg:w-[300px] flex-shrink-0">
                  <TransferSummaryCard
                    title={transfer.title || "Untitled"}
                    fileCount={transfer.files?.length || 0}
                    totalSize={calculateTotalSize()}
                    price={transfer.price || 0}
                    currency={transfer.currency || "XOF"}
                    message={transfer.message}
                    createdAt={transfer.createdAt}
                    senderEmail={getSenderEmail(transfer)}
                    versionCount={transfer.versionCount}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Email confirmation state
  if (pageState === "email" && transfer) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel">
                {/* Email Icon */}
                <div className="flex flex-col items-center mb-6">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-300"
                  >
                    <rect
                      x="8"
                      y="16"
                      width="48"
                      height="32"
                      rx="4"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      d="M8 20L32 36L56 20"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t("enterEmailToAccess")}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("emailRequiredForAccess")}
                </p>

                {/* Email Form */}
                <form onSubmit={handleEmailConfirm}>
                  <div className="mb-4">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={t("yourEmail")}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent text-sm"
                      required
                      autoFocus
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-2">{error}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !customerEmail.trim()}
                    className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t("loading") : t("continue")}
                  </button>
                </form>

                {/* Back Link */}
                <button
                  onClick={() => setPageState("ready")}
                  className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← {tPayment("cancel")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // OTP verification state
  if (pageState === "otp" && transfer) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel">
                {/* Lock Icon */}
                <div className="flex flex-col items-center mb-6">
                  <Lock className="w-12 h-12 text-gray-300" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t("verifyEmail")}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {t("otpSentTo")}{" "}
                  <span className="font-medium text-[#171717]">
                    {customerEmail}
                  </span>
                </p>

                {/* OTP Form */}
                <form onSubmit={handleOtpVerify}>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={otpValue}
                      onChange={(e) =>
                        setOtpValue(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      placeholder={t("enterOtp")}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent text-md text-bold text-center tracking-widest font-mono text-lg"
                      maxLength={6}
                      required
                      autoFocus
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-2 text-center">
                        {error}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpValue.length !== 6}
                    className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? t("loading") : t("verifyAndContinue")}
                  </button>
                </form>

                {/* Resend OTP */}
                <div className="text-center mt-4">
                  {canResendOtp ? (
                    <button
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-sm text-[#5E53E0] hover:underline disabled:opacity-50"
                    >
                      {t("resendOtp")}
                    </button>
                  ) : (
                    <p className="text-sm text-gray-400">{t("resendOtpIn")}</p>
                  )}
                </div>

                {/* Back Link */}
                <button
                  onClick={() => {
                    setOtpValue("");
                    setError("");
                    setPageState("email");
                  }}
                  className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← {t("changeEmail")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Preview state - shows file preview modal
  // For paid transfers, shows payment button. For free transfers, shows download button.
  if (pageState === "preview" && transfer) {
    const isPaidTransfer = transfer.price && transfer.price > 0;
    const formatPrice = (price: number, currency: string) => {
      if (currency === "XOF") return `${price.toLocaleString()} Fr CFA`;
      return `${price.toLocaleString()} ${currency}`;
    };

    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />

        {/* Preview Modal */}
        <TransferPreviewModal
          files={
            transfer.files?.map((f) => ({
              id: f.id,
              filename: f.filename || f.fileName || "Unknown file",
              size: Number(f.size || f.fileSize || 0),
              mimeType: f.mimeType || f.fileType || "application/octet-stream",
              thumbnailUrl: f.thumbnailUrl,
            })) || []
          }
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          isPaid={false}
        />

        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel">
                {/* Preview Active Info */}
                <div className="flex flex-col items-center mb-6">
                  <Eye className="w-12 h-12 text-[#5E53E0]" />
                </div>

                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t("previewingFiles")}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-4">
                  {fileCount} {fileCount === 1 ? t("file") : t("files")} •{" "}
                  {formatSize(calculateTotalSize())}
                </p>

                {/* View Files Button */}
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="w-full px-6 py-3 mb-4 border border-gray-200 text-[#171717] font-medium rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  {t("preview")}
                </button>

                {/* Price Info for Paid Transfers */}
                {isPaidTransfer && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {tPayment("price")}
                      </span>
                      <span className="font-bold text-[#171717]">
                        {formatPrice(
                          transfer.price!,
                          transfer.currency || "XOF",
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Download/Payment Button */}
                {isPaidTransfer ? (
                  <button
                    onClick={() => setPageState("payment")}
                    className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    {t("payAndDownload")}
                  </button>
                ) : (
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {isDownloading
                      ? t("preparingDownload")
                      : t("downloadFiles")}
                  </button>
                )}

                {/* Back Link */}
                <button
                  onClick={() => setPageState("ready")}
                  className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  ← {tPayment("cancel")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Ready to download state (free transfer or paid)
  if (pageState === "ready" && transfer) {
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        <Header />

        {/* Report Issue Modal */}
        {showDisputeModal && (
          <ReportIssueModal
            transferId={transfer.id}
            shortCode={shortCode}
            role="recipient"
            onClose={() => setShowDisputeModal(false)}
          />
        )}

        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ze-time-${timeOfDay}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <TimeOfDayBackground timeOfDay={timeOfDay} />
            <HeroText isVisible={true} timeOfDay={timeOfDay} />
            <PaperPlaneAnimation isVisible={true} />
            <div
              className="ze-panels-container"
              style={{ position: "relative", zIndex: 10 }}
            >
              <div className="ze-upload-panel">
                {/* Download Arrow Icon */}
                <div className="flex flex-col items-center mb-6">
                  <Download
                    className="w-30 h-30 text-gray-300"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-[#171717] text-center mb-2">
                  {t("downloadFiles")} !
                </h1>

                {/* Expiry Info */}
                {transfer.expireAt && (
                  <p className="text-sm font-medium text-gray-500 text-center mb-1">
                    {t("filesExpireIn")}
                  </p>
                )}
                {transfer.expireAt && (
                  <p className="text-sm font-bold text-[#171717] text-center mb-6">
                    {getDaysUntilExpiry()}
                  </p>
                )}

                {/* Transfer Title */}
                <h2 className="text-base font-bold text-[#171717] mb-4">
                  {transfer.title || t("untitled")}
                </h2>

                {/* File Info Row */}
                <div className="flex items-center justify-between py-5 px-4 bg-gray-100 rounded mb-6">
                  <div>
                    <p className="text-sm font-medium text-[#171717]">
                      {fileCount} {fileCount === 1 ? t("file") : t("files")}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-400">
                    {formatSize(calculateTotalSize())}
                  </p>
                </div>

                {/* Report Link */}
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="flex w-full justify-center items-center gap-2 text-sm text-gray-400 hover:text-gray-500 mb-6 transition-colors"
                >
                  <MessageAlert className="w-4 h-4" />
                  {t("reportTransfer")}
                </button>

                {/* Preview Button - Goes to email confirmation */}
                <button
                  onClick={handlePreviewClick}
                  className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
                >
                  {t("preview")}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Floating Poll Widget */}
        <FloatingPollWidget trigger="manual" />
      </div>
    );
  }

  return null;
}
