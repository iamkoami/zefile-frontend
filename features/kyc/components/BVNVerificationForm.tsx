"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  Check,
  WarningCircle,
  Refresh,
  ArrowLeft,
} from "iconoir-react";
import {
  kycApi,
  BvnInitiateResponse,
  BvnVerificationResponse,
  BvnSessionStatusResponse,
} from "@/services/kyc-api";
import { toast } from "@/components/shared/Toast";

type VerificationStep = "input" | "otp" | "success" | "pending" | "error";

/**
 * Retry configuration for API calls
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Retry an async function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  shouldRetry: (error: unknown) => boolean = () => true,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or shouldn't retry this error
      if (attempt >= config.maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = config.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
      const delay = Math.min(baseDelay + jitter, config.maxDelayMs);

      console.log(`Retry attempt ${attempt + 1} after ${Math.round(delay)}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Determine if an error is retryable (network errors, 5xx, rate limits)
 */
function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Check for API response errors
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    const status = errObj.status as number | undefined;

    // Retry on server errors (5xx) or rate limits (429)
    if (status && (status >= 500 || status === 429)) {
      return true;
    }
  }

  return false;
}

interface BVNVerificationFormProps {
  /** Callback when verification is successful */
  onSuccess?: (result: BvnVerificationResponse) => void;
  /** Callback when user wants to use document upload instead */
  onSwitchToDocuments?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * BVNVerificationForm - BVN verification with OTP flow
 *
 * Story 16.5: Frontend BVN Input Form
 *
 * Flow:
 * 1. User enters 11-digit BVN
 * 2. System sends OTP to BVN-registered phone
 * 3. User enters 6-digit OTP
 * 4. Verification complete (auto-approved or pending review)
 */
export function BVNVerificationForm({
  onSuccess,
  onSwitchToDocuments,
  className = "",
}: BVNVerificationFormProps) {
  const t = useTranslations("kyc");

  // Form state
  const [step, setStep] = useState<VerificationStep>("input");
  const [bvn, setBvn] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Timer state for OTP expiry and resend
  const [expiresIn, setExpiresIn] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [remainingResends, setRemainingResends] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Result state
  const [verificationResult, setVerificationResult] =
    useState<BvnVerificationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OTP input refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const response = await kycApi.getBvnSessionStatus();
        if (response.data?.active && response.data.sessionId) {
          setSessionId(response.data.sessionId);
          setPhoneMasked(response.data.phoneMasked || null);
          setExpiresIn(response.data.expiresIn || 0);
          setRemainingAttempts(response.data.remainingAttempts || 3);
          setRemainingResends(response.data.remainingResends || 3);
          setStep("otp");
        }
      } catch (error) {
        console.error("Failed to check session:", error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, []);

  // OTP expiry countdown
  useEffect(() => {
    if (expiresIn <= 0) return;

    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresIn]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Validate BVN format
  const isValidBvn = (value: string): boolean => {
    return /^\d{11}$/.test(value);
  };

  // Handle BVN input
  const handleBvnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 11);
    setBvn(value);
    setErrorMessage(null);
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setErrorMessage(null);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Initiate BVN verification with retry logic
  const handleInitiate = async () => {
    if (!isValidBvn(bvn)) {
      setErrorMessage(t("bvnInvalidFormat"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await withRetry(
        () => kycApi.initiateBvnVerification(bvn),
        DEFAULT_RETRY_CONFIG,
        isRetryableError,
      );

      if (response.error) {
        setErrorMessage(response.error.message || t("bvnVerificationFailed"));
        return;
      }

      if (response.data?.success) {
        if (response.data.sessionId) {
          // OTP flow
          setSessionId(response.data.sessionId);
          setPhoneMasked(response.data.phoneMasked || null);
          setExpiresIn(response.data.expiresIn || 600);
          setStep("otp");
          toast.success(t("bvnOtpSent"));
        } else {
          // Direct verification (no OTP needed)
          toast.success(response.data.message);
          setVerificationResult({
            success: true,
            message: response.data.message,
          });
          setStep("success");
          onSuccess?.({ success: true, message: response.data.message });
        }
      } else {
        setErrorMessage(response.data?.message || t("bvnVerificationFailed"));
      }
    } catch (error) {
      console.error("BVN initiation failed:", error);
      setErrorMessage(t("bvnVerificationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP with retry logic
  const handleVerifyOtp = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6 || !sessionId) {
      setErrorMessage(t("bvnOtpInvalid"));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await withRetry(
        () => kycApi.completeBvnVerification(sessionId, otpValue),
        DEFAULT_RETRY_CONFIG,
        isRetryableError,
      );

      if (response.error) {
        setErrorMessage(response.error.message || t("bvnVerificationFailed"));
        setRemainingAttempts((prev) => Math.max(0, prev - 1));
        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
        return;
      }

      if (response.data?.success) {
        setVerificationResult(response.data);

        if (response.data.kycStatus === "verified") {
          setStep("success");
          toast.success(t("bvnVerificationSuccess"));
        } else if (response.data.requiresReview) {
          setStep("pending");
          toast.info(t("bvnPendingReview"));
        } else {
          setStep("success");
          toast.success(response.data.message);
        }

        onSuccess?.(response.data);
      } else {
        if (response.data?.remainingAttempts !== undefined) {
          setRemainingAttempts(response.data.remainingAttempts);
        }
        setErrorMessage(response.data?.message || t("bvnVerificationFailed"));
        setOtp(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("OTP verification failed:", error);
      setErrorMessage(t("bvnVerificationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!sessionId || resendCooldown > 0 || remainingResends <= 0) return;

    setIsLoading(true);

    try {
      const response = await kycApi.resendBvnOtp(sessionId);

      if (response.error) {
        toast.error(response.error.message || t("bvnResendFailed"));
        return;
      }

      if (response.data?.success) {
        setExpiresIn(response.data.expiresIn || 600);
        setRemainingResends(
          response.data.remainingResends ?? remainingResends - 1,
        );
        setResendCooldown(30); // 30 second cooldown
        setOtp(["", "", "", "", "", ""]);
        toast.success(t("bvnOtpResent"));
        otpInputRefs.current[0]?.focus();
      } else {
        toast.error(response.data?.message || t("bvnResendFailed"));
      }
    } catch (error) {
      console.error("Resend OTP failed:", error);
      toast.error(t("bvnResendFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to BVN input
  const handleBack = () => {
    setStep("input");
    setSessionId(null);
    setOtp(["", "", "", "", "", ""]);
    setErrorMessage(null);
  };

  // Render loading state
  if (isCheckingSession) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin w-8 h-8 border-2 border-[#5E53E0] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Render success state
  if (step === "success") {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-[#87E64B]/20 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-[#87E64B]" />
        </div>
        <h3 className="text-xl font-bold text-[#171717] mb-2">
          {t("bvnVerified")}
        </h3>
        <p className="text-gray-600 mb-4">{t("bvnVerifiedDescription")}</p>
        {verificationResult?.verifiedName && (
          <p className="text-sm text-gray-500">
            {t("bvnVerifiedAs")}:{" "}
            <strong>{verificationResult.verifiedName}</strong>
          </p>
        )}
      </div>
    );
  }

  // Render pending review state
  if (step === "pending") {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-[#171717] mb-2">
          {t("bvnPendingTitle")}
        </h3>
        <p className="text-gray-600 mb-4">{t("bvnPendingDescription")}</p>
        {verificationResult?.verifiedName && (
          <p className="text-sm text-gray-500 mb-4">
            {t("bvnVerifiedAs")}:{" "}
            <strong>{verificationResult.verifiedName}</strong>
          </p>
        )}
        <p className="text-xs text-gray-400">{t("bvnPendingReviewTime")}</p>
      </div>
    );
  }

  // Render OTP input step
  if (step === "otp") {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-[#171717]">
              {t("bvnEnterOtp")}
            </h3>
            <p className="text-sm text-gray-600">
              {t("bvnOtpSentTo")} <strong>{phoneMasked || "****"}</strong>
            </p>
          </div>
        </div>

        {/* OTP Input */}
        <div
          className="flex justify-center gap-2"
          role="group"
          aria-label={t("bvnOtpInputGroup")}
        >
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                otpInputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              onPaste={index === 0 ? handleOtpPaste : undefined}
              className={`w-12 h-14 text-center text-xl font-bold border-2 rounded transition-colors outline-none ${
                errorMessage
                  ? "border-red-400 focus:border-red-500"
                  : "border-gray-300 focus:border-[#171717]"
              }`}
              disabled={isLoading}
              aria-label={t("bvnOtpDigit", { position: index + 1 })}
              aria-describedby={errorMessage ? "otp-error" : undefined}
              autoComplete="one-time-code"
              pattern="[0-9]*"
            />
          ))}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            id="otp-error"
            role="alert"
            aria-live="polite"
            className="flex items-center justify-center gap-2 text-red-500 text-sm"
          >
            <WarningCircle className="w-4 h-4" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Timer and attempts */}
        <div className="text-center text-sm text-gray-500">
          {expiresIn > 0 ? (
            <p>
              {t("bvnOtpExpiresIn")} <strong>{formatTime(expiresIn)}</strong>
            </p>
          ) : (
            <p className="text-red-500">{t("bvnOtpExpired")}</p>
          )}
          {remainingAttempts < 3 && (
            <p className="mt-1 text-yellow-600">
              {t("bvnAttemptsRemaining", { count: remainingAttempts })}
            </p>
          )}
        </div>

        {/* Resend button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isLoading || resendCooldown > 0 || remainingResends <= 0}
            className="inline-flex items-center gap-2 text-[#171717] underline text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Refresh className="w-4 h-4" />
            {resendCooldown > 0
              ? `${t("bvnResendIn")} ${resendCooldown}s`
              : remainingResends <= 0
                ? t("bvnNoResendsLeft")
                : t("bvnResendOtp")}
          </button>
        </div>

        {/* Verify button */}
        <button
          type="button"
          onClick={handleVerifyOtp}
          disabled={isLoading || otp.join("").length !== 6 || expiresIn <= 0}
          className="w-full py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? t("bvnVerifying") : t("bvnVerify")}
        </button>

        {/* Switch to documents */}
        {onSwitchToDocuments && (
          <button
            type="button"
            onClick={onSwitchToDocuments}
            className="w-full py-2 text-[#171717] underline text-sm font-medium"
          >
            {t("bvnUseDocumentsInstead")}
          </button>
        )}
      </div>
    );
  }

  // Render BVN input step (default)
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[#171717]">
          {t("bvnTitle")}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{t("bvnDescription")}</p>
      </div>

      {/* BVN Input */}
      <div>
        <label className="block text-sm font-medium text-[#171717] mb-1">
          {t("bvnNumber")}
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={bvn}
          onChange={handleBvnChange}
          placeholder={t("bvnPlaceholder")}
          maxLength={11}
          className={`w-full px-4 py-3 border-2 rounded text-lg tracking-widest font-mono transition-colors outline-none ${
            errorMessage
              ? "border-red-400 focus:border-red-500"
              : "border-gray-300 focus:border-[#171717]"
          }`}
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">{t("bvnHint")}</p>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <WarningCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Security notice */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">{t("bvnSecurityNotice")}</p>
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleInitiate}
        disabled={isLoading || !isValidBvn(bvn)}
        className="w-full py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? t("bvnVerifying") : t("bvnContinue")}
      </button>

      {/* Switch to documents */}
      {onSwitchToDocuments && (
        <button
          type="button"
          onClick={onSwitchToDocuments}
          className="w-full py-2 text-[#171717] underline text-sm font-medium"
        >
          {t("bvnUseDocumentsInstead")}
        </button>
      )}
    </div>
  );
}

export default BVNVerificationForm;
