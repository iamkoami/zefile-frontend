"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Globe,
  Check,
  Copy,
  Trash,
  WarningCircle,
  Upload,
  RefreshDouble,
} from "iconoir-react";
import {
  customDomainApi,
  CustomDomainDto,
  BrandingConfig,
  DnsInstructions,
  CustomDomainStatus,
} from "@/services/custom-domain-api";
import { subscriptionApi } from "@/services/subscription-api";
import { copyToClipboard } from "@/utils/clipboard";
import LoadingPanel from "@/components/LoadingPanel";
import ConfirmationModal from "@/components/shared/ConfirmationModal";
import { toast } from "@/components/shared/Toast";
import { useDrawerStore } from "@/stores/drawer-store";

type PanelView = "loading" | "tier-gate" | "add-domain" | "manage";

/** Strict hex color regex: #RGB or #RRGGBB */
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Domain format regex for client-side validation */
const DOMAIN_RE = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

/**
 * Status dot color based on domain status
 */
function getStatusColor(status: CustomDomainStatus): string {
  switch (status) {
    case "active":
      return "bg-[#87E64B]";
    case "dns_verified":
    case "provisioning_ssl":
      return "bg-blue-400";
    case "pending_verification":
      return "bg-yellow-400";
    case "ssl_error":
    case "suspended":
    case "removed":
      return "bg-red-400";
    default:
      return "bg-gray-400";
  }
}

/**
 * CustomDomainPanel - Custom domain management in account settings
 * Handles add, verify, brand, and remove domain flows
 */
const CustomDomainPanel: React.FC = () => {
  const t = useTranslations("customDomain");
  const { setActiveAccountMenu } = useDrawerStore();

  const [view, setView] = useState<PanelView>("loading");
  const [domain, setDomain] = useState<CustomDomainDto | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DnsInstructions | null>(null);
  const [userTier, setUserTier] = useState<string>("free");

  // Form states
  const [domainInput, setDomainInput] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Branding states
  const [brandingForm, setBrandingForm] = useState<BrandingConfig>({
    companyName: "",
    primaryColor: "#5E53E0",
    backgroundColor: "#FFFFFF",
    textColor: "#171717",
    buttonTextColor: "#171717",
    showPoweredByZefile: true,
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const loadData = useCallback(async () => {
    setView("loading");
    try {
      // Load tier and domain in parallel
      const [tierResponse, domainResponse] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        customDomainApi.getUserDomain(),
      ]);

      const tier = tierResponse.data?.tier || "free";
      setUserTier(tier);

      if (tier === "free") {
        setView("tier-gate");
        return;
      }

      if (domainResponse.data) {
        setDomain(domainResponse.data);
        if (domainResponse.data.brandingConfig) {
          setBrandingForm(domainResponse.data.brandingConfig);
        }
        setView("manage");
      } else {
        setView("add-domain");
      }
    } catch {
      setView("add-domain");
    }
  }, []);

  // Load domain and tier on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validate domain input on change
  const handleDomainInputChange = (value: string) => {
    setDomainInput(value);
    if (value.trim() && !DOMAIN_RE.test(value.trim())) {
      setDomainError(t("invalidDomainFormat"));
    } else {
      setDomainError(null);
    }
  };

  // Add domain
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = domainInput.trim().toLowerCase();
    if (!trimmed || isSubmitting) return;

    // Client-side validation
    if (!DOMAIN_RE.test(trimmed)) {
      setDomainError(t("invalidDomainFormat"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await customDomainApi.addDomain(trimmed);
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      if (response.data) {
        setDomain(response.data);
        setDnsInstructions(response.data.dnsInstructions);
        setView("manage");
        toast.success(t("domainAdded"));
      }
    } catch {
      toast.error(t("addDomainError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify domain
  const handleVerify = async () => {
    if (!domain || isVerifying) return;

    setIsVerifying(true);
    try {
      const response = await customDomainApi.verifyDomain(domain.id);
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      if (response.data) {
        setDomain((prev) => prev ? { ...prev, status: response.data!.status } : prev);
        if (response.data.success) {
          toast.success(t("verificationSuccess"));
        } else {
          toast.error(response.data.message || t("verificationFailed"));
        }
      }
    } catch {
      toast.error(t("verificationError"));
    } finally {
      setIsVerifying(false);
    }
  };

  // Refresh status (for SSL polling)
  const handleRefreshStatus = async () => {
    if (!domain) return;
    try {
      const response = await customDomainApi.getDomainStatus(domain.id);
      if (response.data) {
        setDomain((prev) => prev ? {
          ...prev,
          status: response.data!.status,
          sslStatus: response.data!.sslStatus,
        } : prev);
      }
    } catch {
      // Silent refresh
    }
  };

  // Save branding
  const handleSaveBranding = async () => {
    if (!domain || isSavingBranding) return;

    setIsSavingBranding(true);
    try {
      const response = await customDomainApi.updateBranding(domain.id, brandingForm);
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      if (response.data) {
        setDomain(response.data);
        toast.success(t("brandingSaved"));
      }
    } catch {
      toast.error(t("brandingSaveError"));
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !domain) return;

    // Validate size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error(t("logoTooLarge"));
      return;
    }

    // Validate type (no SVG — XSS risk)
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error(t("logoInvalidType"));
      return;
    }

    try {
      const response = await customDomainApi.uploadLogo(domain.id, file);
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      toast.success(t("logoUploaded"));
      // Reload domain to get updated logoS3Key
      await loadData();
    } catch {
      toast.error(t("logoUploadError"));
    }
  };

  // Upload favicon
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !domain) return;

    // Validate size (max 100KB)
    if (file.size > 100 * 1024) {
      toast.error(t("faviconTooLarge"));
      return;
    }

    // Validate type
    if (!["image/png", "image/x-icon", "image/vnd.microsoft.icon"].includes(file.type)) {
      toast.error(t("faviconInvalidType"));
      return;
    }

    try {
      const response = await customDomainApi.uploadFavicon(domain.id, file);
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      toast.success(t("faviconUploaded"));
      await loadData();
    } catch {
      toast.error(t("faviconUploadError"));
    }
  };

  // Remove domain
  const handleRemoveDomain = async () => {
    if (!domain || isRemoving) return;

    setIsRemoving(true);
    try {
      const response = await customDomainApi.removeDomain(domain.id);
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      setDomain(null);
      setDnsInstructions(null);
      setDomainInput("");
      setBrandingForm({
        companyName: "",
        primaryColor: "#5E53E0",
        backgroundColor: "#FFFFFF",
        textColor: "#171717",
        buttonTextColor: "#171717",
        showPoweredByZefile: true,
      });
      setView("add-domain");
      toast.success(t("domainRemoved"));
    } catch {
      toast.error(t("domainRemoveError"));
    } finally {
      setIsRemoving(false);
      setShowRemoveModal(false);
    }
  };

  // Loading state
  if (view === "loading") {
    return <LoadingPanel className="py-12" />;
  }

  // Tier gate for FREE users
  if (view === "tier-gate") {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-semibold text-[#171717] mb-6">
          {t("title")}
        </h3>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#171717] mb-2">
            {t("upgradeTitle")}
          </h4>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            {t("upgradeDescription")}
          </p>
          <button
            onClick={() => setActiveAccountMenu("subscription")}
            className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
          >
            {t("viewPlans")}
          </button>
        </div>
      </div>
    );
  }

  // Add domain form
  if (view === "add-domain") {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-semibold text-[#171717] mb-6">
          {t("title")}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{t("addDescription")}</p>

        <form onSubmit={handleAddDomain} className="max-w-lg">
          <label className="block text-sm font-medium text-[#171717] mb-2">
            {t("domainLabel")}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={domainInput}
              onChange={(e) => handleDomainInputChange(e.target.value)}
              placeholder="files.yourdomain.com"
              pattern="^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$"
              className={`flex-1 px-4 py-3 border rounded text-sm text-[#171717] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent ${
                domainError ? "border-red-300" : "border-gray-200"
              }`}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !domainInput.trim() || !!domainError}
              className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSubmitting ? t("adding") : t("addDomain")}
            </button>
          </div>
          {domainError && (
            <p className="text-xs text-red-500 mt-1">{domainError}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">{t("domainHint")}</p>
        </form>
      </div>
    );
  }

  // Manage domain view (verify, brand, remove)
  return (
    <div className="mb-10">
      <h3 className="text-2xl font-semibold text-[#171717] mb-6">
        {t("title")}
      </h3>

      {/* Remove domain confirmation */}
      {showRemoveModal && (
        <ConfirmationModal
          isOpen={showRemoveModal}
          type="delete"
          title={t("removeTitle")}
          message={t("removeMessage", { domain: domain?.domain ?? "" })}
          confirmLabel={t("removeConfirm")}
          cancelLabel={t("removeCancel")}
          onConfirm={handleRemoveDomain}
          onCancel={() => setShowRemoveModal(false)}
          isLoading={isRemoving}
        />
      )}

      {/* Domain status card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-[#5E53E0]" />
            <span className="text-sm font-bold text-[#171717]">{domain?.domain}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(domain?.status || "pending_verification")}`} />
            <span className="text-xs text-gray-500 capitalize">
              {t(`status.${domain?.status || "pending_verification"}`)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshStatus}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t("refreshStatus")}
            >
              <RefreshDouble className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowRemoveModal(true)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              aria-label={t("removeDomain")}
            >
              <Trash className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DNS Instructions (show when pending verification) */}
        {(domain?.status === "pending_verification" || dnsInstructions) && (
          <DnsInstructionsSection
            domain={domain?.domain || ""}
            token={domain?.verificationToken || ""}
            instructions={dnsInstructions}
          />
        )}

        {/* Verify button (when pending) */}
        {domain?.status === "pending_verification" && (
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="mt-4 w-full px-6 py-3 bg-[#5E53E0] text-white font-medium rounded hover:bg-[#4a42b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? t("verifying") : t("verifyDomain")}
          </button>
        )}

        {/* SSL provisioning status */}
        {domain?.status === "provisioning_ssl" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded">
            <RefreshDouble className="w-4 h-4 animate-spin" />
            {t("sslProvisioning")}
          </div>
        )}

        {/* SSL error */}
        {domain?.status === "ssl_error" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
            <WarningCircle className="w-4 h-4" />
            {t("sslError")}
          </div>
        )}

        {/* Suspended notice */}
        {domain?.status === "suspended" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
            <WarningCircle className="w-4 h-4" />
            {t("domainSuspended")}
          </div>
        )}
      </div>

      {/* Branding editor (only when active) */}
      {domain?.status === "active" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-bold text-[#171717] mb-4">{t("brandingTitle")}</h4>

          <div className="space-y-4">
            {/* Company name */}
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                {t("companyName")}
              </label>
              <input
                type="text"
                value={brandingForm.companyName}
                onChange={(e) => setBrandingForm((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder={t("companyNamePlaceholder")}
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#5E53E0] focus:border-transparent"
              />
            </div>

            {/* Color pickers row */}
            <div className="grid grid-cols-2 gap-4">
              <ColorPicker
                label={t("primaryColor")}
                value={brandingForm.primaryColor}
                onChange={(v) => setBrandingForm((prev) => ({ ...prev, primaryColor: v }))}
              />
              <ColorPicker
                label={t("backgroundColor")}
                value={brandingForm.backgroundColor || "#FFFFFF"}
                onChange={(v) => setBrandingForm((prev) => ({ ...prev, backgroundColor: v }))}
              />
              <ColorPicker
                label={t("textColor")}
                value={brandingForm.textColor || "#171717"}
                onChange={(v) => setBrandingForm((prev) => ({ ...prev, textColor: v }))}
              />
              <ColorPicker
                label={t("buttonTextColor")}
                value={brandingForm.buttonTextColor || "#171717"}
                onChange={(v) => setBrandingForm((prev) => ({ ...prev, buttonTextColor: v }))}
              />
            </div>

            {/* Powered by ZeFile toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm font-medium text-[#171717]">
                  {t("poweredByZefile")}
                </span>
                {userTier === "starter" && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({t("requiredForStarter")})
                  </span>
                )}
              </div>
              <button
                role="switch"
                aria-checked={brandingForm.showPoweredByZefile}
                aria-label={t("poweredByZefile")}
                onClick={() => {
                  if (userTier === "starter") return; // Forced on for STARTER
                  setBrandingForm((prev) => ({
                    ...prev,
                    showPoweredByZefile: !prev.showPoweredByZefile,
                  }));
                }}
                disabled={userTier === "starter"}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  brandingForm.showPoweredByZefile ? "bg-[#87E64B]" : "bg-gray-300"
                } ${userTier === "starter" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    brandingForm.showPoweredByZefile ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            {/* Save branding button */}
            <button
              onClick={handleSaveBranding}
              disabled={isSavingBranding || !brandingForm.companyName.trim()}
              className="w-full px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingBranding ? t("saving") : t("saveBranding")}
            </button>
          </div>
        </div>
      )}

      {/* Logo & Favicon uploads (only when active) */}
      {domain?.status === "active" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-bold text-[#171717] mb-4">{t("assetsTitle")}</h4>

          <div className="grid grid-cols-2 gap-6">
            {/* Logo upload */}
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-2">
                {t("logo")}
              </label>
              <label className="block border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-[#5E53E0] transition-colors cursor-pointer relative">
                {domain.logoS3Key ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-6 h-6 text-[#87E64B]" />
                    <span className="text-xs text-gray-500">{t("logoUploaded")}</span>
                  </div>
                ) : (
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                <p className="text-xs text-gray-400 mt-1">{t("logoHint")}</p>
              </label>
            </div>

            {/* Favicon upload */}
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-2">
                {t("favicon")}
              </label>
              <label className="block border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-[#5E53E0] transition-colors cursor-pointer relative">
                {domain.faviconS3Key ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-6 h-6 text-[#87E64B]" />
                    <span className="text-xs text-gray-500">{t("faviconUploaded")}</span>
                  </div>
                ) : (
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                )}
                <input
                  type="file"
                  accept="image/png,image/x-icon"
                  onChange={handleFaviconUpload}
                  className="sr-only"
                />
                <p className="text-xs text-gray-400 mt-1">{t("faviconHint")}</p>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * DNS Instructions section with copy buttons
 */
function DnsInstructionsSection({
  domain,
  token,
  instructions,
}: {
  domain: string;
  token: string;
  instructions: DnsInstructions | null;
}) {
  const t = useTranslations("customDomain");

  const cnameHost = instructions?.cnameHost || domain;
  const cnameTarget = instructions?.cnameTarget || "custom.zefile.io";
  const txtHost = instructions?.txtHost || `_zefile-verify.${domain}`;
  const txtValue = instructions?.txtValue || `zefile-verify=${token}`;

  return (
    <div className="bg-gray-50 rounded p-4 space-y-3">
      <p className="text-sm font-medium text-[#171717] mb-2">{t("dnsTitle")}</p>

      {/* CNAME record */}
      <DnsRecord
        type="CNAME"
        host={cnameHost}
        value={cnameTarget}
        hostLabel={t("dnsHost")}
        valueLabel={t("dnsValue")}
      />

      {/* TXT record */}
      <DnsRecord
        type="TXT"
        host={txtHost}
        value={txtValue}
        hostLabel={t("dnsHost")}
        valueLabel={t("dnsValue")}
      />

      <p className="text-xs text-gray-400 mt-2">{t("dnsNote")}</p>
    </div>
  );
}

/**
 * Individual DNS record with copy button
 */
function DnsRecord({
  type,
  host,
  value,
  hostLabel,
  valueLabel,
}: {
  type: string;
  host: string;
  value: string;
  hostLabel: string;
  valueLabel: string;
}) {
  const t = useTranslations("customDomain");
  const [copied, setCopied] = useState<"host" | "value" | null>(null);

  const handleCopy = async (text: string, field: "host" | "value") => {
    const success = await copyToClipboard(text, { showToast: false });
    if (success) {
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="bg-white rounded p-3 border border-gray-100">
      <span className="text-xs font-bold text-[#5E53E0] uppercase">{type}</span>
      <div className="flex items-center justify-between mt-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{hostLabel}</p>
          <p className="text-sm text-[#171717] font-mono truncate">{host}</p>
        </div>
        <button
          onClick={() => handleCopy(host, "host")}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
          aria-label={t("copyHost")}
        >
          {copied === "host" ? <Check className="w-3.5 h-3.5 text-[#87E64B]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{valueLabel}</p>
          <p className="text-sm text-[#171717] font-mono truncate">{value}</p>
        </div>
        <button
          onClick={() => handleCopy(value, "value")}
          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
          aria-label={t("copyValue")}
        >
          {copied === "value" ? <Check className="w-3.5 h-3.5 text-[#87E64B]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

/**
 * Color picker component with hex validation
 */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [textValue, setTextValue] = useState(value);

  // Sync from external value changes
  useEffect(() => {
    setTextValue(value);
  }, [value]);

  const handleTextChange = (input: string) => {
    // Always update display text
    setTextValue(input);
    // Only propagate valid hex colors
    if (HEX_COLOR_RE.test(input)) {
      onChange(input);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_COLOR_RE.test(value) ? value : "#000000"}
          onChange={(e) => {
            onChange(e.target.value);
            setTextValue(e.target.value);
          }}
          className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={() => {
            // On blur, revert to last valid value if current is invalid
            if (!HEX_COLOR_RE.test(textValue)) {
              setTextValue(value);
            }
          }}
          className={`flex-1 px-3 py-1.5 border rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#5E53E0] ${
            HEX_COLOR_RE.test(textValue) ? "border-gray-200" : "border-red-300"
          }`}
          maxLength={7}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default CustomDomainPanel;
