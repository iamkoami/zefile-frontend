"use client";

export const runtime = "edge";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import LoadingFullscreen from "@/components/LoadingFullscreen";
import AccordionItem from "@/components/shared/AccordionItem";
import { useTranslations } from "next-intl";

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

export default function HelpCenterPage() {
  const t = useTranslations("pages.help");
  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const sections = useMemo(
    () => [
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
    ],
    [t],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((s) => ({
        ...s,
        faqs: s.faqs.filter(
          (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.faqs.length > 0);
  }, [search, sections]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <LoadingFullscreen />;
  }

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

          {/* Search */}
          <div className="max-w-2xl mx-auto mb-14">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-12 pr-4 py-4 bg-white rounded-lg border border-gray-200 text-[15px] text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-colors"
              />
            </div>
          </div>

          {/* FAQ Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {filtered.map((section, sIdx) => (
              <div key={sIdx}>
                <h2 className="text-lg font-bold text-[#171717] mb-4">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {section.faqs.map((faq, fIdx) => (
                    <AccordionItem key={fIdx} question={faq.q} answer={faq.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-gray-500 mt-8">
              {t("noResults")}
            </p>
          )}

          {/* Contact */}
          <section className="mt-16 text-center">
            <h2 className="text-xl font-semibold text-[#171717] mb-3">
              {t("contactTitle")}
            </h2>
            <p className="text-gray-600">
              {t("contactContent")}{" "}
              <a
                href={`mailto:${t("contactEmail")}`}
                className="text-[#171717] underline font-medium"
              >
                {t("contactEmail")}
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
