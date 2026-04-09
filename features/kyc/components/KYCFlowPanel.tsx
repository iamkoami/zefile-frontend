"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Flag from "react-flagpack";
import {
  ShieldCheck,
  Check,
  NavArrowDown,
  ArrowLeft,
  WarningCircle,
  Page,
  Clock,
  Eye,
  Lock,
  Xmark,
  XmarkCircle,
} from "iconoir-react";
import {
  kycApi,
  KycRoutingResponse,
  KycVerificationStatusResponse,
  IdentityCountry,
  BvnVerificationResponse,
} from "@/services/kyc-api";
import { toast } from "@/components/shared/Toast";
import { BVNVerificationForm } from "./BVNVerificationForm";
import { KYCUploadPanel } from "./KYCUploadPanel";

type KycFlowStep =
  | "loading"
  | "country"
  | "method"
  | "bvn"
  | "documents"
  | "success"
  | "pending"
  | "rejected";

// Supported countries for KYC identity verification (no International option)
// BVN verification available for Nigeria only; TG and BJ route to manual verification via Startbutton
const COUNTRIES: {
  code: IdentityCountry;
  name: string;
  nameFr: string;
  flagCode: string;
  hasBvn: boolean;
}[] = [
  {
    code: "NG",
    name: "Nigeria",
    nameFr: "Nigeria",
    flagCode: "NG",
    hasBvn: true,
  },
  { code: "GH", name: "Ghana", nameFr: "Ghana", flagCode: "GH", hasBvn: false },
  { code: "KE", name: "Kenya", nameFr: "Kenya", flagCode: "KE", hasBvn: false },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    nameFr: "Côte d'Ivoire",
    flagCode: "CI",
    hasBvn: false,
  },
  { code: "TG", name: "Togo", nameFr: "Togo", flagCode: "TG", hasBvn: false },
  { code: "BJ", name: "Benin", nameFr: "Benin", flagCode: "BJ", hasBvn: false },
];

interface KYCFlowPanelProps {
  /** Callback when verification flow completes */
  onComplete?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * KYCFlowPanel - Multi-step KYC verification flow
 *
 * Story 16.6: Multi-Step KYC Flow
 *
 * Flow:
 * 1. Select identity country
 * 2. For Nigeria: Choose BVN verification or document upload
 * 3. For other countries: Proceed to document upload
 * 4. Complete verification
 */
export function KYCFlowPanel({
  onComplete,
  className = "",
}: KYCFlowPanelProps) {
  const t = useTranslations("kyc");

  // Flow state
  const [step, setStep] = useState<KycFlowStep>("loading");
  const [selectedCountry, setSelectedCountry] =
    useState<IdentityCountry | null>(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // API data
  const [routing, setRouting] = useState<KycRoutingResponse | null>(null);
  const [verificationStatus, setVerificationStatus] =
    useState<KycVerificationStatusResponse | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingCountry, setIsSettingCountry] = useState(false);

  // Fetch initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [routingRes, statusRes] = await Promise.all([
          kycApi.getKycRouting(),
          kycApi.getVerificationStatus(),
        ]);

        if (routingRes.data) {
          setRouting(routingRes.data);
        }

        const statusData = statusRes.data;
        if (statusData) {
          setVerificationStatus(statusData);

          // Check if already verified or pending
          if (statusData.kycStatus === "verified") {
            setStep("success");
          } else if (statusData.kycStatus === "pending") {
            setStep("pending");
          } else if (statusData.kycStatus === "rejected") {
            if (statusData.identityCountry) {
              setSelectedCountry(statusData.identityCountry);
            }
            setStep("rejected");
          } else if (statusData.identityCountry) {
            // Country already set - determine next step
            setSelectedCountry(statusData.identityCountry);
            const country = COUNTRIES.find(
              (c) => c.code === statusData.identityCountry,
            );
            if (country?.hasBvn && routingRes.data?.bvnAvailable) {
              setStep("method");
            } else {
              setStep("documents");
            }
          } else {
            // Need to select country
            setStep("country");
          }
        } else {
          setStep("country");
        }
      } catch (error) {
        console.error("Failed to fetch KYC status:", error);
        setStep("country");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // Handle country selection
  const handleCountrySelect = async (country: IdentityCountry) => {
    setSelectedCountry(country);
    setIsCountryDropdownOpen(false);
    setIsSettingCountry(true);

    try {
      const response = await kycApi.setIdentityCountry(country);

      if (response.error) {
        toast.error(response.error.message || t("countrySetFailed"));
        return;
      }

      // Check if BVN is available for this country
      const countryInfo = COUNTRIES.find((c) => c.code === country);
      if (countryInfo?.hasBvn) {
        setStep("method");
      } else {
        setStep("documents");
      }
    } catch (error) {
      console.error("Failed to set country:", error);
      toast.error(t("countrySetFailed"));
    } finally {
      setIsSettingCountry(false);
    }
  };

  // Handle method selection
  const handleMethodSelect = (method: "bvn" | "documents") => {
    setStep(method);
  };

  // Handle BVN verification success
  const handleBvnSuccess = (result: BvnVerificationResponse) => {
    if (result.kycStatus === "verified") {
      setStep("success");
    } else if (result.requiresReview) {
      setStep("pending");
    } else {
      setStep("success");
    }
    onComplete?.();
  };

  // Handle document submission success
  const handleDocumentSuccess = () => {
    setStep("pending");
    onComplete?.();
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === "method") {
      setStep("country");
      setSelectedCountry(null);
    } else if (step === "bvn" || step === "documents") {
      const country = COUNTRIES.find((c) => c.code === selectedCountry);
      if (country?.hasBvn) {
        setStep("method");
      } else {
        setStep("country");
        setSelectedCountry(null);
      }
    }
  };

  // Render loading state
  if (step === "loading" || isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin w-8 h-8 border-2 border-[#5E53E0] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Render success state
  if (step === "success") {
    return (
      <KYCStatusView
        status="verified"
        verifiedFirstName={verificationStatus?.verifiedFirstName}
        verifiedLastName={verificationStatus?.verifiedLastName}
        className={className}
      />
    );
  }

  // Render pending state
  if (step === "pending") {
    return <KYCStatusView status="pending" className={className} />;
  }

  // Render rejected state
  if (step === "rejected") {
    return (
      <KYCStatusView
        status="rejected"
        rejectionReason={verificationStatus?.rejectionReason}
        onResubmit={() => {
          if (selectedCountry) {
            const country = COUNTRIES.find((c) => c.code === selectedCountry);
            if (country?.hasBvn && routing?.bvnAvailable) {
              setStep("method");
            } else {
              setStep("documents");
            }
          } else {
            setStep("country");
          }
        }}
        className={className}
      />
    );
  }

  // Render country selection
  if (step === "country") {
    return (
      <div className={`space-y-6 ${className} `}>
        {/* Header */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-[#171717]">
            {t("identityVerification")}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t("selectCountryDescription")}
          </p>
        </div>

        {/* Country Selector */}
        <div className="relative">
          <label className="block text-sm font-medium text-[#171717] mb-2">
            {t("yourCountry")}
          </label>
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            disabled={isSettingCountry}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded text-left hover:border-gray-400 transition-colors disabled:opacity-50"
          >
            <span
              className={`flex items-center gap-3 ${selectedCountry ? "text-[#171717]" : "text-gray-400"}`}
            >
              {selectedCountry ? (
                <>
                  <Flag
                    code={
                      COUNTRIES.find((c) => c.code === selectedCountry)
                        ?.flagCode || selectedCountry
                    }
                    size="m"
                    hasBorder={false}
                  />
                  <span>
                    {COUNTRIES.find((c) => c.code === selectedCountry)?.name}
                  </span>
                </>
              ) : (
                t("selectCountry")
              )}
            </span>
            <NavArrowDown
              className={`w-5 h-5 text-gray-400 transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isCountryDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-80 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country.code)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                    country.code === selectedCountry
                      ? "bg-gray-50 font-medium"
                      : ""
                  }`}
                >
                  <Flag code={country.flagCode} size="m" hasBorder={false} />
                  <span className="flex-1">{country.name}</span>
                  {country.hasBvn && (
                    <span className="text-xs text-[#87E64B] bg-[#87E64B]/10 px-2 py-0.5 rounded font-medium">
                      {t("bvnAvailable")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info notice */}
        <div className="bg-gray-50 border border-gray-200 rounded p-4">
          <p className="text-sm text-gray-600">{t("countrySelectionInfo")}</p>
        </div>
      </div>
    );
  }

  // Render method selection (for Nigerian users)
  if (step === "method") {
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
            <h2 className="text-xl font-bold text-[#171717]">
              {t("chooseVerificationMethod")}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t("chooseMethodDescription")}
            </p>
          </div>
        </div>

        {/* Method options */}
        <div className="space-y-4">
          {/* BVN Option */}
          <button
            type="button"
            onClick={() => handleMethodSelect("bvn")}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-[#5E53E0] hover:bg-[#5E53E0]/5 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#87E64B]/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-[#87E64B]/20 transition-colors">
                <ShieldCheck className="w-6 h-6 text-[#171717]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#171717] mb-1">
                  {t("bvnMethodTitle")}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {t("bvnMethodDescription")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5E53E0] bg-[#5E53E0]/10 px-2 py-0.5 rounded font-medium">
                    {t("recommended")}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t("instantVerification")}
                  </span>
                </div>
              </div>
            </div>
          </button>

          {/* Document Upload Option */}
          <button
            type="button"
            onClick={() => handleMethodSelect("documents")}
            className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                <Page className="w-6 h-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#171717] mb-1">
                  {t("documentMethodTitle")}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {t("documentMethodDescription")}
                </p>
                <span className="text-xs text-gray-500">
                  {t("manualReview")}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Render BVN verification
  if (step === "bvn") {
    return (
      <div className={className}>
        {/* Back button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t("back")}</span>
          </button>
        </div>

        <BVNVerificationForm
          onSuccess={handleBvnSuccess}
          onSwitchToDocuments={() => setStep("documents")}
        />
      </div>
    );
  }

  // Render document upload
  if (step === "documents") {
    return (
      <div className={className}>
        {/* Back button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#171717] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t("back")}</span>
          </button>
        </div>

        <KYCUploadPanel onSubmitSuccess={handleDocumentSuccess} />
      </div>
    );
  }

  // Default/error state
  return (
    <div className={`text-center py-8 ${className}`}>
      <WarningCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-gray-600">{t("unexpectedError")}</p>
    </div>
  );
}

export default KYCFlowPanel;

// --- Sub-components ---

type KycViewStatus = "verified" | "pending" | "rejected";

const TIMELINE_STEPS = [
  { titleKey: "stepSelectCountry", descriptionKey: "stepSelectCountryDesc" },
  { titleKey: "stepUploadId", descriptionKey: "stepUploadIdDesc" },
  { titleKey: "stepTakeSelfie", descriptionKey: "stepTakeSelfieDesc" },
  { titleKey: "stepSubmitReview", descriptionKey: "stepSubmitReviewDesc" },
] as const;

function KYCStatusView({
  status,
  verifiedFirstName,
  verifiedLastName,
  rejectionReason,
  onResubmit,
  className = "",
}: {
  status: KycViewStatus;
  verifiedFirstName?: string;
  verifiedLastName?: string;
  rejectionReason?: string;
  onResubmit?: () => void;
  className?: string;
}) {
  const t = useTranslations("kyc");

  const getStepState = (
    index: number,
  ): "completed" | "pending" | "rejected" => {
    if (status === "verified") return "completed";
    if (index < 3) return "completed";
    return status === "pending" ? "pending" : "rejected";
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Page Title */}
      <h2 className="text-2xl font-bold text-[#171717] dark:text-white">
        {t("identityVerification")}
      </h2>

      {/* Hero Card */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-[#171717] dark:text-white mb-2">
          {t("heroTitle")}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t("heroDescription")}
        </p>

        {status === "verified" && verifiedFirstName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t("verifiedAs")}:{" "}
            <strong className="text-[#171717] dark:text-white">
              {verifiedFirstName} {verifiedLastName}
            </strong>
          </p>
        )}

        {/* Status */}
        <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-2">
          {t("yourStatus")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {status === "verified" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#87E64B]/10 text-[#171717] dark:text-white text-sm font-medium rounded-full">
              <Check className="w-4 h-4 text-[#171717]" />
              {t("statusVerified")}
            </span>
          )}
          {status === "pending" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm font-medium rounded-full">
              <Clock className="w-4 h-4" />
              {t("statusPending")}
            </span>
          )}
          {status === "rejected" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm font-medium rounded-full">
              <XmarkCircle className="w-4 h-4" />
              {t("statusRejected")}
            </span>
          )}
          {status === "verified" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-full">
              <Eye className="w-4 h-4" />
              {t("visibleToBuyers")}
            </span>
          )}
        </div>
      </div>

      {/* Rejection Banner */}
      {status === "rejected" && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <WarningCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {t("rejectionReasonLabel")}
              </p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                {rejectionReason || t("rejectionReasonDefault")}
              </p>
            </div>
          </div>
          {onResubmit && (
            <button
              type="button"
              onClick={onResubmit}
              className="mt-4 w-full px-4 py-2.5 bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-bold text-sm rounded hover:opacity-90 transition-opacity"
            >
              {t("resubmitDocuments")}
            </button>
          )}
        </div>
      )}

      {/* How It Works */}
      <div>
        <h3 className="text-lg font-bold text-[#171717] dark:text-white mb-4">
          {t("howItWorks")}
        </h3>
        <div>
          {TIMELINE_STEPS.map((step, index) => {
            const state = getStepState(index);
            const isLast = index === TIMELINE_STEPS.length - 1;
            return (
              <div key={step.titleKey} className="relative flex gap-4">
                {/* Vertical connector line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-[32px] bottom-0 w-0.5 bg-gray-200 dark:bg-white/10" />
                )}
                {/* Step circle */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    state === "completed"
                      ? "bg-[#87E64B]/20"
                      : state === "pending"
                        ? "bg-yellow-100 dark:bg-yellow-500/10"
                        : "bg-red-100 dark:bg-red-500/10"
                  }`}
                >
                  {state === "completed" && (
                    <Check className="w-4 h-4 text-[#171717] dark:text-white" />
                  )}
                  {state === "pending" && (
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  )}
                  {state === "rejected" && (
                    <Xmark className="w-4 h-4 text-red-500 dark:text-red-400" />
                  )}
                </div>
                {/* Step text */}
                <div className={isLast ? "" : "pb-6"}>
                  <p className="font-medium text-[#171717] dark:text-white leading-8">
                    {t(step.titleKey)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(step.descriptionKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy footer */}
      <div className="flex items-center gap-2 pt-2">
        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <p className="text-xs text-gray-400">{t("privacyNotice")}</p>
      </div>
    </div>
  );
}
