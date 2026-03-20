"use client";

import type { ReactNode } from "react";

export default function PageHero({
  title,
  subtitle,
}: {
  title: string | ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#F3F0FF] via-[#FDFAF4] to-[#F0FFF4] dark:from-[#1a1530] dark:via-[#141218] dark:to-[#0f1a14]">
      <div className="max-w-4xl mx-auto px-6 py-24 md:py-36 text-center relative z-10">
        <h1 className="text-5xl md:text-7xl font-black text-[#171717] dark:text-white animate-[slideUp_0.8s_ease_0.1s_both]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg font-medium md:text-xl text-gray-500 dark:text-gray-400 mt-6 max-w-2xl mx-auto animate-[slideUp_0.8s_ease_0.3s_both]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#5E53E0]/[0.04] dark:bg-[#5E53E0]/[0.08] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#87E64B]/[0.06] dark:bg-[#87E64B]/[0.08] rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
    </section>
  );
}
