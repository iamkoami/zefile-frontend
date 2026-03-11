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
import StepIndicator from "@/components/shared/StepIndicator";
import { useParams, useSearchParams } from "next/navigation";
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
  NavArrowDown,
  Globe,
  Bank,
  Hashtag,
} from "iconoir-react";
import Link from "next/link";
import Image from "next/image";
import Flag from "react-flagpack";
import Lottie from "lottie-react";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import LoadingPanel from "@/components/LoadingPanel";
import Header from "@/components/shared/Header";
import BrandedHeader from "@/components/shared/BrandedHeader";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";
import HeroText from "@/components/shared/HeroText";
import PaperPlaneAnimation from "@/components/shared/PaperPlaneAnimation";
import { useTimeOfDay, type TimeOfDay } from "@/hooks/useTimeOfDay";
import { useCustomBranding } from "@/hooks/useCustomBranding";

import ToastContainer from "@/components/shared/Toast";
import { TransferSummaryCard } from "@/components/shared/TransferSummaryCard";
import { transferApi, TransferDto } from "@/services/transfer-api";
import { platformApi } from "@/services/platform-api";
import { paymentApi, type PaymentMethodInfo } from "@/services/payment-api";
import { storageApi } from "@/services/storage-api";
import { authApi } from "@/services/auth-api";
import { toast } from "@/components/shared/Toast";
import { safePaymentRedirect } from "@/utils/security";
import { getCurrentUserEmail, getCurrentUserName } from "@/utils/auth";
import type { MobileMoneyProvider } from "@/features/payment/components/PaymentMethodSelector";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import type { CountryCode } from "libphonenumber-js";
import usePaymentStatus from "@/hooks/usePaymentStatus";
import ReportIssueModal from "@/components/shared/ReportIssueModal";
import TransferPreviewModal from "@/features/transfer/components/TransferPreviewModal";
import { useDrawerStore } from "@/stores/drawer-store";
import FloatingPollWidget from "@/components/shared/FloatingPollWidget";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { useChatStore } from "@/stores/chat-store";
import {
  trackPaymentPageViewed,
  trackPaymentPageAbandoned,
} from "@/lib/posthog";

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
  | "payment"
  | "payment-prompt"
  | "preview"
  | "ready"
  | "downloaded"
  | "error";

function ContentPanelBackground({
  wallpaperUrl,
  timeOfDay,
  isAuthenticated,
  showUpgradeCta,
  onUpgradeClick,
}: {
  wallpaperUrl?: string;
  timeOfDay: TimeOfDay;
  isAuthenticated?: boolean;
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
}) {
  if (wallpaperUrl) {
    // Sanitize URL to prevent CSS injection via url() breakout
    const safeUrl = wallpaperUrl.replace(/['"()]/g, encodeURIComponent);
    return (
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-2xl"
        style={{ backgroundImage: `url('${safeUrl}')` }}
      />
    );
  }
  return (
    <>
      <TimeOfDayBackground timeOfDay={timeOfDay} />
      <HeroText
        isVisible={true}
        timeOfDay={timeOfDay}
        isAuthenticated={isAuthenticated}
        showUpgradeCta={showUpgradeCta}
        onUpgradeClick={onUpgradeClick}
      />
      <PaperPlaneAnimation isVisible={true} timeOfDay={timeOfDay} />
    </>
  );
}

export default function TransferLandingPage() {
  const { transferId, shortCode } = useParams<{
    transferId: string;
    shortCode: string;
  }>();

  const searchParams = useSearchParams();
  const t = useTranslations("transferLanding");
  const tPayment = useTranslations("payment");
  const tNotFound = useTranslations("notFound");
  const { timeOfDay } = useTimeOfDay();

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

  const { openDrawer, openDrawerToView, setRecipientEmail } = useDrawerStore();

  // Store original page title on mount
  const originalTitleRef = useRef<string>(
    typeof document !== "undefined" ? document.title : "ZeFile",
  );

  // Page state
  const [pageState, setPageState] = useState<PageState>("loading");
  const [transfer, setTransfer] = useState<TransferDto | null>(null);

  // Unified branding: cookie (custom domain) > API senderBranding > default
  const { isBranded, activeBranding } = useCustomBranding(
    transfer?.senderBranding,
  );

  // Render branded or standard header
  const pageHeader =
    isBranded && activeBranding ? (
      <BrandedHeader branding={activeBranding} />
    ) : (
      <Header />
    );
  const [error, setError] = useState<string>("");
  const [errorType, setErrorType] = useState<
    "not-found" | "expired" | "cancelled" | "not-ready" | "generic" | null
  >(null);

  // Password form
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  // Session token received after successful password verification (replaces plaintext password for subsequent requests)
  const [passwordSessionToken, setPasswordSessionToken] = useState<
    string | null
  >(null);

  // Payment form
  const isLoggedIn = !!getCurrentUserEmail();
  const loggedInName = getCurrentUserName();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState(() => {
    return getCurrentUserEmail() || "";
  });
  const [isLoading, setIsLoading] = useState(false);

  // Country-based payment methods
  const DOWNLOAD_PAYMENT_COUNTRIES = useMemo(
    () => [
      {
        code: "CI",
        name: "Côte d'Ivoire",
        flagCode: "CI" as string | null,
        phoneCode: "CI" as CountryCode | null,
      },
      {
        code: "NG",
        name: "Nigeria",
        flagCode: "NG" as string | null,
        phoneCode: "NG" as CountryCode | null,
      },
      {
        code: "GH",
        name: "Ghana",
        flagCode: "GH" as string | null,
        phoneCode: "GH" as CountryCode | null,
      },
      {
        code: "KE",
        name: "Kenya",
        flagCode: "KE" as string | null,
        phoneCode: "KE" as CountryCode | null,
      },
      {
        code: "TG",
        name: "Togo",
        flagCode: "TG" as string | null,
        phoneCode: "TG" as CountryCode | null,
      },
      {
        code: "BJ",
        name: "Benin",
        flagCode: "BJ" as string | null,
        phoneCode: "BJ" as CountryCode | null,
      },
      { code: "INTL", name: "International", flagCode: null, phoneCode: null },
    ],
    [],
  );

  const [selectedCountry, setSelectedCountry] = useState(() => {
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem("zefile_detected_country")
        : null;
    if (cached) {
      const found = DOWNLOAD_PAYMENT_COUNTRIES.find((c) => c.code === cached);
      if (found) return found;
    }
    return DOWNLOAD_PAYMENT_COUNTRIES[0];
  });
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodInfo | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  // Mobile money phone
  const [phoneNumber, setPhoneNumber] = useState("");
  const [, setPhoneCountryCode] = useState<CountryCode>(() => {
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem("zefile_detected_country")
        : null;
    return (cached && cached !== "INTL" ? cached : "CI") as CountryCode;
  });
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  // Auth state — controls HeroText CTA visibility
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier, setUserTier] = useState<"free" | "starter" | "pro">("free");
  useEffect(() => {
    const user = authApi.getStoredUser();
    if (!user) {
      setIsAuthenticated(false);
      setUserTier("free");
      return;
    }
    setIsAuthenticated(true);
    platformApi.getUserConfig().then((response) => {
      if (response.data) {
        const tier = (response.data.tier?.toLowerCase() || "free") as
          | "free"
          | "starter"
          | "pro";
        setUserTier(tier);
      }
    });
  }, []);

  // Dynamic import for Lottie animation (F-4.1: reduce bundle size)
  const [catAnimationData, setCatAnimationData] = useState<any>(null);
  useEffect(() => {
    import("@/public/lotties/cat.json").then((m) =>
      setCatAnimationData(m.default),
    );
  }, []);

  // Payment prompt
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  // Processing fee breakdown (from payment initialization response)
  const [processingFee, setProcessingFee] = useState(0);
  const [processingFeePercent, setProcessingFeePercent] = useState(0);
  const [totalAmountCharged, setTotalAmountCharged] = useState(0);

  // Payment block (admin can disable all payments)
  // null = not yet checked, true = disabled, false = enabled
  const [paymentsDisabled, setPaymentsDisabled] = useState<boolean | null>(
    null,
  );

  // Poll eligibility check — replaces FloatingPollWidget's former self-fetch
  const { checkForPoll } = usePollEligibility();
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForPoll("manual");
    }, 2000);
    return () => clearTimeout(timer);
  }, [checkForPoll]);

  // Inject transfer context into ChatWidget store for context-aware support
  useEffect(() => {
    if (transfer) {
      useChatStore.getState().setContext({
        pageType: "download",
        shortCode,
        transferId,
        transferStatus: transfer.status,
        hasPassword: !!transfer.hasPassword,
        isExpired: transfer.status === "expired",
      });
    }
    return () => {
      useChatStore.getState().setContext(undefined);
    };
  }, [transfer, shortCode, transferId]);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Email confirmed (for logging access)
  const [_emailConfirmed, setEmailConfirmed] = useState(false);

  // Access logging state
  const [accessLogged, setAccessLogged] = useState(false);

  // Inline email + OTP flow: tracks whether email was submitted (OTP section visible)
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // OTP verification
  const [otpValue, setOtpValue] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [showNewUserBanner, setShowNewUserBanner] = useState(false);
  const [_otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up banner timer on unmount
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  // Focus OTP input when email is submitted and section slides in
  useEffect(() => {
    if (emailSubmitted) {
      const timer = setTimeout(() => otpInputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [emailSubmitted]);

  // Step indicator for multi-gate download flow
  const gateSteps = useMemo((): string[] => {
    if (!transfer) return [];
    const steps: string[] = [];
    if (transfer.accessControl !== "public") {
      steps.push(t("stepEmail"));
      steps.push(t("stepCode"));
    }
    if (transfer.accessControl === "password") {
      steps.push(t("stepPassword"));
    }
    return steps;
  }, [transfer, t]);

  const gateCurrentStep = useMemo((): number => {
    if (!transfer || gateSteps.length <= 1) return 0;
    if (pageState === "email" && !emailSubmitted) return 0;
    if (pageState === "email" && emailSubmitted) return 1;
    if (pageState === "password") {
      return gateSteps.indexOf(t("stepPassword"));
    }
    return gateSteps.length;
  }, [transfer, pageState, emailSubmitted, gateSteps, t]);

  // OTP resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpResendCountdown > 0) {
      timer = setTimeout(
        () => setOtpResendCountdown(otpResendCountdown - 1),
        1000,
      );
    } else if (otpResendCountdown === 0 && emailSubmitted) {
      setCanResendOtp(true);
    }
    return () => clearTimeout(timer);
  }, [otpResendCountdown, emailSubmitted]);

  // Payment analytics tracking refs (must be before usePaymentStatus)
  const paymentStartTimeRef = useRef<number | null>(null);
  const paymentCompletedRef = useRef(false);

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
      // Mark payment completed for analytics (prevent abandonment tracking)
      paymentCompletedRef.current = true;
      // Mark transfer as paid locally so UI reflects payment status
      setTransfer((prev) => (prev ? { ...prev, isPaid: true } : prev));
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
            setErrorType("not-found");
            setPageState("error");
            return;
          }

          setTransfer(response.data);

          // Check if transfer is expired by status OR by expireAt date
          const isExpired =
            response.data.status === "expired" ||
            (response.data.expireAt &&
              new Date(response.data.expireAt).getTime() < Date.now());

          if (isExpired) {
            setError(t("transferExpired"));
            setErrorType("expired");
            setPageState("error");
            return;
          }

          if (response.data.status === "cancelled") {
            setError(t("transferCancelled"));
            setErrorType("cancelled");
            setPageState("error");
            return;
          }

          if (response.data.status === "pending") {
            setError(t("transferNotReady"));
            setErrorType("not-ready");
            setPageState("error");
            return;
          }

          // For password-protected transfers (accessControl === 'password'),
          // users must first verify their email, then enter the password.
          // The password flow is triggered after email verification in handleOtpVerify.
          // Check if payments are globally disabled
          platformApi.getPublicConfig().then((configRes) => {
            if (!configRes.error && configRes.data) {
              setPaymentsDisabled(!configRes.data.paymentsEnabled);
            }
          });

          // Always show download panel first (payment happens when clicking download)
          setPageState("ready");
        } else {
          setError(response.error?.message || t("transferNotFound"));
          setErrorType("not-found");
          setPageState("error");
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : t("transferNotFound");
        setError(errorMessage);
        setErrorType("not-found");
        setPageState("error");
      }
    };

    if (shortCode && transferId) {
      loadTransfer();
    }
  }, [shortCode, transferId, t]);

  // Update page title when transfer is loaded
  useEffect(() => {
    const originalTitle = originalTitleRef.current;
    if (transfer) {
      document.title = `${t("downloadFiles")} | ZeFile`;
    }

    // Cleanup: restore original title on unmount
    return () => {
      document.title = originalTitle;
    };
  }, [transfer, t]);

  // Log link access when page loads successfully
  useEffect(() => {
    const logAccess = async () => {
      if (!shortCode || !transfer || accessLogged) return;

      // Generate session ID if not provided
      const sessionId =
        trackingParams.z_sid ||
        `${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

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

  // Fetch payment methods when country changes (API-driven)
  useEffect(() => {
    if (pageState !== "payment") return;

    setSelectedMethod(null);

    if (selectedCountry.code === "INTL") {
      setPaymentMethods([
        { type: "card", name: "Card", provider: "card", icon: "card" },
      ]);
      setLoadingMethods(false);
      return;
    }

    const fetchMethods = async () => {
      setLoadingMethods(true);
      try {
        const response = await paymentApi.getPaymentMethods(
          selectedCountry.code,
        );
        if (response.data?.methods) {
          setPaymentMethods(response.data.methods);
        } else {
          setPaymentMethods([]);
        }
      } catch {
        setPaymentMethods([]);
      } finally {
        setLoadingMethods(false);
      }
    };
    fetchMethods();

    if (selectedCountry.phoneCode) {
      setPhoneCountryCode(selectedCountry.phoneCode);
    }
  }, [pageState, selectedCountry.code, selectedCountry.phoneCode]);

  const momoMethods = useMemo(
    () => paymentMethods.filter((m) => m.type === "mobile_money"),
    [paymentMethods],
  );
  const cardMethod = useMemo(
    () => paymentMethods.find((m) => m.type === "card"),
    [paymentMethods],
  );
  const otherMethods = useMemo(
    () =>
      paymentMethods.filter(
        (m) => m.type !== "mobile_money" && m.type !== "card",
      ),
    [paymentMethods],
  );

  const getProviderIconPath = (icon: string): string =>
    `/icons/payment/${icon}.svg`;

  // Start polling when in payment prompt state
  useEffect(() => {
    if (pageState === "payment-prompt" && paymentReference) {
      startPolling(paymentReference);
    }
    return () => stopPolling();
  }, [pageState, paymentReference, startPolling, stopPolling]);

  // Track payment page viewed/abandoned (Epic 54 analytics)
  useEffect(() => {
    if (pageState === "payment" && transferId) {
      paymentStartTimeRef.current = Date.now();
      paymentCompletedRef.current = false;
      trackPaymentPageViewed(transferId);
    }

    return () => {
      if (
        paymentStartTimeRef.current &&
        !paymentCompletedRef.current &&
        pageState === "payment" &&
        transferId
      ) {
        const timeSpent = Math.round(
          (Date.now() - paymentStartTimeRef.current) / 1000,
        );
        trackPaymentPageAbandoned(transferId, timeSpent);
        paymentStartTimeRef.current = null;
      }
    };
  }, [pageState, transferId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !transfer) return;

    setIsLoading(true);
    setError("");

    try {
      // Use dedicated password verification endpoint
      const response = await storageApi.verifyTransferPassword(
        shortCode,
        password,
      );

      if (!response.error && response.data?.success) {
        // Password verified - store session token and open preview drawer
        const token = response.data.sessionToken;
        setPasswordSessionToken(token);
        setRecipientEmail(customerEmail || null);
        setPassword(""); // Clear plaintext password from memory
        setPageState("ready");
        openDrawerToView(
          "transfers",
          "transfer-preview",
          transfer,
          "receiver",
          token,
        );
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
    if (
      !/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
        customerEmail,
      )
    ) {
      toast.error(tPayment("invalidEmail"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Check if email is authorized to access this transfer (server-side)
      if (!(await isEmailAuthorized(customerEmail))) {
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
        setOtpResendCountdown(30);
        setEmailSubmitted(true);
        // Stay in "email" state — OTP section slides in inline
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
      // Log recipient access (skip for public transfers per AC4 - Story 27.4)
      if (transfer?.accessControl !== "public") {
        try {
          await transferApi.logRecipientAccess(shortCode, customerEmail);
        } catch {
          console.warn("Failed to log recipient access");
        }
      }

      setEmailConfirmed(true);

      // Show welcome banner for brand-new recipients
      if (isNewUser) {
        setShowNewUserBanner(true);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(
          () => setShowNewUserBanner(false),
          5000,
        );
      }

      // For password-protected transfers, go to password state
      // Otherwise, go directly to ready state and open preview
      if (transfer?.accessControl === "password") {
        setPageState("password");
      } else {
        setPageState("ready");
        // Open SideDrawer with TransferPreviewPanel
        if (transfer) {
          setRecipientEmail(customerEmail || null);
          openDrawerToView(
            "transfers",
            "transfer-preview",
            transfer,
            "receiver",
          );
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
        setOtpResendCountdown(30);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user email is authorized to access this transfer via backend API
  // - Public transfers: any email is authorized
  // - Private/Password transfers: only listed recipients are authorized
  // Authorization is enforced server-side to prevent client-side manipulation
  const isEmailAuthorized = async (email: string): Promise<boolean> => {
    if (!transfer) return false;

    // Public transfers allow any email (quick client-side check)
    if (transfer.accessControl === "public") {
      return true;
    }

    try {
      const response = await storageApi.verifyRecipientAccess(
        transfer.shortCode,
        email,
      );
      return response.data?.authorized ?? false;
    } catch {
      return false;
    }
  };

  // Handle clicking preview button from ready state
  const handlePreviewClick = async () => {
    if (!transfer) return;

    // Public transfers - anyone can preview without authentication
    if (transfer.accessControl === "public") {
      setRecipientEmail(customerEmail || null);
      openDrawerToView("transfers", "transfer-preview", transfer, "receiver");
      return;
    }

    // Check if user is already logged in
    const user = authApi.getStoredUser();

    if (user?.email) {
      // Check if logged-in user is the sender - direct access, no verification needed
      const isSender =
        (typeof transfer.senderId === "object" &&
          transfer.senderId?.id === user.id) ||
        (typeof transfer.senderId === "object" &&
          transfer.senderId?.email?.toLowerCase() === user.email.toLowerCase());

      if (isSender) {
        setCustomerEmail(user.email);
        setEmailConfirmed(true);
        openDrawerToView("transfers", "transfer-preview", transfer, "sender");
        return;
      }

      // User is logged in - check if their email is authorized as recipient (server-side)
      if (await isEmailAuthorized(user.email)) {
        setCustomerEmail(user.email);
        setEmailConfirmed(true);

        // Password-protected transfers require password even for logged-in users
        if (transfer.accessControl === "password") {
          setPageState("password");
        } else {
          // Authorized - open SideDrawer with TransferPreviewPanel
          setRecipientEmail(user.email);
          openDrawerToView(
            "transfers",
            "transfer-preview",
            transfer,
            "receiver",
          );
        }
      } else {
        // Logged-in email not authorized - let user enter the correct email
        setPageState("email");
      }
    } else {
      // Not logged in - show email confirmation panel
      setPageState("email");
    }
  };

  const handlePaymentContinue = async () => {
    if (!selectedMethod || !transfer) return;

    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error(tPayment("invalidEmail"));
      return;
    }

    const countryCode =
      selectedCountry.code !== "INTL" ? selectedCountry.code : undefined;

    if (selectedMethod.type === "mobile_money") {
      // Mobile money — validate phone, then initialize
      if (!isPhoneValid) {
        toast.error(tPayment("invalidPhoneNumber"));
        return;
      }

      setIsLoading(true);
      try {
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "mobile_money",
          mobileMoneyProvider: selectedMethod.provider as MobileMoneyProvider,
          phoneNumber: phoneNumber,
          countryCode,
        });

        if (response.error) {
          if (response.status === 503) {
            setPaymentsDisabled(true);
            toast.error(tPayment("systemUnavailable"));
          } else {
            toast.error(
              response.error.message || tPayment("paymentInitFailed"),
            );
          }
          setIsLoading(false);
          return;
        }

        if (response.data) {
          setPaymentReference(response.data.reference);
          setPaymentAmount(response.data.pricingAmountMinorUnits);
          setProcessingFee(response.data.processingFeeMinorUnits || 0);
          setProcessingFeePercent(response.data.processingFeePercent || 0);
          setTotalAmountCharged(
            response.data.totalAmountMinorUnits ||
              response.data.pricingAmountMinorUnits,
          );
          setPageState("payment-prompt");
        }
      } catch {
        toast.error(tPayment("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    } else if (selectedMethod.type === "card") {
      // Card — redirect to Paystack checkout
      setIsLoading(true);
      try {
        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "card",
          countryCode,
        });

        if (response.error) {
          if (response.status === 503) {
            setPaymentsDisabled(true);
            toast.error(tPayment("systemUnavailable"));
          } else {
            toast.error(
              response.error.message || tPayment("paymentInitFailed"),
            );
          }
          return;
        }

        if (response.data) {
          setProcessingFee(response.data.processingFeeMinorUnits || 0);
          setProcessingFeePercent(response.data.processingFeePercent || 0);
          setTotalAmountCharged(
            response.data.totalAmountMinorUnits ||
              response.data.pricingAmountMinorUnits,
          );
        }

        if (response.data?.authorizationUrl) {
          try {
            safePaymentRedirect(response.data.authorizationUrl);
          } catch {
            toast.error(tPayment("paymentInitFailed"));
          }
        }
      } catch {
        toast.error(tPayment("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    } else {
      // bank_transfer, ussd — redirect to gateway checkout
      setIsLoading(true);
      try {
        type PaystackChannel =
          | "card"
          | "bank_transfer"
          | "ussd"
          | "bank"
          | "qr";
        const channelMap: Record<string, PaystackChannel> = {
          bank_transfer: "bank_transfer",
          ussd: "ussd",
        };
        const preferredChannel: PaystackChannel =
          channelMap[selectedMethod.type] || "bank_transfer";

        const response = await paymentApi.initializePaymentV2({
          transferId: transfer.id,
          customerEmail: customerEmail,
          requestedCurrency: transfer.currency,
          paymentMethod: "card",
          preferredChannel,
          countryCode,
        });

        if (response.error) {
          if (response.status === 503) {
            setPaymentsDisabled(true);
            toast.error(tPayment("systemUnavailable"));
          } else {
            toast.error(
              response.error.message || tPayment("paymentInitFailed"),
            );
          }
          return;
        }

        if (response.data?.authorizationUrl) {
          try {
            safePaymentRedirect(response.data.authorizationUrl);
          } catch {
            toast.error(tPayment("paymentInitFailed"));
          }
        }
      } catch {
        toast.error(tPayment("paymentInitFailed"));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!transfer) return;

    setIsDownloading(true);

    try {
      const response = await storageApi.streamZipDownload(transfer.shortCode, {
        sessionToken: passwordSessionToken || undefined,
        email: customerEmail || undefined,
      });

      if (response.error) {
        toast.error(response.error.message || t("downloadFailed"));
      } else {
        checkForPoll("after_download", 3000);
        // Show conversion CTA for non-authenticated, non-custom-domain recipients
        if (!isBranded && !isAuthenticated) {
          setPageState("downloaded");
        }
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
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return t("expired");

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 1) {
      return `${diffDays} ${diffDays === 1 ? tPayment("day") : tPayment("days")}`;
    }
    if (diffHours >= 1) {
      return `${diffHours} ${diffHours === 1 ? tPayment("hour") : tPayment("hours")}`;
    }
    return `${diffMinutes} ${diffMinutes === 1 ? tPayment("minute") : tPayment("minutes")}`;
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

  // Error state — resolve title/subtitle from errorType
  if (pageState === "error") {
    const errorTitleKey =
      errorType === "expired"
        ? "transferExpiredTitle"
        : errorType === "cancelled"
          ? "transferCancelledTitle"
          : errorType === "not-ready"
            ? "transferNotReadyTitle"
            : "transferNotFoundTitle";

    const errorSubtitleKey =
      errorType === "expired"
        ? "transferExpiredSubtitle"
        : errorType === "cancelled"
          ? "transferCancelledSubtitle"
          : errorType === "not-ready"
            ? "transferNotReadySubtitle"
            : "transferNotFoundSubtitle";

    return (
      <div className="min-h-screen bg-white">
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div className="ze-upload-panel text-center py-8">
                <div className="align-center mx-auto mb-3">
                  {catAnimationData && (
                    <Lottie
                      animationData={catAnimationData}
                      loop={true}
                      autoplay={true}
                      style={{
                        width: "300px",
                        height: "auto",
                      }}
                    />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-[#171717] mb-3">
                  {tNotFound(errorTitleKey)}
                </h1>
                <p className="text-gray-600 text-sm font-medium max-w-md mx-auto mb-8 leading-relaxed">
                  {tNotFound(errorSubtitleKey)}
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

  // Password protection state
  if (pageState === "password") {
    return (
      <div
        className="min-h-screen bg-white"
        style={
          isBranded && activeBranding?.backgroundColor
            ? { backgroundColor: activeBranding.backgroundColor }
            : undefined
        }
      >
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div className="ze-upload-panel">
                {/* Step indicator for multi-gate flow */}
                {gateSteps.length > 1 && (
                  <StepIndicator
                    steps={gateSteps}
                    currentStep={gateCurrentStep}
                  />
                )}
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
                        className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent pr-12 text-sm"
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
                    style={
                      isBranded && activeBranding?.primaryColor
                        ? {
                            backgroundColor: activeBranding.primaryColor,
                            color:
                              activeBranding.buttonTextColor ||
                              activeBranding.textColor ||
                              "#171717",
                          }
                        : undefined
                    }
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
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel !items-start ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container !items-start flex-col lg:flex-row gap-6 pt-8"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              {/* Payment Form Panel */}
              <div className="ze-upload-panel" style={{ maxWidth: "400px" }}>
                <h1 className="text-xl font-bold text-[#171717] mb-1">
                  {tPayment("securePayment")}
                </h1>
                <p className="text-sm text-gray-500 mb-6">
                  {tPayment("makePaymentToDownload")}
                </p>

                {/* Name Input — hidden when logged in and user has a name */}
                {(!isLoggedIn || !loggedInName) && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={tPayment("yourName")}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent text-sm"
                    />
                  </div>
                )}

                {/* Email Input — hidden when logged in */}
                {!isLoggedIn && (
                  <div className="mb-4">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={tPayment("yourEmail")}
                      className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent text-sm"
                    />
                  </div>
                )}

                {/* Payment Method Section */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {tPayment("paymentMethodTitle")}
                  </p>

                  {/* Country Selector */}
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={() =>
                        setIsCountryDropdownOpen(!isCountryDropdownOpen)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded text-[#171717] bg-white hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {selectedCountry.flagCode ? (
                          <Flag
                            code={selectedCountry.flagCode}
                            size="s"
                            hasBorder={false}
                          />
                        ) : (
                          <Globe className="w-5 h-5 text-gray-500" />
                        )}
                        <span className="font-medium">
                          {selectedCountry.name}
                        </span>
                      </div>
                      <NavArrowDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isCountryDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-[220px] overflow-y-auto">
                        {DOWNLOAD_PAYMENT_COUNTRIES.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(country);
                              localStorage.setItem(
                                "zefile_detected_country",
                                country.code,
                              );
                              setIsCountryDropdownOpen(false);
                              setPhoneNumber("");
                              setIsPhoneValid(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-left ${
                              country.code === selectedCountry.code
                                ? "bg-gray-50"
                                : ""
                            }`}
                          >
                            {country.flagCode ? (
                              <Flag
                                code={country.flagCode}
                                size="s"
                                hasBorder={false}
                              />
                            ) : (
                              <Globe className="w-5 h-5 text-gray-500" />
                            )}
                            <span className="text-sm text-[#171717]">
                              {country.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Methods Grid */}
                  {loadingMethods ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-[#5E53E0] rounded-full animate-spin" />
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                      {tPayment("noMethodsAvailable")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Mobile Money Providers */}
                      {momoMethods.map((method) => {
                        const isSelected =
                          selectedMethod?.type === "mobile_money" &&
                          selectedMethod?.provider === method.provider;
                        return (
                          <button
                            key={method.provider}
                            type="button"
                            onClick={() => setSelectedMethod(method)}
                            className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                              isSelected
                                ? "border-[#5E53E0] bg-[#5E53E0]/5"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded">
                              {failedIcons.has(method.icon) ? (
                                <SmartphoneDevice className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Image
                                  src={getProviderIconPath(method.icon)}
                                  alt={method.name}
                                  width={16}
                                  height={16}
                                  onError={() => {
                                    setFailedIcons((prev) =>
                                      new Set(prev).add(method.icon),
                                    );
                                  }}
                                />
                              )}
                            </div>
                            <span className="text-xs font-medium text-[#171717] truncate">
                              {method.name}
                            </span>
                          </button>
                        );
                      })}

                      {/* Other methods (bank_transfer, ussd, etc.) */}
                      {otherMethods.map((method) => {
                        const isSelected =
                          selectedMethod?.type === method.type &&
                          selectedMethod?.provider === method.provider;
                        const MethodIcon =
                          method.type === "bank_transfer"
                            ? Bank
                            : method.type === "ussd"
                              ? Hashtag
                              : SmartphoneDevice;
                        return (
                          <button
                            key={`${method.type}-${method.provider}`}
                            type="button"
                            onClick={() => setSelectedMethod(method)}
                            className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                              isSelected
                                ? "border-[#5E53E0] bg-[#5E53E0]/5"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded">
                              <MethodIcon className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="text-xs font-medium text-[#171717] truncate">
                              {method.name}
                            </span>
                          </button>
                        );
                      })}

                      {/* Card Option */}
                      {cardMethod && (
                        <button
                          type="button"
                          onClick={() => setSelectedMethod(cardMethod)}
                          className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                            selectedMethod?.type === "card"
                              ? "border-[#5E53E0] bg-[#5E53E0]/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded">
                            <CreditCard className="w-4 h-4 text-gray-500" />
                          </div>
                          <span className="text-xs font-medium text-[#171717] truncate">
                            {cardMethod.name}
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Phone Number — shown when mobile money is selected */}
                  {selectedMethod?.type === "mobile_money" && (
                    <div className="mt-3">
                      <PhoneNumberInput
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        defaultCountry={selectedCountry.phoneCode || "CI"}
                        countryCode={selectedCountry.phoneCode || "CI"}
                        hideCountrySelector
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setPageState("ready")}
                    disabled={isLoading}
                    className="flex-1 px-4 py-3.5 bg-gray-100 text-[#171717] font-medium rounded hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    {tPayment("cancel")}
                  </button>
                  <button
                    onClick={handlePaymentContinue}
                    disabled={
                      !selectedMethod ||
                      !customerEmail ||
                      isLoading ||
                      (selectedMethod?.type === "mobile_money" && !isPhoneValid)
                    }
                    className="flex-1 px-4 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading
                      ? tPayment("processing")
                      : tPayment("payAndDownload")}
                  </button>
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>{tPayment("securityGuarantee")}</p>
                </div>
              </div>

              {/* Transfer Summary - payment state (pre-init, no fee data yet) */}
              {transfer && (
                <div className="w-full lg:w-[400px] flex-shrink-0">
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

  // phone-input state removed — phone input is now inline in payment state

  // Payment prompt state (STK Push waiting)
  if (pageState === "payment-prompt") {
    const isSuccess = pollingStatus === "success";
    const isFailed = pollingStatus === "failed";
    const isTimeout = pollingStatus === "timeout";
    const isPolling = pollingStatus === "polling";

    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel !items-start ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container !items-start flex-col lg:flex-row gap-6 pt-8"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
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
                      {selectedMethod?.name ||
                        getProviderName(selectedMethod?.provider || "")}
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
                  {processingFee > 0 ? (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 mb-1">
                        <span className="text-gray-600">
                          {tPayment("filePrice")}
                        </span>
                        <span className="font-medium text-[#171717]">
                          {paymentAmount
                            ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">
                          {processingFeePercent
                            ? tPayment("processingFee", {
                                percent: processingFeePercent.toFixed(
                                  processingFeePercent % 1 === 0 ? 0 : 2,
                                ),
                              })
                            : tPayment("processingFeeGeneric")}
                        </span>
                        <span className="font-medium text-[#171717]">
                          {`${(processingFee / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                        <span className="text-gray-600 font-bold">
                          {tPayment("totalCharged")}
                        </span>
                        <span className="font-bold text-[#171717]">
                          {`${(totalAmountCharged / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-gray-600">
                        {tPayment("amount")}
                      </span>
                      <span className="font-bold text-[#171717]">
                        {paymentAmount
                          ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`
                          : ""}
                      </span>
                    </div>
                  )}
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
                        setPageState("payment");
                      }}
                      className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
                    >
                      {tPayment("resend")}
                    </button>
                  )}

                  {/* Use different method — only on failure/timeout, not during active polling */}
                  {(isFailed || isTimeout) && (
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

                  {/* "I already paid" — manual check during active polling */}
                  {isPolling && paymentReference && (
                    <button
                      onClick={() => startPolling(paymentReference)}
                      className="text-sm text-[#171717] underline font-medium mt-2"
                    >
                      {tPayment("iAlreadyPaid")}
                    </button>
                  )}
                </div>
              </div>

              {/* Transfer Summary - payment-prompt state (post-init, fee data available) */}
              {transfer && (
                <div className="w-full lg:w-[360px] flex-shrink-0">
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
                    processingFeeMinorUnits={processingFee}
                    processingFeePercent={processingFeePercent}
                    totalAmountMinorUnits={totalAmountCharged}
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
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div className="ze-upload-panel">
                {/* Step indicator for multi-gate flow */}
                {gateSteps.length > 1 && (
                  <StepIndicator
                    steps={gateSteps}
                    currentStep={gateCurrentStep}
                  />
                )}
                {/* Icon — transitions from envelope to lock */}
                <div className="flex flex-col items-center mb-6 relative h-16 w-16">
                  <div
                    key="envelope"
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      emailSubmitted
                        ? "opacity-0 scale-75"
                        : "opacity-100 scale-100"
                    }`}
                  >
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
                  <div
                    key="lock"
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      emailSubmitted
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-75"
                    }`}
                  >
                    <Lock
                      className="w-12 h-12 text-gray-300"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                {/* Title — transitions on email submit */}
                <h1 className="text-xl font-bold text-[#171717] text-center mb-2 transition-all duration-300">
                  {emailSubmitted ? t("verifyEmail") : t("enterEmailToAccess")}
                </h1>
                <p className="text-sm text-gray-500 text-center mb-1 transition-all duration-300">
                  {emailSubmitted ? (
                    <>
                      {t("otpSentTo")}{" "}
                      <span className="font-medium text-[#171717]">
                        {customerEmail}
                      </span>
                    </>
                  ) : (
                    t("emailRequiredForAccess")
                  )}
                </p>
                {emailSubmitted && (
                  <p className="text-xs text-gray-400 text-center mb-1">
                    {t("checkSpamFolder")}
                  </p>
                )}

                {/* Spacer */}
                <div className={emailSubmitted ? "mb-4" : "mb-5"} />

                {/* Email field — read-only after submit */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) =>
                        !emailSubmitted && setCustomerEmail(e.target.value)
                      }
                      placeholder={t("yourEmail")}
                      className={`w-full px-4 py-3 border rounded text-sm focus:outline-none transition-all duration-300 ${
                        emailSubmitted
                          ? "border-[#87E64B] bg-[#87E64B]/5 text-[#171717] cursor-default"
                          : "border-gray-200 text-[#171717] placeholder:text-gray-400 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                      }`}
                      readOnly={emailSubmitted}
                      required
                      autoFocus={!emailSubmitted}
                    />
                    {emailSubmitted && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M4 10.5L8 14.5L16 6.5"
                            stroke="#87E64B"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {emailSubmitted && (
                    <button
                      onClick={() => {
                        setEmailSubmitted(false);
                        setOtpValue("");
                        setError("");
                      }}
                      className="text-xs text-[#171717] underline font-medium mt-1.5"
                    >
                      {t("changeEmail")}
                    </button>
                  )}
                  {!emailSubmitted && error && (
                    <p className="text-sm text-red-500 mt-2">{error}</p>
                  )}
                </div>

                {/* Continue button — hidden after email submitted */}
                {!emailSubmitted && (
                  <form onSubmit={handleEmailConfirm}>
                    <button
                      type="submit"
                      disabled={isLoading || !customerEmail.trim()}
                      className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? t("loading") : t("continue")}
                    </button>
                  </form>
                )}

                {/* OTP section — slides in after email confirmed */}
                <div
                  aria-live="polite"
                  className={`transition-all duration-300 ease-out overflow-hidden ${
                    emailSubmitted
                      ? "max-h-[400px] opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <form onSubmit={handleOtpVerify}>
                    <div className="mb-4">
                      <input
                        ref={otpInputRef}
                        type="text"
                        value={otpValue}
                        onChange={(e) =>
                          setOtpValue(
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        placeholder={t("enterOtp")}
                        className="w-full px-4 py-3 border border-gray-200 rounded text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent text-center tracking-widest font-mono text-lg"
                        maxLength={6}
                        required
                      />
                      {emailSubmitted && error && (
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
                        className="text-sm text-[#171717] underline font-medium disabled:opacity-50"
                      >
                        {t("resendOtp")}
                      </button>
                    ) : (
                      <p className="text-sm text-gray-400">
                        {t("resendOtpCountdown", {
                          seconds: otpResendCountdown,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Back Link */}
                <button
                  onClick={() => {
                    setEmailSubmitted(false);
                    setOtpValue("");
                    setError("");
                    setPageState("ready");
                  }}
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

  // Preview state - shows file preview modal
  // For paid transfers that haven't been paid yet, shows payment button. Otherwise, shows download button.
  if (pageState === "preview" && transfer) {
    const requiresPaymentAction =
      transfer.price && transfer.price > 0 && !transfer.isPaid;
    const formatPrice = (price: number, currency: string) => {
      if (currency === "XOF") return `${price.toLocaleString()} Fr CFA`;
      return `${price.toLocaleString()} ${currency}`;
    };

    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        {pageHeader}

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
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
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
                {requiresPaymentAction && (
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
                {requiresPaymentAction ? (
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
      <div
        className="min-h-screen bg-white"
        style={
          isBranded && activeBranding?.backgroundColor
            ? { backgroundColor: activeBranding.backgroundColor }
            : undefined
        }
      >
        <ToastContainer />
        {pageHeader}

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
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
            />
            <div
              className="ze-panels-container"
              style={{
                position: "relative",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div className="ze-upload-panel">
                {/* New User Welcome Banner */}
                {showNewUserBanner && (
                  <div
                    className="mb-4 bg-[#87E64B]/10 border border-[#87E64B] rounded p-3 flex items-start justify-between gap-3 animate-[fadeIn_0.3s_ease-out]"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm font-medium text-[#171717] leading-relaxed">
                      {t("newUserWelcomeBanner")}
                    </p>
                    <button
                      onClick={() => setShowNewUserBanner(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5 pointer-events-auto"
                      aria-label={t("dismissBanner")}
                    >
                      <Xmark className="w-4 h-4" />
                    </button>
                  </div>
                )}

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
                <h2 className="text-base font-bold text-[#171717] mb-1 break-all">
                  {transfer.title || t("untitled")}
                </h2>

                {/* Preview Before You Pay subtitle (paid transfers only) */}
                {transfer.price && transfer.price > 0 && !transfer.isPaid && (
                  <p className="text-sm font-medium text-[#5E53E0] mb-4">
                    {t("previewBeforeYouPay")}
                  </p>
                )}

                {/* Spacer when no preview subtitle */}
                {(!transfer.price ||
                  transfer.price <= 0 ||
                  transfer.isPaid) && <div className="mb-3" />}

                {/* File Info Row */}
                <div className="flex items-center justify-between py-5 px-4 bg-gray-100 rounded mb-4">
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

                {/* Payment unavailable warning */}
                {paymentsDisabled &&
                  transfer.price &&
                  transfer.price > 0 &&
                  !transfer.isPaid && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4 flex items-start gap-3">
                      <WarningCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-yellow-800">
                          {tPayment("systemUnavailable")}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          {tPayment("systemUnavailableDesc")}
                        </p>
                      </div>
                    </div>
                  )}

                {/* Download / Pay & Download + Preview Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={
                      transfer.price && transfer.price > 0 && !transfer.isPaid
                        ? () => setPageState("payment")
                        : handleDownload
                    }
                    disabled={
                      isDownloading ||
                      (paymentsDisabled !== false &&
                        !!transfer.price &&
                        transfer.price > 0 &&
                        !transfer.isPaid)
                    }
                    className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={
                      isBranded && activeBranding?.primaryColor
                        ? {
                            backgroundColor: activeBranding.primaryColor,
                            color:
                              activeBranding.buttonTextColor ||
                              activeBranding.textColor ||
                              "#171717",
                          }
                        : undefined
                    }
                  >
                    {transfer.price &&
                    transfer.price > 0 &&
                    !transfer.isPaid ? (
                      <>
                        <CreditCard className="w-5 h-5" />
                        {tPayment("payAndDownload")}
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        {isDownloading
                          ? t("preparingDownload")
                          : t("downloadAllFiles")}
                      </>
                    )}
                  </button>

                  <button
                    onClick={handlePreviewClick}
                    className="w-full px-6 py-3.5 border-2 border-gray-300 bg-white text-[#171717] font-medium rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    {t("preview")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Powered by ZeFile footer for custom domains */}
        {isBranded && activeBranding?.showPoweredByZefile && (
          <footer className="py-4 text-center">
            <a
              href="https://zefile.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-500 transition-colors"
            >
              Powered by
              <Image
                src="/zefile-logo.svg"
                alt="ZeFile"
                width={50}
                height={14}
                className="h-3.5 w-auto opacity-60"
              />
            </a>
          </footer>
        )}

        {/* Floating Poll Widget */}
        {!isBranded && <FloatingPollWidget />}
      </div>
    );
  }

  // Post-download conversion CTA state
  if (pageState === "downloaded" && transfer) {
    const frontendUrl =
      process.env.NEXT_PUBLIC_FRONTEND_URL || "https://zefile.io";
    return (
      <div className="min-h-screen bg-white">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              timeOfDay={timeOfDay}
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
                  <Download
                    className="w-16 h-16 text-[#87E64B]"
                    strokeWidth={1.5}
                  />
                </div>
                <h1 className="text-xl font-bold text-[#171717] mb-2">
                  {t("downloadedTitle")}
                </h1>
                <p className="text-sm text-gray-500 mb-1">
                  {transfer.title || t("untitled")}
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  {t("downloadedSubtitle")}
                </p>
                <a
                  href={frontendUrl}
                  className="pointer-events-auto inline-flex items-center justify-center w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
                >
                  {t("downloadedCtaButton")}
                </a>
                <button
                  onClick={() => setPageState("ready")}
                  className="pointer-events-auto mt-3 text-sm text-[#5E53E0] hover:underline"
                >
                  {t("backToTransfer")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
