"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Lottie from "lottie-react";
import useTimeOfDay from "@/hooks/useTimeOfDay";
import TimeOfDayBackground from "@/components/shared/TimeOfDayBackground";

interface ProfileNotFoundProps {
  heading: string;
  description: string;
  backLabel: string;
}

export default function ProfileNotFound({
  heading,
  description,
  backLabel,
}: ProfileNotFoundProps) {
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
      {/* Header */}
      <header className="flex items-center px-6 py-4">
        <Link href="/">
          <Image
            src={
              timeOfDay === "night"
                ? "/zefile-logo-white.svg"
                : "/zefile-logo.svg"
            }
            alt="ZeFile"
            width={125}
            height={24}
            className="pt-1"
            style={{ animation: "fadeIn 0.3s ease-out both" }}
          />
        </Link>
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
              style={{ width: 100, height: 100 }}
            />
          )}
        </div>

        {/* Heading */}
        <h1
          className="text-2xl md:text-3xl font-bold text-center mb-3"
          style={{
            color: textColor,
            animation: "slideUp 0.8s ease-out 0.4s both",
          }}
        >
          {heading}
        </h1>

        {/* Description */}
        <p
          className="text-center max-w-md font-medium mb-8"
          style={{
            color: subtextColor,
            animation: "slideUp 0.8s ease-out 0.6s both",
          }}
        >
          {description}
        </p>

        {/* Back home button */}
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-[#87E64B] text-[#171717] rounded hover:bg-[#78d43f] transition-colors"
          style={{ animation: "fadeIn 0.5s ease-out 0.8s both" }}
        >
          {backLabel}
        </Link>
      </main>
    </div>
  );
}
