"use client";


import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { authApi } from "@/services/auth-api";
import { referralsApi } from "@/services/referrals-api";
import Header from "@/components/shared/Header";
import LoadingPanel from "@/components/LoadingPanel";

type PageState = "loading" | "valid" | "invalid" | "already-authenticated";

export default function ReferralPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const t = useTranslations("referrals");
  const [state, setState] = useState<PageState>("loading");
  const [referrerName, setReferrerName] = useState<string>("");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const code = params?.code;
    if (!code) {
      setState("invalid");
      return;
    }

    if (authApi.isAuthenticated()) {
      setState("already-authenticated");
      return;
    }

    async function validateCode() {
      // Check if referrals are enabled before validating
      const rewardRes = await referralsApi.getRewardInfo();
      if (!rewardRes.data?.enabled) {
        setState("invalid");
        return;
      }

      const response = await referralsApi.validateCode(code!);

      if (response.data?.valid) {
        if (response.data.referrerName) {
          setReferrerName(response.data.referrerName);
          localStorage.setItem("referral_referrer_name", response.data.referrerName);
        }
        localStorage.setItem("referral_code", code!);
        setState("valid");

        redirectTimer.current = setTimeout(() => {
          router.push("/");
        }, 3000);
      } else {
        setState("invalid");
      }
    }

    validateCode();

    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, [params?.code, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-[oklch(0.19_0_0)]">
      <Header />
      <main
        className="flex flex-col items-center justify-center px-4"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        {state === "loading" && <LoadingPanel />}

        {state === "valid" && (
          <>
            <h1 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3 text-center">
              {t("validTitle", { name: referrerName })}
            </h1>
            <p className="text-gray-600 dark:text-[oklch(0.65_0_0)] mb-2 text-center max-w-md leading-relaxed">
              {t("validValueProp")}
            </p>
            <p className="text-gray-400 dark:text-[oklch(0.50_0_0)] text-sm mb-8 text-center max-w-md leading-relaxed">
              {t("validSubtitle")}
            </p>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3 text-center">
              {t("invalidLink")}
            </h1>
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)] mb-8 text-center max-w-md leading-relaxed">
              {t("invalidSubtitle")}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
            >
              {t("goHome")}
            </Link>
          </>
        )}

        {state === "already-authenticated" && (
          <>
            <h1 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3 text-center">
              {t("alreadyHaveAccount")}
            </h1>
            <p className="text-gray-500 dark:text-[oklch(0.65_0_0)] mb-8 text-center max-w-md leading-relaxed">
              {t("alreadyHaveAccountSubtitle")}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#87E64B] text-[#171717] font-medium rounded hover:bg-[#78d43f] transition-colors"
            >
              {t("goHome")}
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
