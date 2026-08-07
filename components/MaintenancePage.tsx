"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Lottie from "lottie-react";
import { RefreshDouble } from "iconoir-react";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import useTimeOfDay from "@/hooks/useTimeOfDay";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";

interface MaintenancePageProps {
  message?: string;
  estimate?: string;
}

export default function MaintenancePage({
  message,
  estimate,
}: MaintenancePageProps) {
  const t = useTranslations("maintenance");
  const { timeOfDay } = useTimeOfDay();
  const [logoAnimation, setLogoAnimation] = useState<object | null>(null);

  useEffect(() => {
    import("@/public/lotties/zefile_logo.json").then((m) =>
      setLogoAnimation(m.default),
    );
  }, []);

  const bgColor =
    timeOfDay === "day"
      ? "#b5e8ff"
      : timeOfDay === "evening"
        ? "#f9f4f0"
        : "#050036";

  const textColor = timeOfDay === "night" ? "#ffffff" : "#171717";
  const subtextColor = timeOfDay === "night" ? "#9ca3af" : "#6b7280";

  return (
    <div
      className="min-h-screen relative overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: bgColor }}
    >
      {/* Minimal header: logo + language toggle */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ animationDelay: "0s", animationDuration: "0.3s" }}
      >
        <div className="flex items-center gap-2">
          {/* width/height are the artwork's intrinsic 371x90 viewBox, not the rendered
              size — the class sets the height and lets the width follow. The previous
              125x24 was a box shaped for the older logo, so the current artwork never
              filled it. Height is unchanged at 24px. */}
          <Image
            src={
              timeOfDay === "night"
                ? "/zefile-logo-white.svg"
                : "/zefile-logo.svg"
            }
            alt="ZeFile"
            width={371}
            height={90}
            className="pt-1 h-6 w-auto"
            style={{ animation: "fadeIn 0.3s ease-out both" }}
          />
        </div>
        <div style={{ animation: "fadeIn 0.3s ease-out both" }}>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Background logo (desktop only, decorative) */}
      <div
        className="hidden lg:block absolute pointer-events-none select-none"
        style={{
          right: "-35%",
          top: "-50%",
          width: "1200px",
          height: "1200px",
          opacity: 0.2,
          transform: "rotate(19deg)",
        }}
      >
        {logoAnimation && (
          <Lottie
            animationData={logoAnimation}
            loop={true}
            autoplay={true}
            className="ze-lottie-container"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>

      {/* Time-of-day ambient background */}
      <div className="absolute top-0 right-0 pointer-events-none select-none opacity-30">
        <TimeOfDayBackground timeOfDay={timeOfDay} />
      </div>

      {/* Main content */}
      <main
        className="relative z-10 flex flex-col items-center justify-center px-4"
        style={{ minHeight: "calc(100vh - 72px)" }}
      >
        {/* Lottie logo animation */}
        <div
          className="mb-6"
          style={{ animation: "scaleIn 0.5s ease-out 0.2s both" }}
        >
          {logoAnimation && (
            <Lottie
              animationData={logoAnimation}
              loop={true}
              autoplay={true}
              className="ze-lottie-container"
              style={{ width: 120, height: 120 }}
            />
          )}
        </div>

        {/* Headline */}
        <h1
          className="text-2xl md:text-3xl font-bold text-center mb-3"
          style={{
            color: textColor,
            animation: "slideUp 0.8s ease-out 0.4s both",
          }}
        >
          {message || t("headline")}
        </h1>

        {/* Subtitle */}
        <p
          className="text-center max-w-md font-medium mb-6"
          style={{
            color: subtextColor,
            animation: "slideUp 0.8s ease-out 0.6s both",
          }}
        >
          {t("subtitle")}
        </p>

        {/* Estimated return card */}
        {estimate && (
          <div
            className="px-6 py-4 rounded-xl mb-6 text-center"
            style={{
              backgroundColor: "#FDFAF4",
              animation: "fadeIn 0.5s ease-out 0.8s both",
            }}
          >
            <p className="text-sm font-medium text-gray-500">
              {t("estimatedReturn")}
            </p>
            <p className="font-bold text-[#171717] mt-1">{estimate}</p>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded font-bold transition-colors hover:bg-white/50"
          style={{
            color: textColor,
            animation: "fadeIn 0.5s ease-out 1.0s both",
          }}
        >
          <RefreshDouble className="w-4 h-4" />
          {t("refresh")}
        </button>

        {/* Contact line */}
        <p
          className="mt-8 text-sm font-medium"
          style={{
            color: subtextColor,
            animation: "fadeIn 0.3s ease-out 1.2s both",
          }}
        >
          {t("contact")}{" "}
          <a
            href="mailto:hello@zefile.io"
            className="text-[#5E53E0] hover:underline"
          >
            hello@zefile.io
          </a>
        </p>
      </main>
    </div>
  );
}
