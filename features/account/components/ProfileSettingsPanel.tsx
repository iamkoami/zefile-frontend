"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Copy,
  NavArrowRight,
  OpenNewWindow,
  ProfileCircle,
  WarningCircle,
} from "iconoir-react";
import { useDrawerStore } from "@/stores/drawer-store";
import {
  creatorsApi,
  OwnProfileDto,
  SocialLink,
} from "@/services/creators-api";
import { usersApi } from "@/services/users-api";
import { subscriptionApi } from "@/services/subscription-api";
import { copyToClipboard } from "@/utils/clipboard";
import LoadingPanel from "@/components/LoadingPanel";
import { toast } from "@/components/shared/Toast";
import SocialLinksEditor from "./SocialLinksEditor";
import ServicesSelector from "./ServicesSelector";

/** Use current host so links work on local, staging, and production */
function getProfileDomain() {
  if (typeof window !== "undefined") return window.location.host;
  return process.env.NEXT_PUBLIC_ZEFILE_DOMAIN || "zefile.io";
}

function getProfileOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  const domain = process.env.NEXT_PUBLIC_ZEFILE_DOMAIN || "zefile.io";
  return `https://${domain}`;
}

/** Slug validation: lowercase letters, numbers, hyphens, no leading/trailing hyphen, 3-30 chars */
const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

/** Common languages for the multi-select */
const COMMON_LANGUAGES = [
  "en", "fr", "es", "pt", "ar", "de", "it", "zh",
  "ja", "ko", "sw", "ha", "yo", "ig", "wo", "tw",
  "ee", "gej", "kbp", "fon", "btg", "bci", "dyu", "any", "daf", "sef", "bba",
] as const;

/** Country codes */
const COUNTRY_CODES = [
  "DZ", "BE", "BJ", "BF", "CM", "CA", "CD", "CG", "CI",
  "EG", "ET", "FR", "GA", "DE", "GH", "GN", "KE", "ML",
  "MA", "NE", "NG", "RW", "SN", "ZA", "CH", "TZ", "TG",
  "TN", "UG", "GB", "US",
] as const;

type CheckState = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";

const ProfileSettingsPanel: React.FC = () => {
  const t = useTranslations("profileSettings");
  const tHandle = useTranslations("handle");
  const { setActiveAccountMenu } = useDrawerStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userTier, setUserTier] = useState("free");
  const [kycVerified, setKycVerified] = useState(false);

  // Handle state
  const [currentHandle, setCurrentHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [handleSaving, setHandleSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Profile form state
  const [bioEn, setBioEn] = useState("");
  const [bioFr, setBioFr] = useState("");
  const [specialtyEn, setSpecialtyEn] = useState("");
  const [specialtyFr, setSpecialtyFr] = useState("");
  const [location, setLocation] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [primaryService, setPrimaryService] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isIndexable, setIsIndexable] = useState(true);
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const isFree = userTier === "free";
  const canPublish = kycVerified;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [tierRes, userRes, profileRes] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        usersApi.getCurrentUser(),
        creatorsApi.getMyProfile(),
      ]);

      setUserTier(tierRes.data?.tier || "free");

      const user = userRes.data;
      const handle = user?.handle || null;
      setCurrentHandle(handle);
      if (handle) setHandleInput(handle);
      setKycVerified(user?.kycVerified || false);

      // Pre-fill form from existing profile
      const profile = profileRes.data as OwnProfileDto | null;
      if (profile) {
        setBioEn(profile.bioEn || "");
        setBioFr(profile.bioFr || "");
        setSpecialtyEn(profile.specialtyEn || "");
        setSpecialtyFr(profile.specialtyFr || "");
        setLocation(profile.location || "");
        setLanguagesSpoken(profile.languagesSpoken || []);
        setServicesOffered(profile.servicesOffered || []);
        setPrimaryService(profile.primaryService || null);
        setSocialLinks(profile.socialLinks || []);
        setIsIndexable(profile.isIndexable ?? true);
        setPrimaryLanguage(profile.primaryLanguage || "en");
        setVisibility(profile.visibility || "private");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Handle claim logic ---
  const checkAvailability = useCallback(async (value: string) => {
    const normalised = value.toLowerCase().trim();
    if (!normalised || normalised.length < 3) {
      setCheckState("idle");
      return;
    }
    if (!HANDLE_RE.test(normalised)) {
      setCheckState("invalid");
      return;
    }
    if (normalised === currentHandle) {
      setCheckState("available");
      return;
    }

    setCheckState("checking");
    try {
      const res = await usersApi.checkHandle(normalised);
      if (res.data?.available) {
        setCheckState("available");
      } else {
        setCheckState(res.data?.reason === "reserved" ? "reserved" : "taken");
      }
    } catch {
      setCheckState("idle");
    }
  }, [currentHandle]);

  const handleInputChange = (value: string) => {
    const sanitised = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setHandleInput(sanitised);
    setCheckState("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (sanitised.length >= 3) {
      debounceRef.current = setTimeout(() => checkAvailability(sanitised), 500);
    }
  };

  const handleClaimSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalised = handleInput.toLowerCase().trim();
    if (!normalised || handleSaving) return;

    if (!HANDLE_RE.test(normalised)) {
      toast.error(tHandle("invalidFormat"));
      return;
    }
    if (checkState === "taken") {
      toast.error(tHandle("alreadyTaken"));
      return;
    }
    if (checkState === "reserved") {
      toast.error(tHandle("reserved"));
      return;
    }

    setHandleSaving(true);
    try {
      const res = await usersApi.updateHandle(normalised);
      if (res.error) {
        toast.error(res.error.message || tHandle("saveError"));
        return;
      }
      setCurrentHandle(res.data?.handle || normalised);
      setCheckState("available");
      toast.success(tHandle("saved"));
    } catch {
      toast.error(tHandle("saveError"));
    } finally {
      setHandleSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!currentHandle) return;
    const url = `${getProfileOrigin()}/@${currentHandle}`;
    const ok = await copyToClipboard(url, { showToast: false });
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- Profile save logic ---
  const handleProfileSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await creatorsApi.updateMyProfile({
        bioEn: bioEn.trim(),
        bioFr: bioFr.trim(),
        specialtyEn: specialtyEn.trim(),
        specialtyFr: specialtyFr.trim(),
        location: location || "",
        languagesSpoken,
        servicesOffered,
        primaryService,
        primaryLanguage,
        isIndexable,
      });

      if (res.error) {
        toast.error(res.error.message || t("saveError"));
        return;
      }

      const linksRes = await creatorsApi.updateSocialLinks({ socialLinks });
      if (linksRes.error) {
        toast.error(linksRes.error.message || t("saveError"));
        return;
      }

      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleVisibilityToggle = async () => {
    const newVisibility = visibility === "public" ? "private" : "public";
    if (newVisibility === "public" && !canPublish) return;

    try {
      const res = await creatorsApi.updateVisibility({ visibility: newVisibility });
      if (res.error) {
        toast.error(res.error.message || t("visibilityError"));
        return;
      }
      setVisibility(newVisibility);
      toast.success(
        newVisibility === "public" ? t("profilePublished") : t("profileUnpublished"),
      );
    } catch {
      toast.error(t("visibilityError"));
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languagesSpoken.includes(lang)) {
      setLanguagesSpoken(languagesSpoken.filter((l) => l !== lang));
    } else if (languagesSpoken.length < 10) {
      setLanguagesSpoken([...languagesSpoken, lang]);
    }
  };

  // --- Render ---
  if (loading) {
    return <LoadingPanel className="py-12" />;
  }

  if (error) {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-6">
          {t("title")}
        </h3>
        <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-8 text-center">
          <WarningCircle className="w-12 h-12 text-gray-300 dark:text-[oklch(0.60_0_0)] mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-4">
            {t("loadError")}
          </p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  const canSaveHandle =
    handleInput.trim().length >= 3 &&
    HANDLE_RE.test(handleInput.toLowerCase().trim()) &&
    (checkState === "available" || checkState === "idle") &&
    handleInput.toLowerCase().trim() !== currentHandle;

  const profileUrl = currentHandle ? `${getProfileDomain()}/@${currentHandle}` : null;

  return (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
          {t("title")}
        </h3>
        {currentHandle && (
          <a
            href={`${getProfileOrigin()}/@${currentHandle}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-[#5E53E0] dark:text-[#8B83F0] font-medium hover:underline"
          >
            {t("previewProfile")}
            <NavArrowRight className="w-4 h-4" />
          </a>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-8">
        {t("description")}
      </p>

      {/* Section 1: Your ZeFile Link */}
      <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
          {tHandle("title")}
        </h4>
        <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mb-4">
          {tHandle("description")}
        </p>

        {/* Active handle card */}
        {currentHandle && (
          <div className="flex items-center justify-between bg-white dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded-lg px-5 py-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#87E64B]" />
              <span className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
                {getProfileDomain()}/@{currentHandle}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={tHandle("copyLink")}
            >
              {copied ? (
                <Check className="w-4 h-4 text-[#87E64B]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? tHandle("copied") : tHandle("copyLink")}</span>
            </button>
          </div>
        )}

        {/* Handle form */}
        <form onSubmit={handleClaimSave} className="max-w-lg">
          <label className="block text-xs font-medium text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
            {tHandle("handleLabel")}
          </label>

          <div className="flex items-stretch border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded overflow-hidden focus-within:ring-2 focus-within:ring-[#171717] dark:focus-within:ring-[oklch(0.91_0_0)] focus-within:border-transparent">
            <span className="flex items-center px-4 bg-gray-50 dark:bg-[oklch(0.22_0_0)] border-r border-gray-200 dark:border-[oklch(0.30_0_0)] text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] font-medium whitespace-nowrap select-none">
              {getProfileDomain()}/@
            </span>
            <input
              type="text"
              value={handleInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={tHandle("placeholder")}
              maxLength={30}
              className="flex-1 px-4 py-3 text-sm text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.60_0_0)] focus:outline-none bg-white dark:bg-[oklch(0.18_0_0)]"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Availability feedback */}
          <div className="mt-1.5 h-5">
            {checkState === "checking" && (
              <p className="text-xs text-gray-400">{tHandle("checking")}</p>
            )}
            {checkState === "available" && (
              <p className="text-xs text-[#87E64B] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {getProfileDomain()}/@{handleInput.toLowerCase().trim()} {tHandle("available")}
              </p>
            )}
            {checkState === "taken" && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <WarningCircle className="w-3.5 h-3.5" />
                {tHandle("taken")}
              </p>
            )}
            {checkState === "reserved" && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <WarningCircle className="w-3.5 h-3.5" />
                {tHandle("reserved")}
              </p>
            )}
            {checkState === "invalid" && handleInput.length > 0 && (
              <p className="text-xs text-red-500">{tHandle("invalidFormat")}</p>
            )}
          </div>

          <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-1">{tHandle("hint")}</p>

          <button
            type="submit"
            disabled={!canSaveHandle || handleSaving}
            className="mt-3 px-6 py-2.5 bg-[#87E64B] text-[#171717] font-bold text-sm rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {handleSaving ? tHandle("saving") : currentHandle ? tHandle("update") : tHandle("claim")}
          </button>
        </form>
      </section>

      {/* Profile settings — only show when handle is claimed */}
      {currentHandle && (
        <>
          {/* Section 2: Visibility */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            {canPublish ? (
              <>
                {/* Verified: show toggle + preview link */}
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
                    {t("visibilityLabel")}
                  </h4>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={visibility === "public"}
                    onClick={handleVisibilityToggle}
                    className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                      visibility === "public"
                        ? "bg-[#87E64B]"
                        : "bg-gray-300 dark:bg-[oklch(0.40_0_0)]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        visibility === "public" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Preview link */}
                {profileUrl && (
                  <a
                    href={`${getProfileOrigin()}/@${currentHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#5E53E0] hover:underline"
                  >
                    {profileUrl}
                    <OpenNewWindow className="w-4 h-4" />
                  </a>
                )}
              </>
            ) : (
              /* Not verified: show contextual KYC prompt card */
              <div className="bg-white dark:bg-[oklch(0.22_0_0)] border border-gray-200 dark:border-[oklch(0.30_0_0)] border-l-4 border-l-[#5E53E0]/20 rounded-lg p-5">
                <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
                  {t("verifyToPublish")}
                </h4>
                <p className="text-xs text-gray-500 dark:text-[oklch(0.75_0_0)] mb-3">
                  {t("verifyToPublishBody")}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveAccountMenu("verification")}
                  className="text-sm text-[#5E53E0] font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {t("verifyNow")} &rarr;
                </button>
              </div>
            )}
          </section>

          {/* Section 3: Bio */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-1">
              {t("bioLabel")}
            </h4>
            <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mb-3">
              {t("bioHint")}
            </p>

            {/* Primary language selector */}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs text-gray-500 dark:text-[oklch(0.75_0_0)]">
                {t("primaryLanguageLabel")}
              </label>
              <select
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                className="border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-3 py-1.5 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
              </select>
            </div>

            <textarea
              value={primaryLanguage === "en" ? bioEn : bioFr}
              onChange={(e) =>
                primaryLanguage === "en"
                  ? setBioEn(e.target.value)
                  : setBioFr(e.target.value)
              }
              placeholder={t("bioPlaceholder")}
              maxLength={500}
              rows={4}
              className="w-full border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-3 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)] resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-1 text-right">
              {(primaryLanguage === "en" ? bioEn : bioFr).length}/500
            </p>

            {/* Secondary language */}
            {isFree ? (
              <p className="text-xs text-[#5E53E0] mt-3">
                {t("upgradeForSecondLanguage")}
              </p>
            ) : (
              <div className="mt-4">
                <label className="text-xs text-gray-500 dark:text-[oklch(0.75_0_0)] mb-2 block">
                  {primaryLanguage === "en" ? t("bioFrLabel") : t("bioEnLabel")}
                </label>
                <textarea
                  value={primaryLanguage === "en" ? bioFr : bioEn}
                  onChange={(e) =>
                    primaryLanguage === "en"
                      ? setBioFr(e.target.value)
                      : setBioEn(e.target.value)
                  }
                  placeholder={
                    primaryLanguage === "en"
                      ? t("bioFrPlaceholder")
                      : t("bioEnPlaceholder")
                  }
                  maxLength={500}
                  rows={3}
                  className="w-full border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-3 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)] resize-none"
                />
                <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-1 text-right">
                  {(primaryLanguage === "en" ? bioFr : bioEn).length}/500
                </p>
              </div>
            )}
          </section>

          {/* Section 4: Specialty */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
              {t("specialtyLabel")}
            </h4>
            <input
              type="text"
              value={primaryLanguage === "en" ? specialtyEn : specialtyFr}
              onChange={(e) =>
                primaryLanguage === "en"
                  ? setSpecialtyEn(e.target.value)
                  : setSpecialtyFr(e.target.value)
              }
              placeholder={t("specialtyPlaceholder")}
              maxLength={100}
              className="w-full max-w-lg border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-3 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
            />

            {isFree ? (
              <p className="text-xs text-[#5E53E0] mt-3">
                {t("upgradeForSecondLanguage")}
              </p>
            ) : (
              <div className="mt-3">
                <label className="text-xs text-gray-500 dark:text-[oklch(0.75_0_0)] mb-2 block">
                  {primaryLanguage === "en"
                    ? t("specialtyFrLabel")
                    : t("specialtyEnLabel")}
                </label>
                <input
                  type="text"
                  value={primaryLanguage === "en" ? specialtyFr : specialtyEn}
                  onChange={(e) =>
                    primaryLanguage === "en"
                      ? setSpecialtyFr(e.target.value)
                      : setSpecialtyEn(e.target.value)
                  }
                  placeholder={
                    primaryLanguage === "en"
                      ? t("specialtyFrPlaceholder")
                      : t("specialtyEnPlaceholder")
                  }
                  maxLength={100}
                  className="w-full max-w-lg border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-3 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] placeholder-gray-400 dark:placeholder-[oklch(0.60_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
                />
              </div>
            )}
          </section>

          {/* Section 5: Location + Languages spoken */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6">
              <div>
                <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
                  {t("locationLabel")}
                </h4>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-200 dark:border-[oklch(0.30_0_0)] rounded px-4 py-3 text-sm bg-white dark:bg-[oklch(0.22_0_0)] text-[#171717] dark:text-[oklch(0.91_0_0)] focus:outline-none focus:ring-1 focus:ring-[#171717] dark:focus:ring-[oklch(0.91_0_0)]"
                >
                  <option value="">{t("selectCountry")}</option>
                  {[...COUNTRY_CODES]
                    .sort((a, b) => t(`country_${a}`).localeCompare(t(`country_${b}`)))
                    .map((code) => (
                      <option key={code} value={code}>
                        {t(`country_${code}`)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
                  {t("languagesLabel")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {COMMON_LANGUAGES.map((lang) => {
                    const isSelected = languagesSpoken.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          isSelected
                            ? "bg-[#87E64B]/10 border-[#87E64B] text-[#171717] dark:text-[oklch(0.91_0_0)] font-medium"
                            : "bg-white dark:bg-[oklch(0.22_0_0)] border-gray-200 dark:border-[oklch(0.30_0_0)] text-gray-600 dark:text-[oklch(0.75_0_0)] hover:border-gray-400 dark:hover:border-[oklch(0.50_0_0)]"
                        }`}
                      >
                        {t(`lang_${lang}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Services offered */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
              {t("servicesLabel")}
            </h4>
            <ServicesSelector
              selected={servicesOffered}
              onChange={setServicesOffered}
              primaryService={primaryService}
              onPrimaryChange={setPrimaryService}
            />
          </section>

          {/* Section 7: Social links */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
              {t("socialLinksLabel")}
            </h4>
            <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
          </section>

          {/* Section 8: SEO control */}
          <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isIndexable}
                onChange={(e) => setIsIndexable(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#87E64B] focus:ring-[#87E64B]"
              />
              <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)]">
                {t("seoLabel")}
              </span>
            </label>
            <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-1 ml-7">
              {t("seoHint")}
            </p>
          </section>

          {/* Section 9: Save button */}
          <button
            type="button"
            onClick={handleProfileSave}
            disabled={saving}
            className="px-8 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </>
      )}
    </div>
  );
};

export default ProfileSettingsPanel;
