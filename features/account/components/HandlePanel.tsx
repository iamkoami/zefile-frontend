"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Globe, WarningCircle } from "iconoir-react";
import { usersApi, UserProfile } from "@/services/users-api";
import { subscriptionApi } from "@/services/subscription-api";
import { copyToClipboard } from "@/utils/clipboard";
import LoadingPanel from "@/components/LoadingPanel";
import { toast } from "@/components/shared/Toast";
import { useDrawerStore } from "@/stores/drawer-store";

const SUBDOMAIN_BASE =
  process.env.NEXT_PUBLIC_ZEFILE_SUBDOMAIN_BASE || "zefile.io";

/** Slug validation: lowercase letters, numbers, hyphens, no leading/trailing hyphen, 3–30 chars */
const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

type CheckState = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";
type PanelView = "loading" | "tier-gate" | "form";

/**
 * HandlePanel — Claim or update your ZeFile subdomain (amara.zefile.io).
 * Available to STARTER and PRO users.
 */
const HandlePanel: React.FC = () => {
  const t = useTranslations("handle");
  const { setActiveAccountMenu } = useDrawerStore();

  const [view, setView] = useState<PanelView>("loading");
  const [currentHandle, setCurrentHandle] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    setView("loading");
    try {
      const [tierRes, profileRes] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        usersApi.getCurrentUser(),
      ]);

      const tier = tierRes.data?.tier || "free";
      if (tier === "free") {
        setView("tier-gate");
        return;
      }

      const handle = (profileRes.data as UserProfile & { handle?: string })?.handle || null;
      setCurrentHandle(handle);
      if (handle) setInput(handle);
      setView("form");
    } catch {
      setView("form");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced availability check
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
    // Skip check if same as current saved handle
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
    // Only allow lowercase letters, numbers, hyphens during typing
    const sanitised = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setInput(sanitised);
    setCheckState("idle");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (sanitised.length >= 3) {
      debounceRef.current = setTimeout(() => checkAvailability(sanitised), 500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalised = input.toLowerCase().trim();
    if (!normalised || isSaving) return;

    if (!HANDLE_RE.test(normalised)) {
      toast.error(t("invalidFormat"));
      return;
    }
    if (checkState === "taken") {
      toast.error(t("alreadyTaken"));
      return;
    }
    if (checkState === "reserved") {
      toast.error(t("reserved"));
      return;
    }

    setIsSaving(true);
    try {
      const res = await usersApi.updateHandle(normalised);
      if (res.error) {
        toast.error(res.error.message || t("saveError"));
        return;
      }
      setCurrentHandle(res.data?.handle || normalised);
      setCheckState("available");
      toast.success(t("saved"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!currentHandle) return;
    const url = `https://${currentHandle}.${SUBDOMAIN_BASE}`;
    const ok = await copyToClipboard(url, { showToast: false });
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (view === "loading") {
    return <LoadingPanel className="py-12" />;
  }

  if (view === "tier-gate") {
    return (
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-[#171717] mb-6">{t("title")}</h3>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#171717] mb-2">{t("upgradeTitle")}</h4>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
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

  const previewUrl = input.trim()
    ? `${input.toLowerCase().trim()}.${SUBDOMAIN_BASE}`
    : null;

  const canSave =
    input.trim().length >= 3 &&
    HANDLE_RE.test(input.toLowerCase().trim()) &&
    (checkState === "available" || checkState === "idle") &&
    input.toLowerCase().trim() !== currentHandle;

  return (
    <div className="mb-10">
      <h3 className="text-2xl font-bold text-[#171717] mb-2">{t("title")}</h3>
      <p className="text-sm text-gray-500 mb-6">{t("description")}</p>

      {/* Active handle card */}
      {currentHandle && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#87E64B]" />
            <span className="text-sm font-bold text-[#171717]">
              {currentHandle}.{SUBDOMAIN_BASE}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t("copyLink")}
          >
            {copied ? (
              <Check className="w-4 h-4 text-[#87E64B]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? t("copied") : t("copyLink")}</span>
          </button>
        </div>
      )}

      {/* Handle form */}
      <form onSubmit={handleSave} className="max-w-lg">
        <label className="block text-sm font-medium text-[#171717] mb-2">
          {t("handleLabel")}
        </label>

        {/* Input row: handle + .zefile.io */}
        <div className="flex items-stretch border border-gray-200 rounded overflow-hidden focus-within:ring-2 focus-within:ring-[#171717] focus-within:border-transparent">
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={30}
            className="flex-1 px-4 py-3 text-sm text-[#171717] placeholder:text-gray-400 focus:outline-none bg-white"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className="flex items-center px-4 bg-gray-50 border-l border-gray-200 text-sm text-gray-500 font-medium whitespace-nowrap select-none">
            .{SUBDOMAIN_BASE}
          </span>
        </div>

        {/* Availability feedback */}
        <div className="mt-1.5 h-5">
          {checkState === "checking" && (
            <p className="text-xs text-gray-400">{t("checking")}</p>
          )}
          {checkState === "available" && (
            <p className="text-xs text-[#87E64B] flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {previewUrl} {t("available")}
            </p>
          )}
          {checkState === "taken" && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <WarningCircle className="w-3.5 h-3.5" />
              {t("taken")}
            </p>
          )}
          {checkState === "reserved" && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <WarningCircle className="w-3.5 h-3.5" />
              {t("reserved")}
            </p>
          )}
          {checkState === "invalid" && input.length > 0 && (
            <p className="text-xs text-red-500">{t("invalidFormat")}</p>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2">{t("hint")}</p>

        <button
          type="submit"
          disabled={!canSave || isSaving}
          className="mt-4 px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? t("saving") : currentHandle ? t("update") : t("claim")}
        </button>
      </form>
    </div>
  );
};

export default HandlePanel;
