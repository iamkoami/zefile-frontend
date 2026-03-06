export const runtime = "edge";

import type { ReactNode } from "react";
import Link from "next/link";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import CrossLinks from "@/components/shared/CrossLinks";
import PageHero from "@/components/shared/PageHero";
import HelpContent from "./HelpContent";
import { getTranslations } from "next-intl/server";

function BrandCross({
  size = 80,
  color = "#87E64B",
  opacity = 0.15,
  rotate = 0,
  className = "",
}: {
  size?: number;
  color?: string;
  opacity?: number;
  rotate?: number;
  className?: string;
}) {
  const bar = size * 0.3;
  const r = size * 0.08;
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          width: "100%",
          height: bar,
          marginTop: -(bar / 2),
          backgroundColor: color,
          opacity,
          borderRadius: r,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          height: "100%",
          width: bar,
          marginLeft: -(bar / 2),
          backgroundColor: color,
          opacity,
          borderRadius: r,
        }}
      />
    </div>
  );
}

export default async function HelpCenterPage() {
  const t = await getTranslations("pages.help");
  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  const sections = [
    {
      title: t("gettingStartedTitle"),
      faqs: [
        { q: t("faq1Q"), a: t("faq1A") },
        { q: t("faq2Q"), a: t("faq2A") },
        { q: t("faq3Q"), a: t("faq3A") },
      ],
    },
    {
      title: t("transfersTitle"),
      faqs: [
        { q: t("faq4Q"), a: t("faq4A") },
        { q: t("faq5Q"), a: t("faq5A") },
        { q: t("faq6Q"), a: t("faq6A") },
      ],
    },
    {
      title: t("paymentsTitle"),
      faqs: [
        { q: t("faq7Q"), a: t("faq7A") },
        { q: t("faq8Q"), a: t("faq8A") },
        { q: t("faq9Q"), a: t("faq9A") },
      ],
    },
    {
      title: t("securityTitle"),
      faqs: [
        { q: t("faq10Q"), a: t("faq10A") },
        { q: t("faq11Q"), a: t("faq11A") },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1 overflow-x-clip">
        <PageHero title={t.rich("title", { highlight })} subtitle={t("subtitle")} />

        <div className="max-w-5xl mx-auto px-6 py-16 relative">
          <BrandCross
            size={120}
            color="#87E64B"
            opacity={0.07}
            rotate={15}
            className="absolute top-4 right-0 hidden md:block"
          />
          <BrandCross
            size={70}
            color="#5E53E0"
            opacity={0.08}
            rotate={-12}
            className="absolute top-[30%] left-0 hidden lg:block"
          />
          <BrandCross
            size={50}
            color="#87E64B"
            opacity={0.09}
            rotate={25}
            className="absolute bottom-[25%] right-2 hidden md:block"
          />
          <BrandCross
            size={90}
            color="#5E53E0"
            opacity={0.06}
            rotate={-20}
            className="absolute bottom-[8%] left-[6%] hidden lg:block"
          />

          <HelpContent
            sections={sections}
            searchPlaceholder={t("searchPlaceholder")}
            noResults={t("noResults")}
            contactTitle={t("contactTitle")}
            contactContent={t("contactContent")}
            contactEmail={t("contactEmail")}
          />
        </div>
      </main>

      {/* Cross-links */}
      <CrossLinks exclude="help" />

      {/* CTA */}
      <section className="w-full max-w-6xl mx-auto px-6 pb-20 md:pb-28 pt-4">
        <div className="bg-[#87E64B] rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-28 rounded-3xl bg-white/15 rotate-12 pointer-events-none" />
          <div className="absolute -bottom-8 -left-4 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute top-1/2 right-[15%] w-16 h-16 rounded-full bg-white/[0.08] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-[#171717] mb-4">
              {t.rich("ctaTitle", {
                highlight: (chunks: ReactNode) => (
                  <span className="ze-highlight-purple">{chunks}</span>
                ),
              })}
            </h2>
            <p className="text-[#171717]/70 font-medium text-base md:text-lg mb-10 max-w-2xl mx-auto">
              {t("ctaSubtext")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/"
                className="bg-[#171717] text-white px-8 py-3.5 rounded font-bold text-lg hover:bg-[#2a2a2a] transition-colors"
              >
                {t("ctaButton")}
              </Link>
              <Link
                href="/pricing"
                className="text-[#171717] font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
              >
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
