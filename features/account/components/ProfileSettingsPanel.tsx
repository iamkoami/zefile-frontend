"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { OpenNewWindow, ProfileCircle, WarningCircle } from "iconoir-react";
import { useDrawerStore } from "@/stores/drawer-store";
import {
  creatorsApi,
  OwnProfileDto,
  SocialLink,
} from "@/services/creators-api";
import { usersApi, UserProfile } from "@/services/users-api";
import { subscriptionApi } from "@/services/subscription-api";
import LoadingPanel from "@/components/LoadingPanel";
import { toast } from "@/components/shared/Toast";
import SocialLinksEditor from "./SocialLinksEditor";
import ServicesSelector from "./ServicesSelector";

const ZEFILE_DOMAIN = process.env.NEXT_PUBLIC_ZEFILE_DOMAIN || "zefile.io";

/** Common languages for the multi-select */
const COMMON_LANGUAGES = [
  "en", "fr", "es", "pt", "ar", "de", "it", "zh",
  "ja", "ko", "sw", "ha", "yo", "ig", "wo", "tw",
] as const;

/** Country codes — sorted alphabetically by i18n label at render time */
const COUNTRY_CODES = [
  "DZ", "BE", "BJ", "BF", "CM", "CA", "CD", "CG", "CI",
  "EG", "ET", "FR", "GA", "DE", "GH", "GN", "KE", "ML",
  "MA", "NE", "NG", "RW", "SN", "ZA", "CH", "TZ", "TG",
  "TN", "UG", "GB", "US",
] as const;

type PanelView = "loading" | "error" | "no-handle" | "tier-gate" | "form";

const ProfileSettingsPanel: React.FC = () => {
  const t = useTranslations("profileSettings");
  const { setActiveAccountMenu } = useDrawerStore();

  const [view, setView] = useState<PanelView>("loading");
  const [saving, setSaving] = useState(false);
  const [userTier, setUserTier] = useState("free");
  const [userHandle, setUserHandle] = useState<string | null>(null);
  const [kycVerified, setKycVerified] = useState(false);

  // Form state
  const [bioEn, setBioEn] = useState("");
  const [bioFr, setBioFr] = useState("");
  const [specialtyEn, setSpecialtyEn] = useState("");
  const [specialtyFr, setSpecialtyFr] = useState("");
  const [location, setLocation] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>([]);
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [isIndexable, setIsIndexable] = useState(true);
  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  const isFree = userTier === "free";
  const canPublish = kycVerified;

  const loadData = useCallback(async () => {
    setView("loading");
    try {
      const [tierRes, userRes, profileRes] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        usersApi.getCurrentUser(),
        creatorsApi.getMyProfile(),
      ]);

      const tier = tierRes.data?.tier || "free";
      setUserTier(tier);

      if (tier === "free") {
        setView("tier-gate");
        return;
      }

      const user = userRes.data as UserProfile & { handle?: string };
      const handle = user?.handle || null;
      setUserHandle(handle);
      setKycVerified(user?.kycVerified || false);

      if (!handle) {
        setView("no-handle");
        return;
      }

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
        setSocialLinks(profile.socialLinks || []);
        setIsIndexable(profile.isIndexable ?? true);
        setPrimaryLanguage(profile.primaryLanguage || "en");
        setVisibility(profile.visibility || "private");
      }

      setView("form");
    } catch {
      setView("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Update profile fields — send empty strings to clear, not undefined
      const res = await creatorsApi.updateMyProfile({
        bioEn: bioEn.trim(),
        bioFr: bioFr.trim(),
        specialtyEn: specialtyEn.trim(),
        specialtyFr: specialtyFr.trim(),
        location: location || "",
        languagesSpoken,
        servicesOffered,
        primaryLanguage,
        isIndexable,
      });

      if (res.error) {
        toast.error(res.error.message || t("saveError"));
        return;
      }

      // Always sync social links (handles deletion of all links too)
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

  if (view === "loading") {
    return <LoadingPanel className="py-12" />;
  }

  if (view === "error") {
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

  if (view === "tier-gate") {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-6">
          {t("title")}
        </h3>
        <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-8 text-center">
          <ProfileCircle className="w-12 h-12 text-gray-300 dark:text-[oklch(0.60_0_0)] mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
            {t("upgradeTitle")}
          </h4>
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-6 max-w-sm mx-auto">
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

  if (view === "no-handle") {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-6">
          {t("title")}
        </h3>
        <div className="bg-gray-50 dark:bg-[oklch(0.22_0_0)] rounded-lg p-8 text-center">
          <WarningCircle className="w-12 h-12 text-gray-300 dark:text-[oklch(0.60_0_0)] mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
            {t("needHandleTitle")}
          </h4>
          <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-6 max-w-sm mx-auto">
            {t("needHandleDescription")}
          </p>
          <button
            onClick={() => setActiveAccountMenu("handle")}
            className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors"
          >
            {t("claimHandle")}
          </button>
        </div>
      </div>
    );
  }

  const profileUrl = `${ZEFILE_DOMAIN}/@${userHandle}`;

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-2">
        {t("title")}
      </h3>
      <p className="text-sm text-gray-500 dark:text-[oklch(0.75_0_0)] mb-8">
        {t("description")}
      </p>

      {/* Section 1: Visibility toggle + preview link */}
      <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)]">
              {t("visibilityLabel")}
            </h4>
            {!canPublish && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {t("kycRequiredForPublic")}
              </p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={visibility === "public"}
            onClick={handleVisibilityToggle}
            disabled={!canPublish && visibility === "private"}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              visibility === "public"
                ? "bg-[#87E64B]"
                : "bg-gray-300 dark:bg-[oklch(0.40_0_0)]"
            } ${!canPublish && visibility === "private" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                visibility === "public" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Preview link */}
        {userHandle && (
          <a
            href={`https://${profileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#5E53E0] hover:underline"
          >
            {profileUrl}
            <OpenNewWindow className="w-4 h-4" />
          </a>
        )}
      </section>

      {/* Section 2: Bio */}
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

      {/* Section 3: Specialty */}
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

      {/* Section 4: Location + Languages spoken */}
      <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location */}
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

          {/* Languages spoken */}
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

      {/* Section 5: Services offered */}
      <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
          {t("servicesLabel")}
        </h4>
        <ServicesSelector
          selected={servicesOffered}
          onChange={setServicesOffered}
        />
      </section>

      {/* Section 6: Social links */}
      <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <h4 className="text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
          {t("socialLinksLabel")}
        </h4>
        <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
      </section>

      {/* Section 7: SEO control */}
      <section className="mb-8 pb-8 border-b border-gray-200 dark:border-[oklch(0.30_0_0)]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isIndexable}
            onChange={(e) => setIsIndexable(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-[#87E64B] focus:ring-[#87E64B]"
          />
          <span className="text-sm text-[#171717] dark:text-[oklch(0.91_0_0)]">
            {t("seoLabel")}
          </span>
        </label>
        <p className="text-xs text-gray-400 dark:text-[oklch(0.60_0_0)] mt-1 ml-7">
          {t("seoHint")}
        </p>
      </section>

      {/* Section 8: Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? t("saving") : t("save")}
      </button>
    </div>
  );
};

export default ProfileSettingsPanel;
