"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Flag from "react-flagpack";
import {
  CreditCard,
  Bank,
  SmartphoneDevice,
  Plus,
  Check,
  Trash,
  NavArrowDown,
  WarningTriangle,
} from "iconoir-react";
import {
  payoutMethodsApi,
  PayoutMethodType,
  PayoutMethod,
  Bank as BankInfo,
  SUPPORTED_COUNTRIES,
  MOBILE_PROVIDER_NAMES,
} from "@/services/payout-methods-api";
import LoadingPanel from "@/components/LoadingPanel";

type FormStep =
  | "list"
  | "select-country"
  | "select-type"
  | "bank-details"
  | "mobile-details"
  | "verifying";

/**
 * PayoutMethodsPanel - Manage payout methods (bank accounts, mobile money)
 * Stories 14-2, 14-3: Payout Methods Management
 */
const PayoutMethodsPanel: React.FC = () => {
  const t = useTranslations("payoutMethods");

  // State
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form state
  const [formStep, setFormStep] = useState<FormStep>("list");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedType, setSelectedType] = useState<PayoutMethodType | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bank transfer form
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState("");

  // Mobile money form
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Load payout methods
  useEffect(() => {
    loadPayoutMethods();
  }, []);

  const loadPayoutMethods = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await payoutMethodsApi.getPayoutMethods();
      if (response.data) {
        setPayoutMethods(response.data);
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  // Load banks for country
  const loadBanks = async (country: string) => {
    setIsLoadingBanks(true);
    setBanks([]);
    try {
      const countryInfo = SUPPORTED_COUNTRIES.find((c) => c.code === country);
      const response = await payoutMethodsApi.listBanks(
        country,
        countryInfo?.currency,
      );
      if (response.data) {
        setBanks(response.data);
      } else if (response.error) {
        setFormError(response.error.message || t("loadBanksError"));
      }
    } catch (err) {
      console.error("Failed to load banks:", err);
      setFormError(t("loadBanksError"));
    } finally {
      setIsLoadingBanks(false);
    }
  };

  // Handle country selection
  const handleCountrySelect = async (countryCode: string) => {
    setSelectedCountry(countryCode);
    const countryInfo = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);

    if (countryInfo) {
      // If only one option is available, skip to that step
      if (
        countryInfo.supportsBankTransfer &&
        !countryInfo.supportsMobileMoney
      ) {
        setSelectedType(PayoutMethodType.BANK_TRANSFER);
        await loadBanks(countryCode);
        setFormStep("bank-details");
      } else if (
        !countryInfo.supportsBankTransfer &&
        countryInfo.supportsMobileMoney
      ) {
        setSelectedType(PayoutMethodType.MOBILE_MONEY);
        setFormStep("mobile-details");
      } else {
        setFormStep("select-type");
      }
    }
  };

  // Handle type selection
  const handleTypeSelect = async (type: PayoutMethodType) => {
    setSelectedType(type);

    if (type === PayoutMethodType.BANK_TRANSFER) {
      await loadBanks(selectedCountry);
      setFormStep("bank-details");
    } else {
      setFormStep("mobile-details");
    }
  };

  // Verify bank account
  const handleVerifyAccount = async () => {
    if (!selectedBank || !accountNumber) return;

    setIsVerifying(true);
    setFormError(null);

    try {
      const response = await payoutMethodsApi.verifyAccount({
        accountNumber,
        bankCode: selectedBank,
      });

      if (response.data) {
        setAccountName(response.data.accountName);
      } else if (response.error) {
        setFormError(response.error.message);
      }
    } catch (err) {
      setFormError(t("verifyError"));
    } finally {
      setIsVerifying(false);
    }
  };

  // Submit payout method
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const countryInfo = SUPPORTED_COUNTRIES.find(
        (c) => c.code === selectedCountry,
      );
      if (!countryInfo) return;

      const data: any = {
        type: selectedType,
        country: selectedCountry,
        currency: countryInfo.currency,
        isDefault: payoutMethods.length === 0, // First method is default
      };

      if (selectedType === PayoutMethodType.BANK_TRANSFER) {
        data.bankCode = selectedBank;
        data.accountNumber = accountNumber;
      } else {
        data.provider = selectedProvider;
        data.phoneNumber = phoneNumber;
      }

      const response = await payoutMethodsApi.createPayoutMethod(data);

      if (response.data) {
        setPayoutMethods([...payoutMethods, response.data]);
        resetForm();
      } else if (response.error) {
        setFormError(response.error.message);
      }
    } catch (err) {
      setFormError(t("submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set as default
  const handleSetDefault = async (id: string) => {
    try {
      const response = await payoutMethodsApi.setDefaultPayoutMethod(id);
      if (response.data) {
        setPayoutMethods(
          payoutMethods.map((pm) => ({
            ...pm,
            isDefault: pm.id === id,
          })),
        );
      }
    } catch (err) {
      console.error("Failed to set default:", err);
    }
  };

  // Delete payout method
  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    setIsDeleting(id);
    try {
      const response = await payoutMethodsApi.deletePayoutMethod(id);
      if (!response.error) {
        setPayoutMethods(payoutMethods.filter((pm) => pm.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsDeleting(null);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormStep("list");
    setSelectedCountry("");
    setSelectedType(null);
    setSelectedBank("");
    setAccountNumber("");
    setAccountName(null);
    setSelectedProvider("");
    setPhoneNumber("");
    setFormError(null);
    setBanks([]);
    setIsLoadingBanks(false);
  };

  // Get country info
  const getCountryInfo = (code: string) => {
    return SUPPORTED_COUNTRIES.find((c) => c.code === code);
  };

  if (isLoading) {
    return <LoadingPanel className="py-12" />;
  }

  // List view
  if (formStep === "list") {
    return (
      <div>
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#171717] mb-1">
            {t("title")}
          </h3>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={() => setFormStep("select-country")}
          className="flex items-center gap-2 px-4 py-2 mb-6 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#171717] hover:text-[#171717] transition-colors w-full justify-center"
        >
          <Plus className="w-4 h-4" />
          {t("addMethod")}
        </button>

        {/* Payout methods list */}
        {payoutMethods.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t("noMethods")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("noMethodsHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payoutMethods.map((method) => (
              <div
                key={method.id}
                className={`border rounded-lg p-4 ${
                  method.isDefault
                    ? "border-[#87E64B] bg-[#87E64B]/5"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {method.type === PayoutMethodType.BANK_TRANSFER ? (
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Bank className="w-5 h-5 text-gray-600" />
                      </div>
                    ) : (
                      <ProviderIcon
                        provider={method.provider || ""}
                        size="lg"
                      />
                    )}
                    <div>
                      <p className="font-medium text-[#171717]">
                        {method.type === PayoutMethodType.BANK_TRANSFER
                          ? method.bankName
                          : MOBILE_PROVIDER_NAMES[
                              method.provider?.toLowerCase() || ""
                            ] || method.provider}
                      </p>
                      <p className="text-sm text-gray-500">
                        {method.type === PayoutMethodType.BANK_TRANSFER
                          ? `${method.accountName} • ${method.accountNumber}`
                          : method.phoneNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {getCountryInfo(method.country)?.name} •{" "}
                        {method.currency}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {method.isDefault ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-[#87E64B] text-[#171717] text-xs font-medium rounded">
                        <Check className="w-3 h-3" />
                        {t("default")}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="px-2 py-1 text-xs text-[#171717] underline font-medium"
                      >
                        {t("setDefault")}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(method.id)}
                      disabled={isDeleting === method.id}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Select country step
  if (formStep === "select-country") {
    return (
      <div>
        <button
          onClick={resetForm}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t("back")}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-1">
          {t("selectCountry")}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{t("selectCountryHint")}</p>

        <div className="grid grid-cols-2 gap-3">
          {SUPPORTED_COUNTRIES.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountrySelect(country.code)}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-[#5E53E0] hover:bg-[#5E53E0]/5 transition-colors text-left"
            >
              <Flag code={country.code} size="m" hasBorder={false} />
              <div className="flex-1">
                <p className="font-medium text-[#171717]">{country.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {country.currency}
                  </span>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1">
                    {country.supportsBankTransfer && (
                      <Bank className="w-3.5 h-3.5 text-gray-400" />
                    )}
                    {country.supportsMobileMoney && (
                      <SmartphoneDevice className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Select type step
  if (formStep === "select-type") {
    const countryInfo = getCountryInfo(selectedCountry);

    return (
      <div>
        <button
          onClick={() => setFormStep("select-country")}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t("back")}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-1">
          {t("selectType")}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{t("selectTypeHint")}</p>

        <div className="space-y-3">
          {countryInfo?.supportsBankTransfer && (
            <button
              onClick={() => handleTypeSelect(PayoutMethodType.BANK_TRANSFER)}
              className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#5E53E0] hover:bg-[#5E53E0]/5 transition-colors text-left"
            >
              <div className="p-3 bg-gray-100 rounded-lg">
                <Bank className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-[#171717]">
                  {t("bankTransfer")}
                </p>
                <p className="text-sm text-gray-500">{t("bankTransferHint")}</p>
              </div>
            </button>
          )}

          {countryInfo?.supportsMobileMoney && (
            <button
              onClick={() => handleTypeSelect(PayoutMethodType.MOBILE_MONEY)}
              className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-[#5E53E0] hover:bg-[#5E53E0]/5 transition-colors text-left"
            >
              <div className="p-3 bg-gray-100 rounded-lg">
                <SmartphoneDevice className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-[#171717]">{t("mobileMoney")}</p>
                <p className="text-sm text-gray-500">{t("mobileMoneyHint")}</p>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Bank details step
  if (formStep === "bank-details") {
    const selectedBankInfo = banks.find((b) => b.code === selectedBank);

    return (
      <div>
        <button
          onClick={() => {
            setFormStep(
              getCountryInfo(selectedCountry)?.supportsMobileMoney
                ? "select-type"
                : "select-country",
            );
            setSelectedBank("");
            setAccountNumber("");
            setAccountName(null);
          }}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t("back")}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-1">
          {t("bankDetails")}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{t("bankDetailsHint")}</p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
            <WarningTriangle className="w-4 h-4" />
            {formError}
          </div>
        )}

        <div className="space-y-4">
          {/* Bank select with search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("bank")}
            </label>
            <div className="relative">
              <button
                onClick={() => {
                  setIsBankDropdownOpen(!isBankDropdownOpen);
                  if (!isBankDropdownOpen) {
                    setBankSearchQuery("");
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors"
              >
                <span
                  className={selectedBank ? "text-[#171717]" : "text-gray-400"}
                >
                  {selectedBankInfo?.name || t("selectBank")}
                </span>
                <NavArrowDown
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isBankDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isBankDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10">
                  {/* Search input */}
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={bankSearchQuery}
                      onChange={(e) => setBankSearchQuery(e.target.value)}
                      placeholder={t("searchBank")}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#171717]"
                      autoFocus
                    />
                  </div>
                  {/* Banks list */}
                  <div className="max-h-48 overflow-y-auto">
                    {isLoadingBanks ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        {t("loadingBanks")}
                      </div>
                    ) : banks.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        {t("noBanksAvailable")}
                      </div>
                    ) : (
                      (() => {
                        const filteredBanks = banks.filter((bank) =>
                          bank.name
                            .toLowerCase()
                            .includes(bankSearchQuery.toLowerCase()),
                        );
                        return filteredBanks.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {t("noMatchingBanks")}
                          </div>
                        ) : (
                          filteredBanks.map((bank) => (
                            <button
                              key={bank.id}
                              onClick={() => {
                                setSelectedBank(bank.code);
                                setIsBankDropdownOpen(false);
                                setAccountName(null);
                                setBankSearchQuery("");
                              }}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                selectedBank === bank.code
                                  ? "bg-[#87E64B]/10 text-[#171717] font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {bank.name}
                            </button>
                          ))
                        );
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("accountNumber")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  setAccountName(null);
                }}
                placeholder={t("accountNumberPlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#171717]"
              />
              <button
                onClick={handleVerifyAccount}
                disabled={!selectedBank || !accountNumber || isVerifying}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {isVerifying ? t("verifying") : t("verify")}
              </button>
            </div>
          </div>

          {/* Verified account name */}
          {accountName && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                <Check className="w-4 h-4 inline mr-1" />
                {t("accountVerified")}: <strong>{accountName}</strong>
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!accountName || isSubmitting}
            className="w-full px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("adding") : t("addMethod")}
          </button>
        </div>
      </div>
    );
  }

  // Mobile money details step
  if (formStep === "mobile-details") {
    const countryInfo = getCountryInfo(selectedCountry);
    const providers = countryInfo?.mobileProviders || [];

    return (
      <div>
        <button
          onClick={() => {
            setFormStep(
              getCountryInfo(selectedCountry)?.supportsBankTransfer
                ? "select-type"
                : "select-country",
            );
            setSelectedProvider("");
            setPhoneNumber("");
          }}
          className="text-sm text-[#171717] underline font-medium mb-4"
        >
          ← {t("back")}
        </button>

        <h3 className="text-lg font-bold text-[#171717] mb-1">
          {t("mobileDetails")}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{t("mobileDetailsHint")}</p>

        {formError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
            <WarningTriangle className="w-4 h-4" />
            {formError}
          </div>
        )}

        <div className="space-y-4">
          {/* Provider select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("provider")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider}
                  onClick={() => setSelectedProvider(provider)}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                    selectedProvider === provider
                      ? "border-[#5E53E0] bg-[#5E53E0]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <ProviderIcon provider={provider} size="md" />
                  <span className="text-sm font-medium text-[#171717]">
                    {MOBILE_PROVIDER_NAMES[provider] || provider}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("phoneNumber")}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t("phoneNumberPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-[#171717]"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedProvider || !phoneNumber || isSubmitting}
            className="w-full px-4 py-3 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t("adding") : t("addMethod")}
          </button>
        </div>
      </div>
    );
  }

  return null;
};


// Provider icon component - uses SVG icons from /public/icons/payment/
const ProviderIcon: React.FC<{
  provider: string;
  size?: "sm" | "md" | "lg";
}> = ({ provider, size = "md" }) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
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
    free: "orange", // Free Money fallback
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

export default PayoutMethodsPanel;
