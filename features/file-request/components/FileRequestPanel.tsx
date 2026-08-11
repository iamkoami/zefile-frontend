"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import {
  fileRequestApi,
  CreateFileRequestDto,
} from "@/services/file-request-api";
import { paymentApi, PaymentMethodInfo } from "@/services/payment-api";
import { authApi } from "@/services/auth-api";
import { toast } from "@/components/shared/Toast";
import { useCurrentCurrency } from "@/stores/currency-store";
import { platformApi } from "@/services/platform-api";
import { convertCurrency, formatCurrencyAmount } from "@/lib/currency";
import { safePaymentRedirect } from "@/utils/security";
import { PhoneNumberInput } from "@/features/payment/components";
import usePaymentStatus from "@/hooks/usePaymentStatus";
import type { CountryCode } from "libphonenumber-js/min";
import {
  Clock,
  CheckCircle,
  XmarkCircle,
  WarningCircle,
  NavArrowDown,
  NavArrowLeft,
  SmartphoneDevice,
  CreditCard,
  Globe,
  Lock,
} from "iconoir-react";
import Image from "next/image";
import Flag from "react-flagpack";

interface FileRequestPanelProps {
  isAuthenticated: boolean;
  isAuthChecked: boolean;
  userTier: string;
  onStepChange?: (step: "info" | "checkout") => void;
}

/** Countries matching the currency switcher (Paystack + StartButton + International) */
const SUPPORTED_COUNTRIES: {
  code: string;
  name: string;
  flagCode?: string;
  phoneCode?: CountryCode;
}[] = [
  { code: "CI", name: "Cote d'Ivoire", flagCode: "CI", phoneCode: "CI" },
  { code: "NG", name: "Nigeria", flagCode: "NG", phoneCode: "NG" },
  { code: "GH", name: "Ghana", flagCode: "GH", phoneCode: "GH" },
  { code: "KE", name: "Kenya", flagCode: "KE", phoneCode: "KE" },
  { code: "TG", name: "Togo", flagCode: "TG", phoneCode: "TG" },
  { code: "BJ", name: "Benin", flagCode: "BJ", phoneCode: "BJ" },
  { code: "DEFAULT", name: "International (USD)" },
];

const FileRequestPanel: React.FC<FileRequestPanelProps> = ({
  isAuthenticated,
  isAuthChecked,
  userTier,
  onStepChange,
}) => {
  const t = useTranslations("fileRequests");

  if (!isAuthChecked) return null;
  if (!isAuthenticated) return <NotLoggedInState t={t} />;
  if (userTier === "free") return <FreeTierState t={t} />;
  return <RequestForm t={t} onStepChange={onStepChange} />;
};

function NotLoggedInState({ t }: { t: ReturnType<typeof useTranslations> }) {
  const openAuth = (mode: "login" | "signup") => {
    window.dispatchEvent(
      new CustomEvent("open-auth-panel", { detail: { mode } }),
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <h2 className="text-xl font-bold text-[#171717] dark:text-white mb-2">
        {t("notLoggedInTitle")}
      </h2>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8">
        {t("notLoggedInDesc")}
      </p>
      <button
        onClick={() => openAuth("login")}
        className="w-full bg-[#5E53E0] text-white py-3 rounded font-bold hover:bg-[#4e45c8] transition-colors mb-3"
      >
        {t("loginCta")}
      </button>
      <button
        onClick={() => openAuth("signup")}
        className="text-[#5E53E0] font-bold text-sm hover:underline"
      >
        {t("signUpLink")}
      </button>
    </div>
  );
}

function FreeTierState({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { openDrawer } = useDrawerStore();

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <h2 className="text-xl font-bold text-[#171717] dark:text-white mb-2">
        {t("freeTierTitle")}
      </h2>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8">
        {t("freeTierDesc")}
      </p>
      <button
        onClick={() => openDrawer("subscriptions")}
        className="w-full bg-[#5E53E0] text-white py-3 rounded font-bold hover:bg-[#4e45c8] transition-colors"
      >
        {t("upgradeToStarter")}
      </button>
    </div>
  );
}

function RequestForm({ t, onStepChange }: { t: ReturnType<typeof useTranslations>; onStepChange?: (step: "info" | "checkout") => void }) {
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const { currency: globalCurrency } = useCurrentCurrency();
  const [currency, setCurrency] = useState(globalCurrency || "XOF");
  const [creativeEmail, setCreativeEmail] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [minimumPriceNGN, setMinimumPriceNGN] = useState<number>(300);
  const [paymentsDisabled, setPaymentsDisabled] = useState(false);
  const [success, setSuccess] = useState<{
    email: string;
    shortCode: string;
  } | null>(null);

  // Country & payment method state
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem("zefile_detected_country")
        : null;
    return cached && SUPPORTED_COUNTRIES.some((c) => c.code === cached)
      ? cached
      : "CI";
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodInfo | null>(null);
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set());

  // Phone input state (for mobile money)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<CountryCode>("CI");

  // Polling state for mobile money
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [pollingFileRequest, setPollingFileRequest] = useState<{
    email: string;
    shortCode: string;
  } | null>(null);

  const {
    pollingStatus,
    startPolling,
    reset: resetPolling,
  } = usePaymentStatus({
    interval: 3000,
    timeout: 120000,
    onSuccess: () => {
      if (pollingFileRequest) {
        setSuccess(pollingFileRequest);
        setPaymentReference(null);
        setPollingFileRequest(null);
        resetForm();
      }
    },
    onFailed: () => {
      toast.error(t("paymentFailedRetry"));
      setPaymentReference(null);
      setPollingFileRequest(null);
    },
    onTimeout: () => {
      if (pollingFileRequest) {
        setSuccess(pollingFileRequest);
        setPaymentReference(null);
        setPollingFileRequest(null);
        resetForm();
      }
    },
  });

  // Fetch minimum price and payment status from platform config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [userConfig, publicConfig] = await Promise.all([
          platformApi.getUserConfig(),
          platformApi.getPublicConfig(),
        ]);
        if (userConfig.data?.minimumTransferPriceNGN) {
          setMinimumPriceNGN(userConfig.data.minimumTransferPriceNGN);
        }
        if (publicConfig.data) {
          setPaymentsDisabled(!publicConfig.data.paymentsEnabled);
        }
      } catch {
        // Keep defaults
      }
    };
    fetchConfig();
  }, []);

  // Fetch payment methods when country changes
  useEffect(() => {
    setSelectedMethod(null);

    // International: card only, no API call needed
    if (selectedCountry === "DEFAULT") {
      setPaymentMethods([
        { type: "card", name: "Card", provider: "paystack", icon: "card" },
      ]);
      setLoadingMethods(false);
      return;
    }

    const fetchMethods = async () => {
      setLoadingMethods(true);
      try {
        const response = await paymentApi.getPaymentMethods(selectedCountry);
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
    // Update phone country to match selected country
    const country = SUPPORTED_COUNTRIES.find((c) => c.code === selectedCountry);
    if (country?.phoneCode) {
      setPhoneCountryCode(country.phoneCode);
    }
  }, [selectedCountry]);

  /**
   * The minimum budget, in MAJOR units — the scale the budget box is denominated in, so the
   * comparison is like-for-like (story 144.7, AC2, D3).
   *
   * This used to be compared against a raw typed value the backend read as MINOR units, which
   * enforced a floor one hundredth of the intended one.
   */
  const minimumBudget = useMemo(() => {
    if (currency === "NGN") return minimumPriceNGN;
    return Math.ceil(convertCurrency(minimumPriceNGN, "NGN", currency));
  }, [minimumPriceNGN, currency]);

  // Split methods into mobile money and other types
  const momoMethods = useMemo(
    () => paymentMethods.filter((m) => m.type === "mobile_money"),
    [paymentMethods],
  );
  const cardMethod = useMemo(
    () => paymentMethods.find((m) => m.type === "card"),
    [paymentMethods],
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setBudget("");
    setCreativeEmail("");
    setDeadline("");
    setPhoneNumber("");
    setIsPhoneValid(false);
    setSelectedMethod(null);
  }, []);

  const [formStep, setFormStep] = useState<"info" | "checkout">("info");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const countryDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close country dropdown on outside click
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current?.contains(e.target as Node)) return;
      setCountryDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [countryDropdownOpen]);

  const validateInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = t("titleRequired");
    if (title.length > 255) newErrors.title = t("titleTooLong");
    const budgetNum = Number(budget);
    if (!budget || budgetNum <= 0) newErrors.budget = t("budgetRequired");
    if (budget && isNaN(budgetNum)) newErrors.budget = t("budgetInvalid");
    if (budgetNum > 0 && budgetNum < minimumBudget) {
      newErrors.budget = t("budgetBelowMinimum", {
        amount: formatCurrencyAmount(minimumBudget, currency, locale),
      });
    }
    if (!creativeEmail.trim())
      newErrors.creativeEmail = t("creativeEmailRequired");
    if (creativeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creativeEmail)) {
      newErrors.creativeEmail = t("creativeEmailInvalid");
    }
    if (deadline) {
      const deadlineDate = new Date(deadline + "T23:59:59");
      if (deadlineDate <= new Date()) {
        newErrors.deadline = t("deadlinePast");
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCheckout = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedMethod) {
      newErrors.method = t("selectPaymentMethod");
    }
    if (selectedMethod?.type === "mobile_money" && !isPhoneValid) {
      newErrors.phone = t("phoneRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateInfo()) {
      setFormStep("checkout");
      onStepChange?.("checkout");
    }
  };

  const handleSubmit = async () => {
    if (paymentsDisabled) return;
    if (!validateCheckout() || !selectedMethod) return;
    setIsSubmitting(true);
    try {
      const dto: CreateFileRequestDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        // MAJOR units, as typed. The backend scales it through the same
        // `resolvePriceMinorUnits` the transfer price goes through, so the escrow path and the
        // transfer path cannot drift apart (story 144.7, D3).
        //
        // This used to send the raw typed number as `budgetMinorUnits` — a field whose own name
        // asserted a contract the form did not honour — so a requester typing 5,000 CFA escrowed
        // 50.00 CFA. Do not scale here.
        budgetMajorUnits: Math.round(Number(budget)),
        currency,
        creativeEmail: creativeEmail.trim().toLowerCase(),
        deadline: deadline || undefined,
      };
      const createResponse = await fileRequestApi.createFileRequest(dto);
      if (createResponse.error) {
        const errorMsg =
          typeof createResponse.error.message === "string"
            ? createResponse.error.message
            : Array.isArray(createResponse.error.message)
              ? createResponse.error.message[0]
              : t("genericError");
        toast.error(errorMsg);
        return;
      }

      if (!createResponse.data) return;
      const fileRequest = createResponse.data;

      const user = authApi.getStoredUser();
      const origin = window.location.origin;
      const callbackUrl = origin.startsWith("https://")
        ? `${origin}/file-requests/${fileRequest.shortCode}`
        : undefined;

      const paymentMethod =
        selectedMethod.type === "mobile_money"
          ? ("mobile_money" as const)
          : ("card" as const);

      const payResponse = await fileRequestApi.payFileRequest(fileRequest.id, {
        customerEmail: user?.email || fileRequest.clientEmail,
        paymentMethod,
        ...(paymentMethod === "mobile_money" && {
          mobileMoneyProvider: selectedMethod.provider,
          phoneNumber,
        }),
        countryCode: selectedCountry,
        ...(callbackUrl && { callbackUrl }),
      });

      if (payResponse.error) {
        toast.error(t("paymentInitFailed"));
        setSuccess({
          email: creativeEmail,
          shortCode: fileRequest.shortCode,
        });
        return;
      }

      const { authorizationUrl, requiresPolling, reference } =
        payResponse.data || {};

      if (requiresPolling && reference) {
        setPollingFileRequest({
          email: creativeEmail,
          shortCode: fileRequest.shortCode,
        });
        setPaymentReference(reference);
        startPolling(reference);
      } else if (authorizationUrl) {
        resetForm();
        try {
          safePaymentRedirect(authorizationUrl);
        } catch {
          toast.error(t("paymentInitFailed"));
          setSuccess({
            email: creativeEmail,
            shortCode: fileRequest.shortCode,
          });
        }
      } else {
        setSuccess({
          email: creativeEmail,
          shortCode: fileRequest.shortCode,
        });
        resetForm();
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPayment = () => {
    setPaymentReference(null);
    setPollingFileRequest(null);
    resetPolling();
  };

  const getProviderIconPath = (icon: string): string => {
    return `/icons/payment/${icon}.svg`;
  };

  // Polling state UI
  if (paymentReference && pollingFileRequest) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        {pollingStatus === "polling" && (
          <>
            <Clock className="w-10 h-10 text-[#5E53E0] animate-pulse mb-4" />
            <h2 className="text-lg font-bold text-[#171717] dark:text-white mb-2">
              {t("checkYourPhone")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {t("waitingForPayment")}
            </p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
              {phoneNumber.replace(/\d(?=\d{4})/g, "*")}
            </p>
          </>
        )}
        {pollingStatus === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-[#87E64B] mb-4" />
            <h2 className="text-lg font-bold text-[#171717] dark:text-white mb-2">
              {t("paymentConfirmed")}
            </h2>
          </>
        )}
        {pollingStatus === "failed" && (
          <>
            <XmarkCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-bold text-[#171717] dark:text-white mb-2">
              {t("paymentFailedRetry")}
            </h2>
            <button
              onClick={handleRetryPayment}
              className="mt-4 w-full bg-[#5E53E0] text-white py-3 rounded font-bold hover:bg-[#4e45c8] transition-colors"
            >
              {t("tryAgain")}
            </button>
          </>
        )}
        {pollingStatus === "timeout" && (
          <>
            <WarningCircle className="w-12 h-12 text-yellow-500 mb-4" />
            <h2 className="text-lg font-bold text-[#171717] dark:text-white mb-2">
              {t("paymentTimeout")}
            </h2>
          </>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <h2 className="text-xl font-bold text-[#171717] dark:text-white mb-2">
          {t("successTitle")}
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6">
          {t("successDesc", { email: success.email })}
        </p>
        <button
          onClick={() => setSuccess(null)}
          className="w-full bg-[#5E53E0] text-white py-3 rounded font-bold hover:bg-[#4e45c8] transition-colors"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  const selectedCountryInfo = SUPPORTED_COUNTRIES.find(
    (c) => c.code === selectedCountry,
  );

  return formStep === "info" ? (
    <div key="request-info" className="animate-slideInLeft">
      <div className="space-y-4 mb-6">
        <div>
          <input
            id="fr-email"
            type="email"
            value={creativeEmail}
            onChange={(e) => {
              setCreativeEmail(e.target.value);
              setErrors((prev) => ({ ...prev, creativeEmail: "" }));
            }}
            placeholder={t("formCreativeEmailPlaceholder")}
            className={`ze-form-input ${errors.creativeEmail ? "border-red-500" : ""}`}
          />
          {errors.creativeEmail && (
            <p className="text-sm text-red-600 mt-1">{errors.creativeEmail}</p>
          )}
        </div>

        <div>
          <input
            id="fr-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: "" }));
            }}
            placeholder={t("formTitlePlaceholder")}
            maxLength={255}
            className={`ze-form-input ${errors.title ? "border-red-500" : ""}`}
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <input
            id="fr-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("formDescriptionPlaceholder")}
            className="ze-form-input"
          />
        </div>

        <div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`ze-form-select h-full ${errors.budget ? "border-red-500" : ""}`}
              >
                <option value="XOF">XOF</option>
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
                <option value="KES">KES</option>
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <input
                id="fr-budget"
                type="text"
                value={budget}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, "");
                  setBudget(numericValue);
                  setErrors((prev) => ({ ...prev, budget: "" }));
                }}
                placeholder={t("budgetMin", {
                  amount: formatCurrencyAmount(minimumBudget, currency, locale),
                })}
                className={`ze-form-input ${errors.budget ? "border-red-500" : ""}`}
                inputMode="numeric"
              />
            </div>
          </div>
          {errors.budget && (
            <p className="text-sm text-red-600 mt-1">{errors.budget}</p>
          )}
        </div>
      </div>

      <div className="ze-upload-actions flex items-center gap-3">
        <button
          onClick={handleContinue}
          className="flex-1 py-3 px-4 bg-[#5E53E0] text-white rounded font-bold hover:bg-[#4e45c8] transition-colors"
        >
          {t("continue")}
        </button>
      </div>
    </div>
  ) : (
    <div key="request-checkout" className="animate-slideInRight">
      <button
        type="button"
        onClick={() => { setFormStep("info"); onStepChange?.("info"); }}
        className="flex items-center gap-1 text-sm text-[#5E53E0] hover:text-[#4a42b3] mb-4 transition-colors"
      >
        <NavArrowLeft className="w-4 h-4" />
        {t("back")}
      </button>

      <div className="space-y-4 mb-6">
        {/* Country Selector */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("paymentCountry")}
          </p>
          <div className="relative" ref={countryDropdownRef}>
            <button
              type="button"
              onClick={() => setCountryDropdownOpen((prev) => !prev)}
              className="ze-form-input w-full flex items-center gap-2 cursor-pointer pr-10"
            >
              {selectedCountryInfo?.flagCode ? (
                <Flag
                  code={selectedCountryInfo.flagCode}
                  size="s"
                  hasBorder={false}
                />
              ) : (
                <Globe className="w-5 h-5 text-gray-500" />
              )}
              <span className="text-sm text-[#171717] dark:text-gray-200">
                {selectedCountryInfo?.name}
              </span>
              <NavArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </button>

            {countryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--border)] rounded shadow-lg z-50 max-h-[180px] overflow-y-auto">
                {SUPPORTED_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(c.code);
                      localStorage.setItem("zefile_detected_country", c.code);
                      setCountryDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] text-left ${
                      c.code === selectedCountry ? "bg-gray-50" : ""
                    }`}
                  >
                    {c.flagCode ? (
                      <Flag code={c.flagCode} size="s" hasBorder={false} />
                    ) : (
                      <Globe className="w-5 h-5 text-gray-500" />
                    )}
                    <span className="text-sm text-[#171717] dark:text-gray-200">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("paymentMethod")}
          </p>

          {loadingMethods ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#5E53E0] rounded-full animate-spin" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
              {t("noPaymentMethods")}
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
                    onClick={() => {
                      setSelectedMethod(method);
                      setErrors((prev) => ({ ...prev, method: "" }));
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                      isSelected
                        ? "border-[#5E53E0] bg-[#5E53E0]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
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
                    <span className="text-xs font-medium text-[#171717] dark:text-gray-200 truncate">
                      {method.name}
                    </span>
                  </button>
                );
              })}

              {/* Card Option */}
              {cardMethod && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod(cardMethod);
                    setErrors((prev) => ({ ...prev, method: "" }));
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded border-2 transition-colors ${
                    selectedMethod?.type === "card"
                      ? "border-[#5E53E0] bg-[#5E53E0]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[oklch(0.28_0_0)] rounded">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                  </div>
                  <span className="text-xs font-medium text-[#171717] dark:text-gray-200 truncate">
                    {cardMethod.name}
                  </span>
                </button>
              )}
            </div>
          )}
          {errors.method && (
            <p className="text-sm text-red-600 mt-1">{errors.method}</p>
          )}
        </div>

        {/* Phone Number (shown when mobile money is selected) */}
        {selectedMethod?.type === "mobile_money" && (
          <div>
            <PhoneNumberInput
              value={phoneNumber}
              onChange={(phone, isValid, country) => {
                setPhoneNumber(phone);
                setIsPhoneValid(isValid);
                setPhoneCountryCode(country);
                setErrors((prev) => ({ ...prev, phone: "" }));
              }}
              defaultCountry={selectedCountryInfo?.phoneCode || "CI"}
              countryCode={selectedCountryInfo?.phoneCode || "CI"}
              hideCountrySelector
              error={errors.phone}
            />
          </div>
        )}
      </div>

      {/* Payment disabled notice */}
      {paymentsDisabled && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded p-4 mb-4 flex items-start gap-3">
          <WarningCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
              {t("paymentsUnavailable")}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              {t("paymentsUnavailableDesc")}
            </p>
          </div>
        </div>
      )}

      <div className="ze-upload-actions flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || paymentsDisabled}
          className="flex-1 py-3 px-4 bg-[#5E53E0] text-white rounded font-bold hover:bg-[#4e45c8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("processingPayment") : t("sendRequest")}
        </button>
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <p>{t("securityGuarantee")}</p>
      </div>
    </div>
  );
}

export default FileRequestPanel;
