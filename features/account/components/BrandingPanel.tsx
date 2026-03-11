"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Palette } from "iconoir-react";
import { useDrawerStore } from "@/stores/drawer-store";
import { brandingApi, BrandingProfileDto } from "@/services/branding-api";
import { subscriptionApi } from "@/services/subscription-api";
import LoadingPanel from "@/components/LoadingPanel";
import { toast } from "@/components/shared/Toast";

const LOGO_MAX_SIZE = 1024 * 1024; // 1MB
const FAVICON_MAX_SIZE = 100 * 1024; // 100KB
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp";
const FAVICON_ACCEPT = "image/png,image/x-icon";
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const DEFAULT_COLORS = {
  primary: "#5E53E0",
  background: "#FFFFFF",
  text: "#171717",
  buttonText: "#FFFFFF",
};

/**
 * BrandingPanel - Branding configuration for STARTER+ users
 * Part of AccountPanel sidebar navigation (Epic 57, Story 57.6)
 */
const BrandingPanel: React.FC = () => {
  const t = useTranslations("branding");
  const { setActiveAccountMenu } = useDrawerStore();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // User tier
  const [userTier, setUserTier] = useState<string>("free");

  // Profile data
  const [profile, setProfile] = useState<BrandingProfileDto | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_COLORS.background);
  const [textColor, setTextColor] = useState(DEFAULT_COLORS.text);
  const [buttonTextColor, setButtonTextColor] = useState(DEFAULT_COLORS.buttonText);
  const [showPoweredByZefile, setShowPoweredByZefile] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [subRes, profileRes] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        brandingApi.getProfile(),
      ]);

      const tier = subRes.data?.tier || "free";
      setUserTier(tier);

      if (profileRes.data) {
        const p = profileRes.data;
        setProfile(p);
        setCompanyName(p.companyName || "");
        setPrimaryColor(p.primaryColor || DEFAULT_COLORS.primary);
        setBackgroundColor(p.backgroundColor || DEFAULT_COLORS.background);
        setTextColor(p.textColor || DEFAULT_COLORS.text);
        setButtonTextColor(p.buttonTextColor || DEFAULT_COLORS.buttonText);
        setShowPoweredByZefile(p.showPoweredByZefile);
      }
    } catch {
      // Defaults are fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tier gate: FREE users see upgrade prompt
  if (loading) {
    return <LoadingPanel className="py-12" />;
  }

  if (userTier === "free") {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-[#171717] mb-6">
          {t("title")}
        </h3>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Palette className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
            {t("upgradeCta")}
          </button>
        </div>
      </div>
    );
  }

  const isStarter = userTier === "starter";

  const handleSave = async () => {
    // Normalize partial hex values to defaults before saving
    const safePrimary = HEX_RE.test(primaryColor) ? primaryColor : DEFAULT_COLORS.primary;
    const safeBg = HEX_RE.test(backgroundColor) ? backgroundColor : DEFAULT_COLORS.background;
    const safeText = HEX_RE.test(textColor) ? textColor : DEFAULT_COLORS.text;
    const safeBtn = HEX_RE.test(buttonTextColor) ? buttonTextColor : DEFAULT_COLORS.buttonText;

    setSaving(true);
    try {
      const res = await brandingApi.upsertProfile({
        companyName: companyName || undefined,
        primaryColor: safePrimary,
        backgroundColor: safeBg,
        textColor: safeText,
        buttonTextColor: safeBtn,
        showPoweredByZefile: isStarter ? true : showPoweredByZefile,
      });
      if (res.error) {
        toast.error(res.error.message || t("saveError"));
      } else {
        setProfile(res.data!);
        toast.success(t("saved"));
      }
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > LOGO_MAX_SIZE) {
      toast.error(t("logoTooLarge"));
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error(t("logoInvalidType"));
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await brandingApi.uploadLogo(file);
      if (res.error) {
        toast.error(res.error.message || t("logoUploadError"));
      } else {
        setProfile(res.data!);
        toast.success(t("logoUploaded"));
      }
    } catch {
      toast.error(t("logoUploadError"));
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > FAVICON_MAX_SIZE) {
      toast.error(t("faviconTooLarge"));
      return;
    }
    if (!["image/png", "image/x-icon", "image/vnd.microsoft.icon"].includes(file.type)) {
      toast.error(t("faviconInvalidType"));
      return;
    }

    setUploadingFavicon(true);
    try {
      const res = await brandingApi.uploadFavicon(file);
      if (res.error) {
        toast.error(res.error.message || t("faviconUploadError"));
      } else {
        setProfile(res.data!);
        toast.success(t("faviconUploaded"));
      }
    } catch {
      toast.error(t("faviconUploadError"));
    } finally {
      setUploadingFavicon(false);
      e.target.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const res = await brandingApi.deleteLogo();
      if (res.error) {
        toast.error(res.error.message || t("deleteError"));
      } else {
        setProfile(res.data!);
        toast.success(t("logoDeleted"));
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  const handleDeleteFavicon = async () => {
    try {
      const res = await brandingApi.deleteFavicon();
      if (res.error) {
        toast.error(res.error.message || t("deleteError"));
      } else {
        setProfile(res.data!);
        toast.success(t("faviconDeleted"));
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-bold text-[#171717] mb-6">
        {t("title")}
      </h3>
      <p className="text-sm text-gray-500 mb-8">{t("description")}</p>

      {/* Company Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#171717] mb-2">
          {t("companyNameLabel")}
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder={t("companyNamePlaceholder")}
          maxLength={100}
          className="w-full border rounded px-4 py-3 text-sm text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
        />
      </div>

      {/* Color Pickers */}
      <div className="mb-8">
        <h4 className="text-sm font-medium text-[#171717] mb-4">{t("colorsSection")}</h4>
        <div className="grid grid-cols-2 gap-4">
          <ColorInput
            label={t("primaryColorLabel")}
            value={primaryColor}
            onChange={setPrimaryColor}
            defaultValue={DEFAULT_COLORS.primary}
          />
          <ColorInput
            label={t("backgroundColorLabel")}
            value={backgroundColor}
            onChange={setBackgroundColor}
            defaultValue={DEFAULT_COLORS.background}
          />
          <ColorInput
            label={t("textColorLabel")}
            value={textColor}
            onChange={setTextColor}
            defaultValue={DEFAULT_COLORS.text}
          />
          <ColorInput
            label={t("buttonTextColorLabel")}
            value={buttonTextColor}
            onChange={setButtonTextColor}
            defaultValue={DEFAULT_COLORS.buttonText}
          />
        </div>
      </div>

      {/* Logo Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#171717] mb-2">
          {t("logoLabel")}
        </label>
        <p className="text-xs text-gray-400 mb-2">{t("logoHint")}</p>
        <div className="flex items-center gap-4">
          <label className="flex-1 block border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-[#5E53E0] transition-colors">
            <input
              type="file"
              accept={LOGO_ACCEPT}
              onChange={handleLogoUpload}
              className="sr-only"
              disabled={uploadingLogo}
            />
            {profile?.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt="Logo"
                width={120}
                height={40}
                className="max-h-16 mx-auto object-contain"
                unoptimized
              />
            ) : (
              <p className="text-sm text-gray-400">
                {uploadingLogo ? t("uploading") : t("uploadLogo")}
              </p>
            )}
          </label>
          {profile?.logoUrl && (
            <button
              onClick={handleDeleteLogo}
              className="text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              {t("delete")}
            </button>
          )}
        </div>
      </div>

      {/* Favicon Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[#171717] mb-2">
          {t("faviconLabel")}
        </label>
        <p className="text-xs text-gray-400 mb-2">{t("faviconHint")}</p>
        <div className="flex items-center gap-4">
          <label className="flex-1 block border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-[#5E53E0] transition-colors">
            <input
              type="file"
              accept={FAVICON_ACCEPT}
              onChange={handleFaviconUpload}
              className="sr-only"
              disabled={uploadingFavicon}
            />
            {profile?.faviconUrl ? (
              <Image
                src={profile.faviconUrl}
                alt="Favicon"
                width={32}
                height={32}
                className="w-8 h-8 mx-auto object-contain"
                unoptimized
              />
            ) : (
              <p className="text-sm text-gray-400">
                {uploadingFavicon ? t("uploading") : t("uploadFavicon")}
              </p>
            )}
          </label>
          {profile?.faviconUrl && (
            <button
              onClick={handleDeleteFavicon}
              className="text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              {t("delete")}
            </button>
          )}
        </div>
      </div>

      {/* Powered by ZeFile toggle */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="showPoweredByZefile"
            checked={isStarter ? true : showPoweredByZefile}
            onChange={(e) => setShowPoweredByZefile(e.target.checked)}
            disabled={isStarter}
            className="w-4 h-4 rounded border-gray-300 text-[#5E53E0] focus:ring-[#5E53E0]"
          />
          <label htmlFor="showPoweredByZefile" className="text-sm text-[#171717]">
            {t("showPoweredByZefile")}
          </label>
        </div>
        {isStarter && (
          <p className="text-xs text-gray-400 mt-1 ml-7">{t("poweredByStarterNote")}</p>
        )}
      </div>

      {/* Live Preview */}
      <div className="border rounded-lg overflow-hidden mb-8">
        <div className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50">{t("preview")}</div>
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: backgroundColor || "#FFFFFF" }}
        >
          <div className="flex items-center gap-3">
            {profile?.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt=""
                width={80}
                height={24}
                className="h-6 w-auto object-contain"
                unoptimized
              />
            ) : null}
            <span
              className="font-bold text-sm"
              style={{ color: textColor || "#171717" }}
            >
              {companyName || t("yourCompany")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 text-xs font-bold rounded"
              style={{
                backgroundColor: primaryColor || "#5E53E0",
                color: buttonTextColor || "#FFFFFF",
              }}
            >
              {t("previewButton")}
            </button>
            {(isStarter || showPoweredByZefile) && (
              <span className="text-[10px] text-gray-400">Powered by ZeFile</span>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
};

/** Inline color picker with hex input */
function ColorInput({
  label,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  defaultValue: string;
}) {
  const handleTextChange = (text: string) => {
    // Allow typing partial hex values
    if (text === "" || text === "#") {
      onChange(text || defaultValue);
      return;
    }
    // Auto-add # prefix
    const val = text.startsWith("#") ? text : `#${text}`;
    if (val.length <= 7) {
      onChange(val);
    }
  };

  return (
    <div>
      <span className="block text-xs text-gray-500 mb-1.5">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-gray-200 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={defaultValue}
          className="border rounded px-2.5 py-1.5 w-24 font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export default BrandingPanel;
