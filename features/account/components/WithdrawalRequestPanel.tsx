"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Wallet,
  Check,
  NavArrowDown,
  WarningTriangle,
  Calculator,
  Bank,
} from "iconoir-react";
import {
  withdrawalsApi,
  BalanceResponse,
  FeeCalculationResponse,
} from "@/services/withdrawals-api";
import {
  payoutMethodsApi,
  PayoutMethod,
  PayoutMethodType,
  MOBILE_PROVIDER_NAMES,
} from "@/services/payout-methods-api";
import LoadingPanel from "@/components/LoadingPanel";
import KycVerificationBanner from "@/components/shared/KycVerificationBanner";
import { useDrawerStore } from "@/stores/drawer-store";
import { formatCurrencyFromMinor } from "@/lib/currency";

// Provider icon component - uses SVG icons from /public/icons/payment/
const ProviderIcon: React.FC<{ provider: string; size?: "sm" | "md" }> = ({
  provider,
  size = "sm",
}) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
  };

  // Map provider names to icon filenames
  const iconMap: Record<string, string> = {
    mtn: "mtn",
    orange: "orange",
    wave: "wave",
    mpesa: "mpesa",
    vodafone: "vodafone",
    airtel: "airtel",
    tigo: "tigo",
    moov: "moov",
    free: "orange",
  };

  const iconName = iconMap[provider.toLowerCase()] || "mtn";

  return (
    <img
      src={`/icons/payment/${iconName}.svg`}
      alt={provider}
      className={`${sizeClasses[size]} object-contain`}
    />
  );
};

type Step = "form" | "confirm" | "success";

interface WithdrawalRequestPanelProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

/**
 * WithdrawalRequestPanel - Request a withdrawal from available balance
 * Stories 14-6, 14-7: Withdrawal Request Flow
 */
const WithdrawalRequestPanel: React.FC<WithdrawalRequestPanelProps> = ({
  onClose,
  onSuccess,
}) => {
  const t = useTranslations("withdrawals");
  // Story 137.3: the funds-safe reassurance lives in the payouts namespace that owns it.
  const tPayouts = useTranslations("payouts");
  const { openAccountView } = useDrawerStore();
  const locale = useLocale();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /**
   * Story 137.3 (AC6). Held separately from `error` because a KYC block is not a generic failure:
   * it renders localised copy plus a route into verification, whereas `error` is a plain red
   * string. Keeping them apart means the generic path is untouched for every other 4xx.
   */
  const [kycBlockCode, setKycBlockCode] = useState<
    "PAYOUT_KYC_REQUIRED" | "PAYOUT_KYC_PENDING" | "PAYOUT_KYC_REJECTED" | null
  >(null);
  const [step, setStep] = useState<Step>("form");

  // Data
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);

  // Form
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);

  // Fee calculation
  const [feeCalculation, setFeeCalculation] =
    useState<FeeCalculationResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load balance and payout methods
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [balanceRes, methodsRes] = await Promise.all([
        withdrawalsApi.getBalance(),
        payoutMethodsApi.getPayoutMethods(),
      ]);

      if (balanceRes.data) {
        setBalance(balanceRes.data);
      } else if (balanceRes.error) {
        setError(balanceRes.error.message);
      }

      if (methodsRes.data) {
        setPayoutMethods(methodsRes.data);
        // Auto-select default method
        const defaultMethod = methodsRes.data.find((m) => m.isDefault);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        }
      }
    } catch (err) {
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected method
  const selectedMethod = useMemo(() => {
    return payoutMethods.find((m) => m.id === selectedMethodId);
  }, [payoutMethods, selectedMethodId]);

  // Calculate fee when amount or selected method changes
  useEffect(() => {
    const calculateFee = async () => {
      const amountValue = parseFloat(amount);
      if (!amountValue || amountValue <= 0) {
        setFeeCalculation(null);
        return;
      }

      setIsCalculating(true);
      try {
        const amountMinorUnits = Math.round(amountValue * 100);
        const countryCode = selectedMethod?.country;
        const payoutMethod =
          selectedMethod?.type === PayoutMethodType.BANK_TRANSFER
            ? "bank" as const
            : selectedMethod?.type === PayoutMethodType.MOBILE_MONEY
              ? "mobile_money" as const
              : undefined;
        const response = await withdrawalsApi.calculateFee(
          amountMinorUnits,
          countryCode,
          payoutMethod,
        );
        if (response.data) {
          setFeeCalculation(response.data);
        }
      } catch (err) {
        console.error("Failed to calculate fee:", err);
      } finally {
        setIsCalculating(false);
      }
    };

    const debounce = setTimeout(calculateFee, 500);
    return () => clearTimeout(debounce);
  }, [amount, selectedMethod]);

  // Story 144.12 (review follow-up) reimplemented `formatCurrencyFromMinor` here by hand, because
  // this panel was not a caller of it and the caller-inventory sweep did not reach it. The reason
  // it needed the logic still holds — a bare `toLocaleString` defaults to a MAXIMUM of three
  // fraction digits and a minimum of zero, so a fee of 5151.90 rendered "5,151.9" on the screen a
  // creator confirms a payout from.
  //
  // Story 144.15 — it is now the shared helper rather than a copy of it. The hand-rolled version
  // carried its own symbol map reading XOF as "Fr CFA" (the app says "XOF" everywhere else) and its
  // own locale ternary. Same digits, same rule, one implementation.
  const formatAmount = (
    minorUnits: number,
    currency: string = "XOF",
  ): string => formatCurrencyFromMinor(minorUnits, currency, locale);

  // Validate form
  const isFormValid = useMemo(() => {
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) return false;
    if (!selectedMethodId) return false;
    if (!balance) return false;

    const amountMinorUnits = Math.round(amountValue * 100);
    if (amountMinorUnits > balance.availableMinorUnits) return false;

    return true;
  }, [amount, selectedMethodId, balance]);

  // Handle continue to confirm
  const handleContinue = () => {
    if (!isFormValid || !feeCalculation) return;
    setStep("confirm");
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!feeCalculation) return;

    setIsSubmitting(true);
    setError(null);
    // Cleared alongside `error` so a creator who verifies and retries in the same session does
    // not keep staring at a stale block notice.
    setKycBlockCode(null);

    try {
      const amountMinorUnits = Math.round(parseFloat(amount) * 100);
      const response = await withdrawalsApi.createWithdrawal({
        amountMinorUnits,
        payoutMethodId: selectedMethodId,
      });

      if (response.data) {
        setStep("success");
        onSuccess?.();
      } else if (response.error) {
        // Story 137.3 (AC6): a payout refused on identity verification gets localised copy and a
        // way forward, not the backend's raw English fallback string. Branch on `code` — the API
        // contract is explicit that clients must never branch on `message`.
        const code = response.error.code;
        if (
          code === "PAYOUT_KYC_REQUIRED" ||
          code === "PAYOUT_KYC_PENDING" ||
          code === "PAYOUT_KYC_REJECTED"
        ) {
          setKycBlockCode(code);
          setError(null);
        } else {
          setError(response.error.message);
        }
        setStep("form");
      }
    } catch (err) {
      setError(t("submitError"));
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle withdraw all
  const handleWithdrawAll = () => {
    if (!balance) return;
    const amountValue = balance.availableMinorUnits / 100;
    setAmount(amountValue.toString());
  };

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  // Success step
  if (step === "success") {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-[#87E64B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-[#87E64B]" />
        </div>
        <h3 className="text-xl font-bold text-[#171717] mb-2">
          {t("success")}
        </h3>
        <p className="text-gray-500 mb-6">{t("successMessage")}</p>
        <p className="text-sm text-gray-400 mb-6">{t("processingTime")}</p>
        <button
          onClick={onClose}
          className="px-6 py-2 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
        >
          {t("done")}
        </button>
      </div>
    );
  }

  // Confirm step
  if (step === "confirm") {
    return (
      <div>
        <button
          onClick={() => setStep("form")}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t("back")}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-4">
          {t("confirmTitle")}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
            <WarningTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">{t("amount")}</span>
            <span className="font-medium">
              {formatAmount(feeCalculation?.amount || 0, balance?.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">
              {feeCalculation?.feePercent && feeCalculation.feePercent > 0
                ? t("withdrawalFeePercent", { percent: feeCalculation.feePercent })
                : t("fee")}
            </span>
            <span className="text-gray-700">
              - {formatAmount(feeCalculation?.fee || 0, balance?.currency)}
            </span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">{t("youWillReceive")}</span>
            <span className="font-bold text-[#171717]">
              {formatAmount(feeCalculation?.netAmount || 0, balance?.currency)}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-2">{t("destination")}</p>
          <div className="flex items-center gap-3">
            {selectedMethod?.type === PayoutMethodType.BANK_TRANSFER ? (
              <div className="p-2 bg-white rounded">
                <Bank className="w-5 h-5 text-gray-600" />
              </div>
            ) : (
              <ProviderIcon
                provider={selectedMethod?.provider || ""}
                size="md"
              />
            )}
            <div>
              <p className="font-medium">
                {selectedMethod?.type === PayoutMethodType.BANK_TRANSFER
                  ? selectedMethod?.bankName
                  : MOBILE_PROVIDER_NAMES[
                      selectedMethod?.provider?.toLowerCase() || ""
                    ] || selectedMethod?.provider}
              </p>
              <p className="text-sm text-gray-500">
                {selectedMethod?.type === PayoutMethodType.BANK_TRANSFER
                  ? `${selectedMethod?.accountName} • ${selectedMethod?.accountNumber}`
                  : selectedMethod?.phoneNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("form")}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-bold rounded hover:bg-gray-50 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("processing") : t("confirm")}
          </button>
        </div>
      </div>
    );
  }

  // Form step
  return (
    <div>
      <h3 className="text-lg font-bold text-[#171717] mb-1">
        {t("requestTitle")}
      </h3>
      <p className="text-sm text-gray-500 mb-6">{t("requestSubtitle")}</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
          <WarningTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Payout refused pending identity verification (Story 137.3, AC6).
          Amber rather than red, and it names the one action that unblocks it: the creator has
          done nothing wrong, they crossed an earnings threshold that came with a form. */}
      {kycBlockCode && (
        <KycVerificationBanner
          variant="compact"
          className="mb-4"
          // The code from the 403 is authoritative for this attempt, so it drives the banner
          // rather than a second /kyc/status round trip that could disagree with it.
          payoutBlockCode={kycBlockCode}
          footnote={tPayouts("blockedFundsSafe")}
          onVerify={() => openAccountView("verification")}
        />
      )}

      {/* Balance card */}
      {balance && (
        <div className="bg-gradient-to-br from-[#87E64B]/10 to-[#87E64B]/5 border border-[#87E64B]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-[#87E64B]" />
            <span className="text-sm text-gray-600">
              {t("availableBalance")}
            </span>
          </div>
          <p className="text-2xl font-bold text-[#171717]">
            {balance.availableFormatted}
          </p>
        </div>
      )}

      {/* No payout methods warning */}
      {payoutMethods.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <WarningTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                {t("noPayoutMethods")}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {t("addPayoutMethodFirst")}
              </p>
              {/* Direct action button - closes modal so user sees Methods tab */}
              <button
                onClick={onClose}
                className="mt-3 px-4 py-2 bg-[#5E53E0] text-white text-sm font-bold rounded hover:bg-[#4d44c9] transition-colors"
              >
                {t("addPayoutMethodAction")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Payout method select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("payoutMethod")}
          </label>
          <div className="relative">
            <button
              onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
              disabled={payoutMethods.length === 0}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              {selectedMethod ? (
                <div className="flex items-center gap-2">
                  {selectedMethod.type === PayoutMethodType.BANK_TRANSFER ? (
                    <Bank className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ProviderIcon
                      provider={selectedMethod.provider || ""}
                      size="md"
                    />
                  )}
                  <span className="text-[#171717]">
                    {selectedMethod.type === PayoutMethodType.BANK_TRANSFER
                      ? `${selectedMethod.bankName} • ${selectedMethod.accountNumber}`
                      : `${
                          MOBILE_PROVIDER_NAMES[
                            selectedMethod.provider?.toLowerCase() || ""
                          ] || selectedMethod.provider
                        } • ${selectedMethod.phoneNumber}`}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400">{t("selectPayoutMethod")}</span>
              )}
              <NavArrowDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isMethodDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isMethodDropdownOpen && payoutMethods.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                {payoutMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setSelectedMethodId(method.id);
                      setIsMethodDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                      selectedMethodId === method.id ? "bg-[#87E64B]/10" : ""
                    }`}
                  >
                    {method.type === PayoutMethodType.BANK_TRANSFER ? (
                      <Bank className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ProviderIcon
                        provider={method.provider || ""}
                        size="md"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-[#171717]">
                        {method.type === PayoutMethodType.BANK_TRANSFER
                          ? method.bankName
                          : MOBILE_PROVIDER_NAMES[
                              method.provider?.toLowerCase() || ""
                            ] || method.provider}
                      </p>
                      <p className="text-xs text-gray-500">
                        {method.type === PayoutMethodType.BANK_TRANSFER
                          ? `${method.accountName} • ${method.accountNumber}`
                          : method.phoneNumber}
                      </p>
                    </div>
                    {method.isDefault && (
                      <span className="text-xs text-[#87E64B] font-bold">
                        {t("default")}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("amount")}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 pr-24 border border-gray-300 rounded focus:outline-none focus:border-[#171717]"
            />
            <button
              onClick={handleWithdrawAll}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-[#171717] underline font-medium"
            >
              {t("withdrawAll")}
            </button>
          </div>
          {balance && (
            <p className="text-xs text-gray-400 mt-1">
              {t("maxAmount")}: {balance.availableFormatted}
            </p>
          )}
        </div>

        {/* Fee calculation */}
        {feeCalculation && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calculator className="w-4 h-4" />
              {t("feeBreakdown")}
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {feeCalculation.feePercent > 0
                    ? t("withdrawalFeePercent", { percent: feeCalculation.feePercent })
                    : t("withdrawalFee")}
                </span>
                <span>
                  - {formatAmount(feeCalculation.fee, balance?.currency)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{t("youWillReceive")}</span>
                <span className="text-[#171717]">
                  {formatAmount(feeCalculation.netAmount, balance?.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {isCalculating && (
          <div className="text-sm text-gray-400 animate-pulse">
            {t("calculatingFee")}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleContinue}
          disabled={!isFormValid || !feeCalculation}
          className="w-full px-4 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("continue")}
        </button>
      </div>
    </div>
  );
};

export default WithdrawalRequestPanel;
