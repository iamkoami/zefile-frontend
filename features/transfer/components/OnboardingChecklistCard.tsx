"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, Xmark } from "iconoir-react";
import { useTranslations } from "next-intl";
import { usersApi, OnboardingStatus } from "@/services/users-api";
import { useDrawerStore } from "@/stores/drawer-store";
import { authApi } from "@/services/auth-api";

const DISMISSED_KEY_PREFIX = "zefile_onboarding_dismissed_";

function getDismissedKey(): string | null {
  const user = authApi.getStoredUser();
  if (!user?.id) return null;
  return DISMISSED_KEY_PREFIX + user.id;
}

const OnboardingChecklistCard: React.FC = () => {
  const t = useTranslations("onboardingChecklist");
  const { closeDrawer, openDrawer } = useDrawerStore();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const cancelledRef = useRef(false);

  // Fetch onboarding status as soon as user is authenticated
  useEffect(() => {
    cancelledRef.current = false;

    if (!authApi.isAuthenticated()) return;

    const key = getDismissedKey();
    try {
      if (key && localStorage.getItem(key) === "true") return;
    } catch {
      return;
    }

    setDismissed(false);

    usersApi
      .getOnboardingStatus()
      .then((res) => {
        if (cancelledRef.current) return;
        if (res.data) {
          setStatus(res.data);
          if (res.data.completedCount >= res.data.totalCount) {
            setDismissed(true);
          }
        }
      })
      .catch(() => {
        if (!cancelledRef.current) {
          setDismissed(true);
        }
      });

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Re-fetch when user authenticates after mount
  useEffect(() => {
    const handleAuthChange = () => {
      if (!authApi.isAuthenticated()) return;

      const key = getDismissedKey();
      try {
        if (key && localStorage.getItem(key) === "true") return;
      } catch {
        return;
      }

      cancelledRef.current = false;
      setDismissed(false);

      usersApi
        .getOnboardingStatus()
        .then((res) => {
          if (cancelledRef.current) return;
          if (res.data) {
            setStatus(res.data);
            if (res.data.completedCount >= res.data.totalCount) {
              setDismissed(true);
            }
          }
        })
        .catch(() => {
          if (!cancelledRef.current) {
            setDismissed(true);
          }
        });
    };

    window.addEventListener("auth-state-change", handleAuthChange);
    return () => {
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      const key = getDismissedKey();
      if (key) localStorage.setItem(key, "true");
    } catch {
      // localStorage unavailable
    }
  };

  const handleMilestoneClick = (key: string) => {
    if (key === "addedContact") {
      openDrawer("contacts");
      return;
    }
    closeDrawer();
  };

  if (dismissed || !status) return null;

  const milestones = [
    { key: "firstTransfer", done: status.milestones.firstTransfer },
    { key: "firstDownload", done: status.milestones.firstDownload },
    { key: "addedContact", done: status.milestones.addedContact },
    { key: "firstPaidTransfer", done: status.milestones.firstPaidTransfer },
  ];

  const progress =
    status.totalCount > 0
      ? (status.completedCount / status.totalCount) * 100
      : 0;

  return (
    <div className="mb-6 rounded border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-[#171717]">{t("title")}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t("progress", { done: status.completedCount, total: status.totalCount })}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={t("dismiss")}
        >
          <Xmark className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
        <div
          className="h-1.5 bg-[#87E64B] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Milestones */}
      <div className="space-y-2.5">
        {milestones.map((m) => (
          <button
            key={m.key}
            onClick={() => !m.done && handleMilestoneClick(m.key)}
            disabled={m.done}
            className={`flex items-center gap-3 w-full text-left group ${
              m.done
                ? "cursor-default"
                : "cursor-pointer hover:bg-gray-50 rounded -mx-1 px-1"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                m.done
                  ? "bg-[#87E64B]"
                  : "border-2 border-gray-300 group-hover:border-[#171717]"
              }`}
            >
              {m.done && <Check className="w-3 h-3 text-[#171717]" strokeWidth={2.5} />}
            </div>
            <span
              className={`text-sm ${
                m.done ? "text-gray-400 line-through" : "text-[#171717]"
              }`}
            >
              {t(`milestones.${m.key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnboardingChecklistCard;
