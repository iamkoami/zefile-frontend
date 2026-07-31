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
import HeroProcessLoop from "@/components/shared/HeroProcessLoop";
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
import { SaleCheckoutPanel } from "@/features/payment/components/SaleCheckoutPanel";
import { useDrawerStore } from "@/stores/drawer-store";
import FloatingPollWidget from "@/components/shared/FloatingPollWidget";
import CreatorStrip from "@/features/transfer/components/CreatorStrip";
import PasswordHelpPanel from "@/features/transfer/components/PasswordHelpPanel";
import DownloadRecoveryCard, {
  classifyDownloadFailure,
  type DownloadFailureScenario,
  type DownloadRecoveryErrorContext,
} from "@/features/transfer/components/DownloadRecoveryCard";
import PerFileDownloadList from "@/features/transfer/components/PerFileDownloadList";
import { usePollEligibility } from "@/hooks/usePollEligibility";
import { useChatStore } from "@/stores/chat-store";
import { Turnstile } from '@marsidev/react-turnstile';
import { useTurnstile } from "@/hooks/useTurnstile";
import { setCaptchaToken } from "@/services/api-client";
import {
  trackPaymentPageViewed,
  trackPaymentPageAbandoned,
  trackEvent,
  AnalyticsEventType,
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
  | "error"
  | "sale-preview"
  | "sale-checkout"
  | "sale-processing"
  | "sale-ready"
  | "sale-expired";

function ContentPanelBackground({
  wallpaperUrl,
  timeOfDay,
  isHydrated,
  isAuthenticated,
  showUpgradeCta,
  onUpgradeClick,
  hasPrice = false,
  isUnavailable = false,
  isBranded = false,
}: {
  wallpaperUrl?: string;
  timeOfDay: TimeOfDay;
  isHydrated?: boolean;
  isAuthenticated?: boolean;
  showUpgradeCta?: boolean;
  onUpgradeClick?: () => void;
  /** Free transfers must not be told to pay — it reads as a surprise charge. */
  hasPrice?: boolean;
  /**
   * True when the transfer cannot be delivered — not found, expired, cancelled
   * or not yet ready. The default hero copy ("Your files are ready.") is a flat
   * contradiction of the card next to it in those states, so it must not run.
   * The card already explains which of the four happened; the hero's job here
   * is only to stay honest and carry the invite.
   */
  isUnavailable?: boolean;
  /**
   * Custom branding is a Pro feature whose whole point is that ZeFile stays
   * minimal on the creator's link — the page even swaps in BrandedHeader. So no
   * ZeFile signup CTA here either, including in the unavailable state. Without
   * this an expired branded transfer would put "Start free on ZeFile" on a
   * paying customer's white-labelled page.
   */
  isBranded?: boolean;
}) {
  const tDl = useTranslations("downloadHero");
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false);

  useEffect(() => {
    if (!wallpaperUrl) return;
    setWallpaperLoaded(false);
    const img = new window.Image();
    img.onload = () => setWallpaperLoaded(true);
    img.src = wallpaperUrl;
  }, [wallpaperUrl]);

  if (wallpaperUrl) {
    // Sanitize URL to prevent CSS injection via url() breakout
    const safeUrl = wallpaperUrl.replace(/['"()]/g, encodeURIComponent);
    return (
      <>
        {!wallpaperLoaded && (
          <div className="absolute inset-0 rounded-2xl animate-shimmer" />
        )}
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat rounded-2xl transition-opacity duration-500 ${wallpaperLoaded ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundImage: `url('${safeUrl}')` }}
        />
      </>
    );
  }
  return (
    <>
      <TimeOfDayBackground timeOfDay={timeOfDay} />
      <HeroText
        isVisible={true}
        timeOfDay={timeOfDay}
        isHydrated={isHydrated}
        isAuthenticated={isAuthenticated}
        showUpgradeCta={showUpgradeCta}
        onUpgradeClick={onUpgradeClick}
        reserveRightGutter
        copy={
          isUnavailable
            ? {
                line1: tDl("unavailableTitle"),
                subtitle: tDl("unavailableSubtitle"),
              }
            : {
                line1: tDl("title"),
                subtitle: hasPrice ? tDl("subtitlePaid") : tDl("subtitleFree"),
              }
        }
        ctaLabel={isUnavailable ? tDl("unavailableCta") : undefined}
        /* Only pitch a signup when the recipient has nothing left to do. In
           every other state they are mid-task — previewing, paying,
           downloading — and a creator CTA there competes with "Pay and
           download". The post-download state already makes this pitch at the
           right moment, once they have actually experienced a delivery.
           Branded transfers never get it — see the isBranded prop. */
        showSignupCta={isUnavailable && !isBranded}
      />
      {/* Buyer-side tour: preview → pay → download. Answers the one thing a
          recipient is actually anxious about — "if I pay, do I get the files?"
          Kept in the unavailable state on purpose: it describes how ZeFile
          works in general, it makes no claim about *this* transfer, and the
          hero reserves its gutter either way. */}
      <HeroProcessLoop variant="buyer" />
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
  const tSale = useTranslations("publicSale");
  const { timeOfDay, isHydrated } = useTimeOfDay();

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
  const { getToken, isEnabled: captchaEnabled, turnstileRef, siteKey, onSuccess, onError, onExpire } = useTurnstile();

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
  // Story 132.1 — "Forgot the password?" inline help panel
  const [passwordFailedAttempts, setPasswordFailedAttempts] = useState(0);
  const [isPasswordHelpOpen, setIsPasswordHelpOpen] = useState(false);

  // Story 132.3 — Download failed recovery card
  const [downloadRecovery, setDownloadRecovery] = useState<{
    scenario: DownloadFailureScenario;
    attempts: number; // consecutive failures (1 = first failure)
    errorContext: DownloadRecoveryErrorContext;
  } | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

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
  // Story 133-1 (HIGH-2): set when a strict-mode download bounced us to the email OTP step, so
  // that after re-verification we return the buyer to the paid download screen (not the preview).
  const [returnToPaymentAfterVerify, setReturnToPaymentAfterVerify] = useState(false);

  // Public sales state
  const [saleDownloadToken, setSaleDownloadToken] = useState<string | null>(null);
  const [saleBuyerEmail, setSaleBuyerEmail] = useState("");
  const [saleEmailChecked, setSaleEmailChecked] = useState(false);
  const [saleHasPurchase, setSaleHasPurchase] = useState(false);
  const [saleOtpSent, setSaleOtpSent] = useState(false);
  const [saleOtp, setSaleOtp] = useState("");
  const [saleCheckingEmail, setSaleCheckingEmail] = useState(false);
  const [saleVerifyingOtp, setSaleVerifyingOtp] = useState(false);
  const saleVerifyAttemptedRef = useRef(false);

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

  // Phone (WhatsApp) OTP flow: alternative to email when transfer has WhatsApp recipients.
  // `authMode` tracks the user's manual toggle choice and is only consulted in mixed mode.
  // For single-type transfers, `effectiveAuthMode` (below) derives from `recipientTypes`
  // synchronously, so the page never renders the wrong input — or a blank state — during
  // the first render after `transfer` resolves.
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [isRecipientPhoneValid, setIsRecipientPhoneValid] = useState(false);
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);
  // Defensive fallback for legacy transfers pre-Epic 123: treat a missing or
  // empty recipientTypes array as email-only so the page never renders a
  // dead tab or the wrong input.
  const resolvedRecipientTypes = useMemo<Array<"email" | "whatsapp">>(() => {
    const types = transfer?.recipientTypes;
    return Array.isArray(types) && types.length > 0 ? types : ["email"];
  }, [transfer?.recipientTypes]);
  const hasEmailRecipients = resolvedRecipientTypes.includes("email");
  const hasWhatsAppRecipients = resolvedRecipientTypes.includes("whatsapp");
  const isMixedMode = hasEmailRecipients && hasWhatsAppRecipients;
  // Single source of truth for which auth surface to render. Mixed mode defers
  // to the user's manual toggle (`authMode`); single-type transfers are pinned
  // synchronously to their only option. This eliminates any race between the
  // initial render and a deferred init effect.
  const effectiveAuthMode: "email" | "phone" = isMixedMode
    ? authMode
    : hasWhatsAppRecipients
      ? "phone"
      : "email";
  // Roving-tabindex + keyboard handling for the segmented control (tabs).
  const emailTabRef = useRef<HTMLButtonElement>(null);
  const whatsappTabRef = useRef<HTMLButtonElement>(null);
  const handleAuthTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      if (
        key !== "ArrowLeft" &&
        key !== "ArrowRight" &&
        key !== "Home" &&
        key !== "End"
      ) {
        return;
      }
      event.preventDefault();
      let nextMode: "email" | "phone" = authMode;
      if (key === "ArrowLeft" || key === "Home") nextMode = "email";
      if (key === "ArrowRight" || key === "End") nextMode = "phone";
      if (nextMode !== authMode) {
        setAuthMode(nextMode);
        setError("");
      }
      const target =
        nextMode === "email" ? emailTabRef.current : whatsappTabRef.current;
      target?.focus();
    },
    [authMode],
  );

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

  // Focus OTP input when email/phone is submitted and section slides in
  useEffect(() => {
    if (emailSubmitted || phoneSubmitted) {
      const timer = setTimeout(() => otpInputRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [emailSubmitted, phoneSubmitted]);

  // Step indicator for multi-gate download flow
  const gateSteps = useMemo((): string[] => {
    if (!transfer) return [];
    const steps: string[] = [];
    if (transfer.accessControl !== "public") {
      steps.push(effectiveAuthMode === "phone" ? t("stepPhone") : t("stepEmail"));
      steps.push(t("stepCode"));
    }
    if (transfer.accessControl === "password") {
      steps.push(t("stepPassword"));
    }
    return steps;
  }, [transfer, t, effectiveAuthMode]);

  const identifierSubmitted =
    effectiveAuthMode === "phone" ? phoneSubmitted : emailSubmitted;

  const gateCurrentStep = useMemo((): number => {
    if (!transfer || gateSteps.length <= 1) return 0;
    if (pageState === "email" && !identifierSubmitted) return 0;
    if (pageState === "email" && identifierSubmitted) return 1;
    if (pageState === "password") {
      return gateSteps.indexOf(t("stepPassword"));
    }
    return gateSteps.length;
  }, [transfer, pageState, identifierSubmitted, gateSteps, t]);

  // OTP resend countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpResendCountdown > 0) {
      timer = setTimeout(
        () => setOtpResendCountdown(otpResendCountdown - 1),
        1000,
      );
    } else if (otpResendCountdown === 0 && (emailSubmitted || phoneSubmitted)) {
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

          // Public sales mode: skip OTP, show preview + buy button
          if (response.data.isPublicSales) {
            setPageState("sale-preview");
            // Auto-detect purchase for logged-in users
            // Signed-in only: the backend answers this from the JWT, for the
            // caller's own email, so it discloses nothing about anyone else.
            const loggedInEmail = getCurrentUserEmail();
            if (loggedInEmail) {
              setSaleBuyerEmail(loggedInEmail);
              transferApi.checkPurchase(response.data.shortCode).then((checkRes) => {
                if (checkRes.data?.hasPurchase) {
                  setSaleHasPurchase(true);
                  setSaleEmailChecked(true);
                  // Auto-send OTP for logged-in users with existing purchase
                  transferApi.recoverPurchase(response.data!.shortCode, loggedInEmail).then((recoverRes) => {
                    if (recoverRes.data?.otpSent) {
                      setSaleOtpSent(true);
                    }
                  }).catch(() => {
                    // If recover fails, still show the already-owned state
                  });
                } else {
                  setSaleEmailChecked(true);
                }
              }).catch(() => {
                // If check fails, show normal sale-preview
              });
            }
          } else {
            // Always show download panel first (payment happens when clicking download)
            setPageState("ready");
          }
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

  // Handle Paystack callback for public sales (URL has ?reference=xxx&trxref=xxx)
  useEffect(() => {
    if (!transfer?.isPublicSales) return;
    if (saleVerifyAttemptedRef.current) return;

    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) return;

    // Guard: prevent double-execution on re-renders
    saleVerifyAttemptedRef.current = true;
    setPageState("sale-processing");

    const verifyPayment = async () => {
      try {
        const response = await transferApi.verifyPurchase(shortCode, reference);
        if (!response.error && response.data) {
          setSaleDownloadToken(response.data.downloadToken);
          setPageState("sale-ready");
        } else {
          // Token expired or payment failed
          setPageState("sale-expired");
        }
      } catch {
        setPageState("sale-expired");
      }
    };

    verifyPayment();
  }, [transfer, shortCode, searchParams]);

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

  // Log link access when page loads successfully (skip if sender is viewing their own transfer)
  useEffect(() => {
    const logAccess = async () => {
      if (!shortCode || !transfer || accessLogged) return;

      // Don't count the sender's own views
      const user = authApi.getStoredUser();
      if (
        user?.id &&
        typeof transfer.senderId === "object" &&
        transfer.senderId?.id === user.id
      ) {
        setAccessLogged(true);
        return;
      }

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
        setPasswordFailedAttempts(0);
        setIsPasswordHelpOpen(false);
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
        setPasswordFailedAttempts((n) => n + 1);
      }
    } catch {
      setError(t("incorrectPassword"));
      setPassword(""); // Clear password on error per AC3
      setPasswordFailedAttempts((n) => n + 1);
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

      // Get Turnstile token and inject via header
      const captchaToken = await getToken();
      setCaptchaToken(captchaToken);

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

      // Story 133-1 (HIGH-2): if a strict-mode paid download bounced us here to re-prove the
      // email, the OTP just re-issued the JWT — return the buyer to the paid download screen
      // (payment-prompt, still showing success) instead of the preview.
      if (returnToPaymentAfterVerify) {
        setReturnToPaymentAfterVerify(false);
        setRecipientEmail(customerEmail || null);
        setPageState("payment-prompt");
        return;
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
      // Get Turnstile token and inject via header
      const captchaToken = await getToken();
      setCaptchaToken(captchaToken);

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

  // Handle phone number submission — sends OTP via WhatsApp
  const handlePhoneConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone || !transfer || !isRecipientPhoneValid) return;

    setIsLoading(true);
    setError("");

    try {
      // Check if phone is authorized to access this transfer (server-side)
      const accessResponse = await storageApi.verifyRecipientAccess(
        transfer.shortCode,
        undefined,
        recipientPhone,
      );
      if (!accessResponse.data?.authorized) {
        setError(t("unauthorized"));
        setIsLoading(false);
        return;
      }

      // Request OTP via WhatsApp using recipient-specific endpoint
      const response = await authApi.requestRecipientOtp({
        shortCode: transfer.shortCode,
        phone: recipientPhone,
      });

      if (response.error) {
        // Backend returns 502 + { error: 'WHATSAPP_UNAVAILABLE' } when delivery fails
        if (
          response.error.error === "WHATSAPP_UNAVAILABLE" ||
          response.error.statusCode === 502
        ) {
          setError(t("whatsappUnavailable"));
        } else {
          toast.error(response.error.message || t("error"));
        }
        setIsLoading(false);
        return;
      }

      if (response.data) {
        setOtpExpiresIn(response.data.expiresIn || 600);
        setCanResendOtp(false);
        setOtpResendCountdown(30);
        setPhoneSubmitted(true);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification for phone (WhatsApp) path
  const handlePhoneOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue || !recipientPhone) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await authApi.verifyRecipientOtp({
        identifier: recipientPhone,
        otp: otpValue,
        shortCode: shortCode,
      });

      if (response.error) {
        setError(response.error.message || t("invalidOtp"));
        setIsLoading(false);
        return;
      }

      // NOTE: logRecipientAccess is skipped for WhatsApp recipients because the
      // backend endpoint only accepts email format. Phone-recipient preview
      // analytics are a known limitation tracked for a future story.

      // For password-protected transfers, go to password state
      if (transfer?.accessControl === "password") {
        setPageState("password");
      } else {
        setPageState("ready");
        if (transfer) {
          // Do NOT set recipientEmail to the phone number — the drawer store's
          // recipientEmail is passed to preview/notification backends that expect
          // an email. Leaving it null anonymizes the phone path for now.
          setRecipientEmail(null);
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

  // Handle resend OTP for phone path
  const handlePhoneResendOtp = async () => {
    if (!canResendOtp || !recipientPhone || !transfer) return;

    setIsLoading(true);
    try {
      const response = await authApi.requestRecipientOtp({
        shortCode: transfer.shortCode,
        phone: recipientPhone,
      });

      if (
        response.error?.error === "WHATSAPP_UNAVAILABLE" ||
        response.error?.statusCode === 502
      ) {
        toast.error(t("whatsappUnavailable"));
      } else if (response.error) {
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
        // Inject Turnstile token for payment initialization
        setCaptchaToken(await getToken());
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
        // Inject Turnstile token for payment initialization
        setCaptchaToken(await getToken());
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

        // Inject Turnstile token for payment initialization
        setCaptchaToken(await getToken());
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

  /**
   * Story 133-1 (HIGH-2): when the backend runs in strict mode it refuses a self-asserted
   * email for paid downloads and returns { code: 'EMAIL_VERIFICATION_REQUIRED' } (e.g. the
   * buyer's OTP-login JWT expired). Route them back through the email OTP step — which logs
   * them in again — rather than showing a generic download error. Returns true when handled.
   */
  const routeToEmailVerification = () => {
    toast.error(t("verifyEmailToDownload"));
    // Remember to return to the paid download screen after the OTP login re-issues the JWT.
    setReturnToPaymentAfterVerify(true);
    setEmailSubmitted(false);
    setOtpValue("");
    setError("");
    setPageState("email");
  };

  const maybeHandleEmailVerificationRequired = (error: {
    code?: string;
    message?: string;
  } | null): boolean => {
    if (error?.code !== "EMAIL_VERIFICATION_REQUIRED") return false;
    routeToEmailVerification();
    return true;
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
        if (maybeHandleEmailVerificationRequired(response.error)) return;
        toast.error(response.error.message || t("downloadFailed"));
        handleDownloadFailure(null, response.error, response.status);
      } else {
        // Clear any lingering recovery state — retry succeeded or first
        // download was clean.
        setDownloadRecovery(null);
        setIsFallbackMode(false);
        checkForPoll("after_download", 3000);
        // Show conversion CTA for non-authenticated, non-custom-domain recipients
        if (!isBranded && !isAuthenticated) {
          setPageState("downloaded");
        }
      }
    } catch (err) {
      toast.error(t("downloadFailed"));
      handleDownloadFailure(err, null, undefined);
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Classify a failure, record it as the latest recovery context, and fire
   * DOWNLOAD_FAILED. Increments `attempts` on consecutive failures. The
   * recovery card auto-escalates once attempts >= 4 (initial + 3 retries,
   * per AC #7).
   */
  const handleDownloadFailure = (
    err: unknown,
    errorPayload: { message?: string } | null,
    httpStatus: number | undefined,
  ) => {
    const scenario = classifyDownloadFailure(err, httpStatus ? { status: httpStatus } : null);
    const prevAttempts = downloadRecovery?.attempts ?? 0;
    const nextAttempts = prevAttempts + 1;

    const rawMsg =
      (err instanceof Error && err.message) || errorPayload?.message || "";
    // Anti-pattern #4 (Dev Notes): strip any URL substrings so we never
    // leak signed CDN/backend URLs (HMAC tokens in query strings) to
    // backend logs or PostHog.
    const sanitizedMsg = rawMsg.replace(/https?:\/\/\S+/gi, "[url]");
    const errorContext: DownloadRecoveryErrorContext = {
      httpStatus,
      // Cap at 500 chars on the wire too, per backend DTO bounds.
      jsErrorMessage: sanitizedMsg ? sanitizedMsg.slice(0, 500) : undefined,
      fileCount: transfer?.files?.length,
      transferSizeBytes: transfer?.files?.reduce((acc, f) => {
        const size = Number(f.fileSize) || Number(f.size) || 0;
        return acc + size;
      }, 0),
    };

    setDownloadRecovery({ scenario, attempts: nextAttempts, errorContext });

    if (transfer) {
      trackEvent(AnalyticsEventType.DOWNLOAD_FAILED, {
        short_code: transfer.shortCode,
        error_code: scenario,
        attempt_number: nextAttempts,
        http_status: httpStatus,
        file_count: errorContext.fileCount,
        // AC #8 literal — also emit the nested errorContext shape
        error_context: {
          http_status: errorContext.httpStatus,
          js_error_message: errorContext.jsErrorMessage,
          file_count: errorContext.fileCount,
          transfer_size_bytes: errorContext.transferSizeBytes,
        },
      });
    }
  };

  const handleRecoveryRetry = () => {
    void handleDownload();
  };

  const handleEnterFallbackMode = () => {
    setIsFallbackMode(true);
    setDownloadRecovery(null);
  };

  const handleDismissRecoveryCard = () => {
    setDownloadRecovery(null);
  };

  const handleBackToBundle = () => {
    setIsFallbackMode(false);
  };

  // Handle email entry for the public sale gateway.
  //
  // Signed-out buyers go straight to recovery rather than asking the backend
  // "has this email bought?" first. That question is no longer answerable to an
  // anonymous caller by design — it would let anyone probe who bought what — so
  // we offer both paths at once: enter the code if a purchase exists, or buy.
  const handleSaleEmailCheck = async () => {
    if (!transfer || !saleBuyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saleBuyerEmail)) return;

    setSaleCheckingEmail(true);
    try {
      await transferApi.recoverPurchase(transfer.shortCode, saleBuyerEmail);
      // Always true: a code only lands if the email actually has a purchase.
      setSaleOtpSent(true);
    } catch {
      // Recovery is best-effort here; the buy path below stays available either way.
    } finally {
      setSaleEmailChecked(true);
      setSaleCheckingEmail(false);
    }
  };

  // Handle OTP verification for purchase recovery
  const handleSaleOtpVerify = async () => {
    if (!transfer || !saleOtp.trim()) return;

    setSaleVerifyingOtp(true);
    try {
      const res = await transferApi.verifyRecovery(transfer.shortCode, saleBuyerEmail, saleOtp);
      if (res.data?.downloadToken) {
        setSaleDownloadToken(res.data.downloadToken);
        setPageState("sale-ready");
      } else if (res.error) {
        toast.error(res.error.message || tSale("buyFailed"));
      }
    } catch {
      toast.error(tSale("buyFailed"));
    } finally {
      setSaleVerifyingOtp(false);
    }
  };

  // Handle public sale purchase — open checkout flow
  const handleBuy = () => {
    if (!transfer) return;
    setPageState("sale-checkout");
  };

  // Called by SaleCheckoutPanel after payment is initialized
  const handleSalePaymentInitiated = (reference: string, isMobileMoney: boolean) => {
    setPaymentReference(reference);
    if (isMobileMoney) {
      // Mobile money: transition to polling state
      setPageState("payment-prompt");
    } else {
      // Card/redirect: browser will redirect, store reference for callback
      setPageState("sale-processing");
    }
  };

  // Handle download for public sale (uses saleToken)
  const handleSaleDownload = async () => {
    if (!transfer || !saleDownloadToken) return;

    setIsDownloading(true);
    try {
      const response = await storageApi.streamZipDownload(transfer.shortCode, {
        saleToken: saleDownloadToken,
      });

      if (response.error) {
        toast.error(response.error.message || t("downloadFailed"));
        handleDownloadFailure(null, response.error, response.status);
      } else {
        setDownloadRecovery(null);
        setIsFallbackMode(false);
      }
    } catch (err) {
      toast.error(t("downloadFailed"));
      handleDownloadFailure(err, null, undefined);
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
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        {captchaEnabled && (
          <Turnstile
            ref={turnstileRef}
            siteKey={siteKey}
            options={{ size: 'invisible' }}
            onSuccess={onSuccess}
            onError={onError}
            onExpire={onExpire}
          />
        )}
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={isAuthenticated && userTier === "free"}
              onUpgradeClick={() => openDrawer("subscriptions")}
              isUnavailable
              isBranded={isBranded}
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
                      className="ze-lottie-container"
                      style={{
                        width: "300px",
                        height: "auto",
                      }}
                    />
                  )}
                </div>
                <h1 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
                  {tNotFound(errorTitleKey)}
                </h1>
                <p className="text-gray-600 dark:text-[oklch(0.65_0_0)] text-sm font-medium max-w-md mx-auto mb-8 leading-relaxed">
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
        className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]"
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
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                  <Lock className="w-12 h-12 text-gray-300 dark:text-[oklch(0.40_0_0)]" strokeWidth={1.5} />
                </div>

                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] text-center mb-2">
                  {t("passwordProtected")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] text-center mb-6">
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
                        className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#5E53E0] focus:border-transparent pr-12 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-600 dark:hover:text-[oklch(0.75_0_0)]"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>
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

                {/* Story 132.1 — progressive "Forgot the password?" recovery path.
                    Hidden on first load; revealed only after the first failed attempt. */}
                {passwordFailedAttempts > 0 && transfer && (
                  <div className="mt-3 text-center">
                    {!isPasswordHelpOpen ? (
                      <button
                        type="button"
                        onClick={() => setIsPasswordHelpOpen(true)}
                        className="text-sm text-[#5E53E0] dark:text-[#8E84FF] underline underline-offset-4 hover:text-[#4A40C4] dark:hover:text-[#A59BFF] transition-colors"
                      >
                        {t("cantRememberPassword")}
                      </button>
                    ) : (
                      <PasswordHelpPanel
                        shortCode={shortCode}
                        recipientEmail={customerEmail}
                        senderName={transfer.senderProfile?.name ?? null}
                        senderEmail={getSenderEmail(transfer) ?? null}
                        failedAttemptsCount={passwordFailedAttempts}
                        onDismiss={() => setIsPasswordHelpOpen(false)}
                      />
                    )}
                  </div>
                )}
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
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel !items-start ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
                  {tPayment("securePayment")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-6">
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
                      className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#5E53E0] focus:border-transparent text-sm"
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
                      className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#5E53E0] focus:border-transparent text-sm"
                    />
                  </div>
                )}

                {/* Payment Method Section */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-[oklch(0.75_0_0)] mb-2">
                    {tPayment("paymentMethodTitle")}
                  </p>

                  {/* Country Selector */}
                  <div className="relative mb-3">
                    <button
                      type="button"
                      onClick={() =>
                        setIsCountryDropdownOpen(!isCountryDropdownOpen)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] bg-white dark:bg-[oklch(0.24_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {selectedCountry.flagCode ? (
                          <Flag
                            code={selectedCountry.flagCode}
                            size="s"
                            hasBorder={false}
                          />
                        ) : (
                          <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
                        )}
                        <span className="font-medium">
                          {selectedCountry.name}
                        </span>
                      </div>
                      <NavArrowDown
                        className={`w-4 h-4 text-gray-400 dark:text-[oklch(0.50_0_0)] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isCountryDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[oklch(0.24_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded shadow-lg dark:shadow-black/30 max-h-[220px] overflow-y-auto">
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
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] text-left ${
                              country.code === selectedCountry.code
                                ? "bg-gray-50 dark:bg-[oklch(0.24_0_0)]"
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
                              <Globe className="w-5 h-5 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
                            )}
                            <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)]">
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
                      <div className="w-5 h-5 border-2 border-gray-300 dark:border-[oklch(0.30_0_0)] border-t-[#5E53E0] rounded-full animate-spin" />
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] py-4 text-center">
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
                                : "border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                            }`}
                          >
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                              {failedIcons.has(method.icon) ? (
                                <SmartphoneDevice className="w-4 h-4 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
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
                            <span className="text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
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
                                : "border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                            }`}
                          >
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                              <MethodIcon className="w-4 h-4 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
                            </div>
                            <span className="text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
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
                              : "border-gray-200 dark:border-[oklch(0.30_0_0)] hover:border-gray-300 dark:hover:border-[oklch(0.40_0_0)]"
                          }`}
                        >
                          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                            <CreditCard className="w-4 h-4 text-gray-500 dark:text-[oklch(0.65_0_0)]" />
                          </div>
                          <span className="text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] truncate">
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
                    className="flex-1 px-4 py-3.5 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors disabled:opacity-50 text-sm"
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
                <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-[oklch(0.50_0_0)]">
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
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel !items-start ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                  ) : isFailed ? (
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <Xmark className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                  ) : isTimeout ? (
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                      <WarningCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  ) : (
                    <LoadingPanel />
                  )}
                </div>

                {/* Status Message */}
                <div className="text-center mb-4">
                  {isSuccess ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                        {tPayment("paymentSuccessful")}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                        {t("readyToDownload")}
                      </p>
                    </>
                  ) : isFailed ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                        {tPayment("paymentFailed")}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                        {pollingError || tPayment("youWereNotCharged")}
                      </p>
                    </>
                  ) : isTimeout ? (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                        {tPayment("takingLongerThanUsual")}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                        {tPayment("didntReceivePrompt")}
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                        {tPayment("checkYourPhone")}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                        {tPayment("confirmPaymentOn")}
                      </p>
                    </>
                  )}
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 dark:bg-[oklch(0.24_0_0)] rounded-lg p-4 mb-4 text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-[oklch(0.65_0_0)]">{tPayment("payWith")}</span>
                    <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                      {selectedMethod?.name ||
                        getProviderName(selectedMethod?.provider || "")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 dark:text-[oklch(0.65_0_0)]">
                      {tPayment("phoneNumber")}
                    </span>
                    <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                      {phoneNumber}
                    </span>
                  </div>
                  {processingFee > 0 ? (
                    <>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-[oklch(0.30_0_0)] mb-1">
                        <span className="text-gray-600 dark:text-[oklch(0.65_0_0)]">
                          {tPayment("filePrice")}
                        </span>
                        <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                          {paymentAmount
                            ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`
                            : ""}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500 dark:text-[oklch(0.65_0_0)]">
                          {processingFeePercent
                            ? tPayment("processingFee", {
                                percent: processingFeePercent.toFixed(
                                  processingFeePercent % 1 === 0 ? 0 : 2,
                                ),
                              })
                            : tPayment("processingFeeGeneric")}
                        </span>
                        <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                          {`${(processingFee / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-[oklch(0.30_0_0)]">
                        <span className="text-gray-600 dark:text-[oklch(0.65_0_0)] font-bold">
                          {tPayment("totalCharged")}
                        </span>
                        <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
                          {`${(totalAmountCharged / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-[oklch(0.30_0_0)]">
                      <span className="text-gray-600 dark:text-[oklch(0.65_0_0)]">
                        {tPayment("amount")}
                      </span>
                      <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
                        {paymentAmount
                          ? `${(paymentAmount / 100).toLocaleString()} ${transfer?.currency === "XOF" ? "Fr CFA" : transfer?.currency || ""}`
                          : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Polling Status */}
                {isPolling && (
                  <p className="text-xs text-gray-500 dark:text-[oklch(0.65_0_0)] text-center mb-4">
                    {tPayment("waitingForConfirmation")}
                  </p>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {isSuccess && (
                    <>
                      <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Download className="w-5 h-5" />
                        {t("downloadFiles")}
                      </button>

                      {/* Story 132.3 — Download recovery card / per-file fallback */}
                      {transfer && isFallbackMode && transfer.files ? (
                        <PerFileDownloadList
                          shortCode={transfer.shortCode}
                          files={transfer.files}
                          sessionToken={passwordSessionToken || undefined}
                          email={customerEmail || undefined}
                          onBackToBundle={handleBackToBundle}
                          onEmailVerificationRequired={routeToEmailVerification}
                        />
                      ) : transfer && downloadRecovery ? (
                        <DownloadRecoveryCard
                          shortCode={transfer.shortCode}
                          recipientEmail={customerEmail}
                          senderName={transfer.senderProfile?.name ?? null}
                          scenario={downloadRecovery.scenario}
                          errorContext={downloadRecovery.errorContext}
                          attemptNumber={downloadRecovery.attempts}
                          isRetrying={isDownloading}
                          onRetry={handleRecoveryRetry}
                          onEnterFallback={handleEnterFallbackMode}
                          onDismiss={handleDismissRecoveryCard}
                        />
                      ) : null}
                    </>
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
                      className="w-full px-6 py-3.5 bg-gray-100 dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-200 dark:hover:bg-[oklch(0.32_0_0)] transition-colors text-sm"
                    >
                      {tPayment("useDifferentMethod")}
                    </button>
                  )}

                  {/* "I already paid" — manual check during active polling */}
                  {isPolling && paymentReference && (
                    <button
                      onClick={() => startPolling(paymentReference)}
                      className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium mt-2"
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
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                {/* Icon — transitions from input to lock on OTP submit */}
                <div className="flex flex-col items-center mb-6 relative h-16 w-16">
                  <div
                    key="input-icon"
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      identifierSubmitted
                        ? "opacity-0 scale-75"
                        : "opacity-100 scale-100"
                    }`}
                  >
                    {effectiveAuthMode === "phone" ? (
                      <SmartphoneDevice
                        className="w-12 h-12 text-gray-300 dark:text-[oklch(0.40_0_0)]"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 64 64"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-gray-300 dark:text-[oklch(0.40_0_0)]"
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
                    )}
                  </div>
                  <div
                    key="lock"
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      identifierSubmitted
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-75"
                    }`}
                  >
                    <Lock
                      className="w-12 h-12 text-gray-300 dark:text-[oklch(0.40_0_0)]"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>

                {/* Title — transitions based on auth mode and submit state */}
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] text-center mb-2 transition-all duration-300">
                  {identifierSubmitted
                    ? t("verifyCode")
                    : effectiveAuthMode === "phone"
                      ? t("enterPhoneNumber")
                      : t("enterEmailToAccess")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] text-center mb-1 transition-all duration-300">
                  {identifierSubmitted ? (
                    <>
                      {effectiveAuthMode === "phone" ? t("otpSentToWhatsApp") : t("otpSentTo")}{" "}
                      <span className="font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                        {effectiveAuthMode === "phone" ? recipientPhone : customerEmail}
                      </span>
                    </>
                  ) : effectiveAuthMode === "phone" ? (
                    t("verifyWithWhatsApp")
                  ) : (
                    t("emailRequiredForAccess")
                  )}
                </p>
                {identifierSubmitted && effectiveAuthMode === "email" && (
                  <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] text-center mb-1">
                    {t("checkSpamFolder")}
                  </p>
                )}

                {/* Spacer */}
                <div className={identifierSubmitted ? "mb-4" : "mb-5"} />

                {/* Auth mode toggle — only when transfer has both email and WhatsApp recipients */}
                {isMixedMode && !identifierSubmitted && (
                  <div
                    role="tablist"
                    aria-label={t("tabListLabel")}
                    aria-orientation="horizontal"
                    onKeyDown={handleAuthTabKeyDown}
                    className="flex justify-center gap-1 mb-5 p-1 bg-gray-100 dark:bg-[oklch(0.22_0_0)] rounded"
                  >
                    <button
                      ref={emailTabRef}
                      type="button"
                      role="tab"
                      aria-selected={authMode === "email"}
                      tabIndex={authMode === "email" ? 0 : -1}
                      onClick={() => { setAuthMode("email"); setError(""); }}
                      className={`flex-1 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] dark:focus-visible:ring-[#5E53E0] ${
                        authMode === "email"
                          ? "bg-white dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] shadow-sm"
                          : "text-gray-500 dark:text-[oklch(0.55_0_0)]"
                      }`}
                    >
                      {t("emailTab")}
                    </button>
                    <button
                      ref={whatsappTabRef}
                      type="button"
                      role="tab"
                      aria-selected={authMode === "phone"}
                      tabIndex={authMode === "phone" ? 0 : -1}
                      onClick={() => { setAuthMode("phone"); setError(""); }}
                      className={`flex-1 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#171717] dark:focus-visible:ring-[#5E53E0] ${
                        authMode === "phone"
                          ? "bg-white dark:bg-[oklch(0.28_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] shadow-sm"
                          : "text-gray-500 dark:text-[oklch(0.55_0_0)]"
                      }`}
                    >
                      {t("whatsappTab")}
                    </button>
                  </div>
                )}

                {/* ========== EMAIL MODE ========== */}
                {hasEmailRecipients && effectiveAuthMode === "email" && (
                  <>
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
                              ? "border-[#87E64B] bg-[#87E64B]/5 text-[#171717] dark:text-[oklch(0.91_0_0)] cursor-default"
                              : "border-gray-200 dark:border-[oklch(0.30_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#5E53E0] focus:border-transparent"
                          }`}
                          readOnly={emailSubmitted}
                          required
                          autoFocus={!emailSubmitted}
                        />
                        {emailSubmitted && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M4 10.5L8 14.5L16 6.5" stroke="#87E64B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {emailSubmitted && (
                        <button
                          onClick={() => { setEmailSubmitted(false); setOtpValue(""); setError(""); }}
                          className="text-xs text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium mt-1.5"
                        >
                          {t("changeEmail")}
                        </button>
                      )}
                      {!emailSubmitted && error && (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>
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
                        emailSubmitted ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <form onSubmit={handleOtpVerify}>
                        <div className="mb-4">
                          <input
                            ref={otpInputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={otpValue.length <= 3 ? otpValue : `${otpValue.slice(0, 3)} ${otpValue.slice(3)}`}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").replace(/\s/g, "");
                              if (value.length <= 6) setOtpValue(value);
                            }}
                            placeholder="000 000"
                            className={`w-full text-center font-bold bg-transparent outline-none ${otpValue ? "text-[#171717] dark:text-[oklch(0.91_0_0)]" : "text-[#D1D5DB] dark:text-[oklch(0.45_0_0)]"}`}
                            style={{ fontSize: "32px", letterSpacing: "0.3em", border: "none", padding: "16px 0" }}
                            maxLength={7}
                            required
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && otpValue.length === 6 && !isLoading) {
                                e.preventDefault();
                                handleOtpVerify(e as unknown as React.FormEvent);
                              }
                            }}
                          />
                          {emailSubmitted && error && (
                            <p className="text-sm text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>
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
                      <div className="text-center mt-4">
                        {canResendOtp ? (
                          <button onClick={handleResendOtp} disabled={isLoading} className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium disabled:opacity-50">
                            {t("resendOtp")}
                          </button>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-[oklch(0.50_0_0)]">
                            {t("resendOtpCountdown", { seconds: otpResendCountdown })}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ========== PHONE (WHATSAPP) MODE ========== */}
                {hasWhatsAppRecipients && effectiveAuthMode === "phone" && (
                  <>
                    {/* Phone input — read-only after submit */}
                    <div className="mb-4">
                      {!phoneSubmitted ? (
                        <PhoneNumberInput
                          value={recipientPhone}
                          onChange={(phone, valid) => {
                            setRecipientPhone(phone);
                            setIsRecipientPhoneValid(valid);
                          }}
                          defaultCountry="CI"
                          error={error || undefined}
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={recipientPhone}
                            readOnly
                            className="w-full px-4 py-3 border border-[#87E64B] bg-[#87E64B]/5 rounded text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] cursor-default"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                              <path d="M4 10.5L8 14.5L16 6.5" stroke="#87E64B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {phoneSubmitted && (
                        <button
                          onClick={() => { setPhoneSubmitted(false); setOtpValue(""); setError(""); }}
                          className="text-xs text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium mt-1.5"
                        >
                          {t("changeNumber")}
                        </button>
                      )}
                    </div>

                    {/* Continue button — hidden after phone submitted */}
                    {!phoneSubmitted && (
                      <form onSubmit={handlePhoneConfirm}>
                        <button
                          type="submit"
                          disabled={isLoading || !isRecipientPhoneValid}
                          className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? t("loading") : t("continue")}
                        </button>
                      </form>
                    )}

                    {/* OTP section — slides in after phone confirmed */}
                    <div
                      aria-live="polite"
                      className={`transition-all duration-300 ease-out overflow-hidden ${
                        phoneSubmitted ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <form onSubmit={handlePhoneOtpVerify}>
                        <div className="mb-4">
                          <input
                            ref={otpInputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={otpValue.length <= 3 ? otpValue : `${otpValue.slice(0, 3)} ${otpValue.slice(3)}`}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").replace(/\s/g, "");
                              if (value.length <= 6) setOtpValue(value);
                            }}
                            placeholder="000 000"
                            className={`w-full text-center font-bold bg-transparent outline-none ${otpValue ? "text-[#171717] dark:text-[oklch(0.91_0_0)]" : "text-[#D1D5DB] dark:text-[oklch(0.45_0_0)]"}`}
                            style={{ fontSize: "32px", letterSpacing: "0.3em", border: "none", padding: "16px 0" }}
                            maxLength={7}
                            required
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && otpValue.length === 6 && !isLoading) {
                                e.preventDefault();
                                handlePhoneOtpVerify(e as unknown as React.FormEvent);
                              }
                            }}
                          />
                          {phoneSubmitted && error && (
                            <p className="text-sm text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>
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
                      <div className="text-center mt-4">
                        {canResendOtp ? (
                          <button onClick={handlePhoneResendOtp} disabled={isLoading} className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] underline font-medium disabled:opacity-50">
                            {t("resendOtp")}
                          </button>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-[oklch(0.50_0_0)]">
                            {t("resendOtpCountdown", { seconds: otpResendCountdown })}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Back Link */}
                <button
                  onClick={() => {
                    setEmailSubmitted(false);
                    setPhoneSubmitted(false);
                    setOtpValue("");
                    setError("");
                    setPageState("ready");
                  }}
                  className="w-full mt-4 text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.91_0_0)] transition-colors"
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
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
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
              previewStatus: f.previewStatus,
            })) || []
          }
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          isPaid={false}
          shortCode={transfer.shortCode}
          sessionToken={passwordSessionToken || undefined}
        />

        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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

                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] text-center mb-2">
                  {t("previewingFiles")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] text-center mb-4">
                  {fileCount} {fileCount === 1 ? t("file") : t("files")} •{" "}
                  {formatSize(calculateTotalSize())}
                </p>

                {/* View Files Button */}
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="w-full px-6 py-3 mb-4 border border-gray-200 dark:border-[oklch(0.30_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  {t("preview")}
                </button>

                {/* Price Info for Paid Transfers */}
                {requiresPaymentAction && (
                  <div className="bg-gray-50 dark:bg-[oklch(0.24_0_0)] rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">
                        {tPayment("price")}
                      </span>
                      <span className="font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
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

                {/* Story 132.3 — Download recovery card / per-file fallback */}
                {isFallbackMode && transfer.files ? (
                  <PerFileDownloadList
                    shortCode={transfer.shortCode}
                    files={transfer.files}
                    sessionToken={passwordSessionToken || undefined}
                    email={customerEmail || undefined}
                    onBackToBundle={handleBackToBundle}
                  />
                ) : downloadRecovery ? (
                  <DownloadRecoveryCard
                    shortCode={transfer.shortCode}
                    recipientEmail={customerEmail}
                    senderName={transfer.senderProfile?.name ?? null}
                    scenario={downloadRecovery.scenario}
                    errorContext={downloadRecovery.errorContext}
                    attemptNumber={downloadRecovery.attempts}
                    isRetrying={isDownloading}
                    onRetry={handleRecoveryRetry}
                    onEnterFallback={handleEnterFallbackMode}
                    onDismiss={handleDismissRecoveryCard}
                  />
                ) : null}

                {/* Back Link */}
                <button
                  onClick={() => setPageState("ready")}
                  className="w-full mt-4 text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] hover:text-gray-700 dark:hover:text-[oklch(0.91_0_0)] transition-colors"
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
  // ──── Public Sale: Preview + Buy ─────────────────────────────────────
  if (pageState === "sale-preview" && transfer) {
    const priceDisplay = transfer.price
      ? `${(transfer.price / 100).toLocaleString()} ${transfer.currency === "XOF" ? "Fr CFA" : transfer.currency || ""}`
      : "";

    return (
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
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
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
              <div className="ze-upload-panel ze-request-checkout">
                {/* Cover Image or Download Icon */}
                <div className="flex flex-col items-center mb-6">
                  {transfer?.coverUrl ? (
                    <div className="w-[200px] h-[200px] overflow-hidden rounded relative">
                      <div className="absolute inset-0 animate-shimmer rounded" />
                      <Image
                        src={transfer.coverUrl}
                        alt={transfer.title || ""}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover relative z-10 transition-opacity duration-500"
                        unoptimized
                        onLoad={(e) => {
                          const prev = e.currentTarget.previousElementSibling as HTMLElement;
                          if (prev) prev.style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <CreditCard
                      className="w-20 h-20 text-gray-300 dark:text-[oklch(0.40_0_0)]"
                      strokeWidth={1}
                    />
                  )}
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] text-center mb-2">
                  {transfer.title || t("untitled")}
                  {fileCount > 1 && (
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-[oklch(0.50_0_0)]">
                      {t("plusFiles", { count: fileCount - 1 })}
                    </span>
                  )}
                </h1>

                {/* Delivery Note */}
                {transfer.message && (
                  <div className="w-full bg-[#FDFAF4] dark:bg-[oklch(0.22_0_0)] border-l-2 border-[#5E53E0] rounded-r-lg px-5 py-4 mb-5">
                    {getSenderEmail(transfer) && (
                      <p className="text-xs font-medium text-gray-400 dark:text-[oklch(0.50_0_0)] mb-1.5">
                        {getSenderEmail(transfer)}
                      </p>
                    )}
                    <p className="text-base text-[#171717] dark:text-[oklch(0.91_0_0)] leading-relaxed whitespace-pre-line">
                      {transfer.message}
                    </p>
                  </div>
                )}

                {/* File Info Row */}
                <div className="flex items-center justify-between py-5 px-4 bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded mb-4">
                  <div>
                    <p className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                      {fileCount} {fileCount === 1 ? t("file") : t("files")}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-400 dark:text-[oklch(0.50_0_0)]">
                    {formatSize(calculateTotalSize())}
                  </p>
                </div>

                {/* Preview button */}
                <button
                  onClick={() => {
                    if (transfer) {
                      openDrawerToView(
                        "transfers",
                        "transfer-preview",
                        transfer,
                        "receiver",
                      );
                    }
                  }}
                  className="w-full px-6 py-3 border-2 border-gray-300 dark:border-[oklch(0.30_0_0)] bg-white dark:bg-[oklch(0.24_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors flex items-center justify-center gap-2 mb-4"
                >
                  <Eye className="w-5 h-5" />
                  {t("preview")}
                </button>

                {/* Email Gateway */}
                {!isAuthenticated && (
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={saleBuyerEmail}
                        onChange={(e) => {
                          setSaleBuyerEmail(e.target.value);
                          setSaleEmailChecked(false);
                          setSaleHasPurchase(false);
                          setSaleOtpSent(false);
                          setSaleOtp("");
                        }}
                        placeholder={tSale("emailPlaceholder")}
                        required
                        className="flex-1 px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#5E53E0] focus:border-transparent text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !saleEmailChecked) {
                            e.preventDefault();
                            handleSaleEmailCheck();
                          }
                        }}
                      />
                      {!saleEmailChecked && (
                        <button
                          onClick={handleSaleEmailCheck}
                          disabled={saleCheckingEmail || !saleBuyerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saleBuyerEmail)}
                          className="px-4 py-3 bg-[#171717] dark:bg-[oklch(0.91_0_0)] text-white dark:text-[oklch(0.19_0_0)] font-medium rounded hover:bg-[#333] dark:hover:bg-[oklch(0.85_0_0)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                        >
                          {saleCheckingEmail ? tSale("checking") : tSale("continue")}
                        </button>
                      )}
                    </div>
                    {!saleEmailChecked && (
                      <p className="text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mt-1">
                        {tSale("enterEmail")}
                      </p>
                    )}
                  </div>
                )}

                {/* Purchase recovery: OTP verification.
                    For a signed-in user we know they own it, so we say so. For a
                    signed-out buyer we don't know and must not imply either way,
                    so the copy stays conditional and the Buy button stays visible. */}
                {saleOtpSent && (
                  <div className="mb-4 bg-[#F0FDE4] dark:bg-[oklch(0.25_0.05_130)] rounded p-5">
                    <p className="font-semibold text-[#171717] dark:text-[oklch(0.91_0_0)] text-sm mb-1">
                      {saleHasPurchase ? tSale("alreadyOwned") : tSale("alreadyBought")}
                    </p>
                    {saleOtpSent && (
                      <>
                        <p className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)] mb-3">
                          {(saleHasPurchase
                            ? tSale("otpSent")
                            : tSale("otpSentIfPurchased")
                          ).replace("{email}", saleBuyerEmail)}
                        </p>
                        <input
                          type="text"
                          value={saleOtp}
                          onChange={(e) => setSaleOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded text-[#171717] dark:text-[oklch(0.91_0_0)] dark:bg-[oklch(0.22_0_0)] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#171717] dark:focus:ring-[#5E53E0] focus:border-transparent mb-3"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && saleOtp.length === 6) {
                              e.preventDefault();
                              handleSaleOtpVerify();
                            }
                          }}
                        />
                        <button
                          onClick={handleSaleOtpVerify}
                          disabled={saleVerifyingOtp || saleOtp.length !== 6}
                          className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          {saleVerifyingOtp ? tSale("checking") : tSale("verifyAndDownload")}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-[oklch(0.50_0_0)] mt-2 text-center">
                          {tSale("noCharge")}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* New purchase: Buy button */}
                {(saleEmailChecked && !saleHasPurchase) || (isAuthenticated && !saleHasPurchase) ? (
                  <button
                    onClick={handleBuy}
                    disabled={isLoading}
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
                    <CreditCard className="w-5 h-5" />
                    {isLoading
                      ? tPayment("processing")
                      : `${tSale("buy")} ${priceDisplay}`}
                  </button>
                ) : null}

                {/* Security Notice */}
                <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] mt-3">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <p>{tPayment("securityGuarantee")}</p>
                </div>

                {/* Report Link */}
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="flex w-full justify-center items-center gap-2 text-sm text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-500 dark:hover:text-[oklch(0.65_0_0)] mt-4 transition-colors"
                >
                  <MessageAlert className="w-4 h-4" />
                  {t("reportTransfer")}
                </button>

                {/* Creator Strip -- shows when sender has a public profile (hidden on public sales) */}
                {transfer.senderProfile && !transfer.isPublicSales && (
                  <CreatorStrip
                    handle={transfer.senderProfile.handle}
                    name={transfer.senderProfile.name}
                    specialtyEn={transfer.senderProfile.specialtyEn}
                    specialtyFr={transfer.senderProfile.specialtyFr}
                    location={transfer.senderProfile.location}
                    profilePictureUrl={transfer.senderProfile.profilePictureUrl}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──── Public Sale: Checkout ────────────────────────────────────────────
  if (pageState === "sale-checkout" && transfer) {
    return (
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel !items-start ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
              isAuthenticated={isAuthenticated}
              showUpgradeCta={false}
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
                <SaleCheckoutPanel
                  transferId={transfer.id}
                  transferCurrency={transfer.currency || "XOF"}
                  buyerEmail={saleBuyerEmail}
                  onBack={() => setPageState("sale-preview")}
                  onPaymentInitiated={handleSalePaymentInitiated}
                  getCaptchaToken={getToken}
                />
              </div>

              {/* Transfer Summary */}
              <div className="w-full lg:w-[400px] flex-shrink-0">
                <TransferSummaryCard
                  title={transfer.title || "Untitled"}
                  fileCount={transfer.files?.length || 0}
                  totalSize={calculateTotalSize()}
                  price={transfer.price || 0}
                  currency={transfer.currency || "XOF"}
                  message={transfer.message}
                  createdAt={transfer.createdAt}
                  versionCount={transfer.versionCount}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──── Public Sale: Processing Payment ──────────────────────────────────
  if (pageState === "sale-processing" && transfer) {
    return (
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                <div className="flex justify-center mb-4">
                  <LoadingPanel />
                </div>
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                  {tSale("confirmingPayment")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)]">
                  {tSale("pleaseWait")}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──── Public Sale: Ready to Download ───────────────────────────────────
  if (pageState === "sale-ready" && transfer) {
    return (
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                  {tSale("paymentConfirmed")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-6">
                  {tSale("downloadReady")}
                </p>

                <button
                  onClick={handleSaleDownload}
                  disabled={isDownloading}
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
                  <Download className="w-5 h-5" />
                  {isDownloading
                    ? t("preparingDownload")
                    : t("downloadAllFiles")}
                </button>

                {/* Creator Strip -- shows when sender has a public profile (hidden on public sales) */}
                {transfer.senderProfile && !transfer.isPublicSales && (
                  <CreatorStrip
                    handle={transfer.senderProfile.handle}
                    name={transfer.senderProfile.name}
                    specialtyEn={transfer.senderProfile.specialtyEn}
                    specialtyFr={transfer.senderProfile.specialtyFr}
                    location={transfer.senderProfile.location}
                    profilePictureUrl={transfer.senderProfile.profilePictureUrl}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──── Public Sale: Expired Token ───────────────────────────────────────
  if (pageState === "sale-expired" && transfer) {
    return (
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <WarningCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                  {tSale("downloadExpired")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-6">
                  {tSale("downloadExpiredHint")}
                </p>

                <button
                  onClick={() => {
                    setSaleDownloadToken(null);
                    saleVerifyAttemptedRef.current = false;
                    setPageState("sale-preview");
                  }}
                  className="w-full px-6 py-3.5 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {tSale("buyAgain")}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (pageState === "ready" && transfer) {
    return (
      <div
        className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]"
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
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                    <p className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] leading-relaxed">
                      {t("newUserWelcomeBanner")}
                    </p>
                    <button
                      onClick={() => setShowNewUserBanner(false)}
                      className="text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-600 dark:hover:text-[oklch(0.75_0_0)] transition-colors flex-shrink-0 mt-0.5 pointer-events-auto"
                      aria-label={t("dismissBanner")}
                    >
                      <Xmark className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Download Arrow Icon or Cover Image */}
                <div className="flex flex-col items-center mb-6">
                  {transfer?.coverUrl ? (
                    <div className="w-[200px] h-[200px] overflow-hidden rounded">
                      <img
                        src={transfer.coverUrl}
                        alt={transfer.title || ""}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <Download
                      className="w-30 h-30 text-gray-300 dark:text-[oklch(0.40_0_0)]"
                      strokeWidth={1.5}
                    />
                  )}
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] text-center mb-2">
                  {t("downloadFiles")} !
                </h1>

                {/* Expiry Info */}
                {transfer.expireAt && (
                  <p className="text-sm font-medium text-gray-500 dark:text-[oklch(0.65_0_0)] text-center mb-1">
                    {t("filesExpireIn")}
                  </p>
                )}
                {transfer.expireAt && (
                  <p className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] text-center mb-6">
                    {getDaysUntilExpiry()}
                  </p>
                )}

                {/* Transfer Title */}
                <h2 className="text-base font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1 break-all">
                  {transfer.title || t("untitled")}
                  {fileCount > 1 && (
                    <span className="ml-2 text-xs font-normal text-gray-400 dark:text-[oklch(0.50_0_0)]">
                      {t("plusFiles", { count: fileCount - 1 })}
                    </span>
                  )}
                </h2>

                {/* Spacer below the title. Unconditional: it used to be the
                    else-branch of a "Take a look before you pay." subtitle that
                    only rendered for unpaid paid transfers. With that line gone,
                    a conditional spacer would leave exactly those transfers with
                    no gap at all between the title and the file row. */}
                <div className="mb-3" />

                {/* File Info Row */}
                <div className="flex items-center justify-between py-5 px-4 bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded mb-4">
                  <div>
                    <p className="text-sm font-medium text-[#171717] dark:text-[oklch(0.91_0_0)]">
                      {fileCount} {fileCount === 1 ? t("file") : t("files")}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-400 dark:text-[oklch(0.50_0_0)]">
                    {formatSize(calculateTotalSize())}
                  </p>
                </div>

                {/* Report Link */}
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="flex w-full justify-center items-center gap-2 text-sm text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-500 dark:hover:text-[oklch(0.65_0_0)] mb-6 transition-colors"
                >
                  <MessageAlert className="w-4 h-4" />
                  {t("reportTransfer")}
                </button>

                {/* Payment unavailable warning */}
                {paymentsDisabled &&
                  transfer.price &&
                  transfer.price > 0 &&
                  !transfer.isPaid && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded p-4 mb-4 flex items-start gap-3">
                      <WarningCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">
                          {tPayment("systemUnavailable")}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
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

                  {/* Story 132.3 — Download recovery card / per-file fallback */}
                  {isFallbackMode && transfer.files ? (
                    <PerFileDownloadList
                      shortCode={transfer.shortCode}
                      files={transfer.files}
                      sessionToken={passwordSessionToken || undefined}
                      email={customerEmail || undefined}
                      onBackToBundle={handleBackToBundle}
                    />
                  ) : downloadRecovery ? (
                    <DownloadRecoveryCard
                      shortCode={transfer.shortCode}
                      recipientEmail={customerEmail}
                      senderName={transfer.senderProfile?.name ?? null}
                      scenario={downloadRecovery.scenario}
                      errorContext={downloadRecovery.errorContext}
                      attemptNumber={downloadRecovery.attempts}
                      isRetrying={isDownloading}
                      onRetry={handleRecoveryRetry}
                      onEnterFallback={handleEnterFallbackMode}
                      onDismiss={handleDismissRecoveryCard}
                    />
                  ) : null}

                  <button
                    onClick={handlePreviewClick}
                    className="w-full px-6 py-3.5 border-2 border-gray-300 dark:border-[oklch(0.30_0_0)] bg-white dark:bg-[oklch(0.24_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium rounded hover:bg-gray-50 dark:hover:bg-[oklch(0.28_0_0)] transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    {t("preview")}
                  </button>
                </div>

                {/* Creator Strip -- shows when sender has a public profile (hidden on public sales) */}
                {transfer.senderProfile && !transfer.isPublicSales && (
                  <CreatorStrip
                    handle={transfer.senderProfile.handle}
                    name={transfer.senderProfile.name}
                    specialtyEn={transfer.senderProfile.specialtyEn}
                    specialtyFr={transfer.senderProfile.specialtyFr}
                    location={transfer.senderProfile.location}
                    profilePictureUrl={transfer.senderProfile.profilePictureUrl}
                  />
                )}
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
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-[oklch(0.50_0_0)] hover:text-gray-500 dark:hover:text-[oklch(0.65_0_0)] transition-colors"
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
      <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
        <ToastContainer />
        {pageHeader}
        <main style={{ minHeight: "calc(100vh - 64px)", position: "relative" }}>
          <div
            className={`ze-content-panel ${transfer?.wallpaperUrl ? "ze-wallpaper-mode" : `ze-time-${timeOfDay}`}`}
            style={{ position: "relative", overflow: "hidden" }}
          >
            <ContentPanelBackground
              wallpaperUrl={transfer?.wallpaperUrl}
              hasPrice={(transfer?.price ?? 0) > 0}
              timeOfDay={timeOfDay}
              isHydrated={isHydrated}
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
                <h1 className="text-xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
                  {t("downloadedTitle")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-1">
                  {transfer.title || t("untitled")}
                  {fileCount > 1 && (
                    <span className="ml-1.5 text-xs text-gray-400 dark:text-[oklch(0.50_0_0)]">
                      {t("plusFiles", { count: fileCount - 1 })}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-[oklch(0.65_0_0)] mb-8">
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
