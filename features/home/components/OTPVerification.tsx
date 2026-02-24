"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NavArrowLeft } from "iconoir-react";

interface OTPVerificationProps {
  email: string;
  onBack: () => void;
  onVerify: (code: string) => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onBack,
  onVerify,
}) => {
  const otpLength = parseInt(process.env.NEXT_PUBLIC_OTP_LENGTH || "6", 10);
  const t = useTranslations("otp");
  const tCommon = useTranslations("common");
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>("");
  const [resendCountdown, setResendCountdown] = useState(30);

  // Countdown timer for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Format OTP for display (e.g., "123456" -> "123 456")
  const formatOTPDisplay = (value: string): string => {
    if (value.length <= 3) return value;
    return `${value.slice(0, 3)} ${value.slice(3)}`;
  };

  // Parse backend error message and return translated version
  const getTranslatedError = (errorMessage: string): string => {
    // Check for "Invalid verification code. X attempts remaining."
    const attemptsMatch = errorMessage.match(/(\d+)\s*attempts?\s*remaining/i);
    if (attemptsMatch) {
      const attempts = parseInt(attemptsMatch[1], 10);
      return t("invalidCodeWithAttempts", { attempts });
    }

    // Check for "Please wait X seconds before requesting"
    const waitMatch = errorMessage.match(/wait\s*(\d+)\s*seconds/i);
    if (waitMatch) {
      const seconds = parseInt(waitMatch[1], 10);
      return t("waitBeforeResend", { seconds });
    }

    // Check for common error patterns
    if (errorMessage.toLowerCase().includes("invalid") && errorMessage.toLowerCase().includes("code")) {
      return t("invalidCode");
    }

    if (errorMessage.toLowerCase().includes("expired")) {
      return t("invalidCode");
    }

    // Fallback to original message or generic error
    return errorMessage || t("invalidCode");
  };

  const handleSubmit = async () => {
    if (otpCode.length !== otpLength) return;

    setIsVerifying(true);
    setError("");
    try {
      await onVerify(otpCode);
    } catch (err: any) {
      // Parse and translate error message from API
      const translatedError = getTranslatedError(err.message || "");
      setError(translatedError);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    // TODO: Implement resend code logic
    setResendCountdown(30);
  };

  const handleLearnMore = () => {
    window.open("/privacy", "_blank", "noopener,noreferrer");
  };

  const isButtonDisabled = otpCode.length !== otpLength || isVerifying;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Title */}
      <h2 className="text-lg font-bold text-black mb-4 text-center">
        {t("title")}
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center mb-1">
        {t("description")}
      </p>
      <p className="text-sm font-semibold text-black text-center mb-1">
        {email}
      </p>
      <p className="text-sm text-gray-600 text-center mb-1">
        {t("instruction")}
      </p>
      <p className="text-xs text-gray-400 text-center mb-6">
        {t("checkSpamFolder")}
      </p>

      {/* OTP Input - No border, large font like reference */}
      <div className="w-full mb-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formatOTPDisplay(otpCode)}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "").replace(/\s/g, "");
            if (value.length <= otpLength) {
              setOtpCode(value);
              setError(""); // Clear error on input change
            }
          }}
          placeholder="000 000"
          className="w-full text-center font-bold bg-transparent outline-none"
          style={{
            fontSize: "32px",
            letterSpacing: "0.3em",
            color: otpCode ? "#171717" : "#D1D5DB",
            border: "none",
            padding: "16px 0",
          }}
          disabled={isVerifying}
          maxLength={otpLength + 1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isButtonDisabled) {
              handleSubmit();
            }
          }}
        />
        {error && (
          <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
        )}
      </div>

      {/* Links */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button
          className="font-bold underline text-[#171717] hover:opacity-80 transition-opacity"
          onClick={handleLearnMore}
          type="button"
        >
          {t("knowMore")}
        </button>
        <span className="text-gray-400">{tCommon("or")}</span>
        {resendCountdown > 0 ? (
          <span className="text-gray-400 text-sm">
            {t("resendOtpCountdown", { seconds: resendCountdown })}
          </span>
        ) : (
          <button
            className="font-bold underline text-[#171717] hover:opacity-80 transition-opacity"
            onClick={handleResendCode}
            type="button"
          >
            {t("resendCode")}
          </button>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={onBack}
          className="ze-options-button"
          disabled={isVerifying}
          type="button"
          aria-label="Back"
        >
          <NavArrowLeft width={20} height={20} strokeWidth={2} />
        </button>

        <button
          onClick={handleSubmit}
          disabled={isButtonDisabled}
          className="ze-transfer-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? t("verifying") : t("checkAndSend")}
        </button>
      </div>

      {/* Terms & Privacy Agreement - implicit consent by usage */}
      <div className="w-full mt-3">
        <p className="text-xs text-center text-gray-600">
          {t("termsAgreement")}{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#171717] font-medium underline hover:opacity-80 transition-opacity"
          >
            {t("termsOfService")}
          </a>{" "}
          {t("and")}{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#171717] font-medium underline hover:opacity-80 transition-opacity"
          >
            {t("privacyPolicy")}
          </a>
        </p>
      </div>
    </div>
  );
};

export default OTPVerification;
