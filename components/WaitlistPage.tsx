"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import Lottie from "lottie-react";
import { Check, Copy } from "iconoir-react";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { platformApi } from "@/services/platform-api";

type WaitlistState = "form" | "success" | "already";

export default function WaitlistPage() {
  const t = useTranslations("waitlist");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<WaitlistState>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pictoAnimation, setPictoAnimation] = useState<object | null>(null);
  const [confettiAnimation, setConfettiAnimation] = useState<object | null>(
    null,
  );

  useEffect(() => {
    import("@/public/lotties/zefile_picto.json").then((m) =>
      setPictoAnimation(m.default),
    );
    import("@/public/lotties/confetti_success.json").then((m) =>
      setConfettiAnimation(m.default),
    );
  }, []);

  // Fetch waitlist count
  useEffect(() => {
    platformApi.getWaitlistCount().then((res) => {
      if (!res.error && res.data) {
        setCount(res.data.count);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !consent) return;

    setSubmitting(true);
    setError("");

    const response = await platformApi.waitlistSignup(email.trim(), locale);

    if (response.error) {
      setError(t("errorGeneric"));
      setSubmitting(false);
      return;
    }

    if (response.data?.alreadySignedUp) {
      setState("already");
    } else {
      setState("success");
      // Increment local count
      if (count !== null) setCount(count + 1);
    }
    setSubmitting(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText("https://zefile.io");
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  const featurePills = [
    "fileTransfer",
    "monetization",
    "shortLinks",
    "fileSigning",
  ] as const;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row dark:bg-[oklch(0.19_0_0)]">
      {/* Left panel (white / dark) */}
      <div className="flex-1 flex flex-col justify-between bg-white dark:bg-[oklch(0.19_0_0)] px-6 md:px-12 lg:px-16 py-8 relative z-10 order-2 lg:order-1">
        {/* Logo + language */}
        <div
          className="flex items-center justify-between mb-8 lg:mb-0"
          style={{ animation: "fadeIn 0.3s ease-out both" }}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/zefile-logo.svg"
              className="pt-1 dark:hidden"
              alt="ZeFile"
              width={125}
              height={24}
            />
            <Image
              src="/zefile-logo-white.svg"
              className="pt-1 hidden dark:block"
              alt="ZeFile"
              width={125}
              height={24}
            />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full lg:mx-0">
          {state === "form" ? (
            <>
              {/* Staggered headline */}
              <div className="mb-6">
                <h1
                  className="text-4xl md:text-4xl font-black text-[#171717] dark:text-[oklch(0.91_0_0)] leading-tight"
                  style={{ animation: "slideInLeft 0.6s ease-out 0.3s both" }}
                >
                  {t("headline1")}
                </h1>
                <h1
                  className="text-4xl md:text-4xl font-black text-[#171717] dark:text-[oklch(0.91_0_0)] leading-tight"
                  style={{ animation: "slideInLeft 0.6s ease-out 0.5s both" }}
                >
                  {t("headline2")}
                </h1>
                <h1
                  className="text-4xl md:text-4xl font-black text-[#5E53E0] leading-tight"
                  style={{ animation: "slideInLeft 0.6s ease-out 0.7s both" }}
                >
                  {t("headline3")}
                </h1>
              </div>

              {/* Subtitle */}
              <p
                className="text-gray-500 dark:text-[oklch(0.65_0_0)] font-bold mb-8 leading-relaxed"
                style={{ animation: "fadeIn 0.8s ease-out 1.0s both" }}
              >
                {t("subtitle")}
              </p>

              {/* Consent checkbox */}
              <label
                className="flex items-start font-medium gap-3 mb-4 cursor-pointer"
                style={{ animation: "fadeIn 0.5s ease-out 1.3s both" }}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={consent}
                  onClick={() => setConsent(!consent)}
                  className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    consent
                      ? "bg-[#87E64B] border-[#87E64B]"
                      : "border-gray-300 dark:border-[oklch(0.40_0_0)] bg-white dark:bg-[oklch(0.22_0_0)] hover:border-[#171717] dark:hover:border-[oklch(0.60_0_0)]"
                  }`}
                >
                  {consent && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="#171717"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-gray-600 dark:text-[oklch(0.65_0_0)]">{t("consent")}</span>
              </label>

              {/* Email form */}
              <form
                onSubmit={handleSubmit}
                className="flex gap-2 mt-2 mb-4"
                style={{ animation: "slideUp 0.6s ease-out 1.5s both" }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-[oklch(0.30_0_0)] font-medium rounded text-[#171717] dark:text-[oklch(0.91_0_0)] bg-white dark:bg-[oklch(0.22_0_0)] placeholder:text-gray-400 dark:placeholder:text-[oklch(0.45_0_0)] focus:outline-none hover:border-[#87E64B] focus:border-[#87E64B] transition-colors"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting || !consent || !email.trim()}
                  className="px-6 py-3 bg-[#87E64B] text-[#171717] font-bold rounded hover:bg-[#78d43f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t("joining") : t("join")}
                </button>
              </form>

              {error && <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error}</p>}

              {/* Live counter */}
              {count !== null && count >= 20 && (
                <p
                  className="text-sm font-medium text-gray-400 dark:text-[oklch(0.50_0_0)]"
                  style={{ animation: "fadeIn 0.5s ease-out 1.8s both" }}
                >
                  {t("counter", { count })}
                </p>
              )}
            </>
          ) : (
            /* Success / Already on list state */
            <div
              style={{
                animation: "slideUp 0.6s ease-out both",
              }}
            >
              {/* Confetti (plays once) */}
              {state === "success" && confettiAnimation && (
                <div className="w-48 h-48 mx-auto mb-4">
                  <Lottie
                    animationData={confettiAnimation}
                    loop={false}
                    autoplay={true}
                    className="ze-lottie-container"
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              )}

              {state === "already" && (
                <div className="w-12 h-12 rounded-full bg-[#87E64B]/20 flex items-center justify-center mx-auto mb-4 lg:mx-0">
                  <Check className="w-6 h-6 text-[#87E64B]" />
                </div>
              )}

              <h2 className="text-2xl font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] mb-3">
                {state === "success" ? t("successTitle") : t("alreadyTitle")}
              </h2>
              <p className="text-gray-500 dark:text-[oklch(0.65_0_0)] font-medium mb-6 leading-relaxed">
                {state === "success"
                  ? t("successSubtitle")
                  : t("alreadySubtitle")}
              </p>

              {/* Copy invite link */}
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-[oklch(0.30_0_0)] rounded text-sm font-bold text-[#171717] dark:text-[oklch(0.91_0_0)] hover:bg-gray-50 dark:hover:bg-[oklch(0.24_0_0)] transition-colors mb-6"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[#87E64B]" />
                    {t("linkCopied")}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t("copyLink")}
                  </>
                )}
              </button>

              {count !== null && count >= 20 && (
                <p className="text-sm font-bold text-gray-400 dark:text-[oklch(0.50_0_0)]">
                  {t("counter", { count })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom spacer for layout balance */}
        <div className="hidden lg:block" />
      </div>

      {/* Right panel (green, desktop only as full panel; mobile shows as top strip) */}
      <div
        className="lg:flex-1 bg-[#87E64B] relative overflow-hidden flex items-center justify-center order-1 lg:order-2 min-h-[200px] lg:min-h-0"
        style={{ animation: "fadeIn 0.5s ease-out both" }}
      >
        {/* Picto animation */}
        <div
          className="relative z-10"
          style={{ animation: "scaleIn 0.8s ease-out 0.5s both" }}
        >
          {pictoAnimation && (
            <Lottie
              animationData={pictoAnimation}
              loop={true}
              autoplay={true}
              style={{ width: 400, height: 400 }}
              className="ze-lottie-container lg:w-[400px] lg:h-[400px]"
            />
          )}
        </div>

        {/* Floating branded card */}
        <div
          className="hidden lg:block absolute"
          style={{
            bottom: "15%",
            right: "10%",
            transform: "rotate(5deg)",
            animation:
              "scaleIn 0.5s ease-out 1.0s both, float 6s ease-in-out infinite 1.5s",
          }}
        >
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
            <Image src="/favicon.png" alt="" width={24} height={24} />
            <div>
              <p className="font-bold text-[#171717] text-sm">
                {t("cardTitle")}
              </p>
              <p className="text-xs text-gray-400">zefile.io</p>
            </div>
          </div>
        </div>

        {/* Feature pills (desktop only) */}
        <div className="hidden lg:flex absolute bottom-8 left-8 right-8 flex-wrap gap-2 justify-center">
          {featurePills.map((key, i) => (
            <span
              key={key}
              className="px-4 py-2 rounded-full text-sm font-medium text-[#171717]/80"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.3)",
                backdropFilter: "blur(8px)",
                animation: `scaleIn 0.4s ease-out ${1.5 + i * 0.2}s both`,
              }}
            >
              {t(`pill.${key}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
