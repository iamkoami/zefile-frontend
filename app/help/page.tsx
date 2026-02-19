"use client";

export const runtime = "edge";

import { useState, useMemo } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import { useTranslations } from "next-intl";

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left group"
      >
        <span className="text-[15px] text-[#171717] group-hover:text-[#5E53E0] transition-colors pr-4">
          {question}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-4 pr-8">
            <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HelpCenterPage() {
  const t = useTranslations("pages.help");
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h1 className="text-5xl md:text-6xl font-bold text-[#171717] text-center mb-3">
            {t("title")}
          </h1>
          <p className="text-lg text-gray-600 text-center mb-10">
            {t("subtitle")}
          </p>

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
                className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 text-[15px] text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#5E53E0] focus:ring-1 focus:ring-[#5E53E0] transition-colors"
              />
            </div>
          </div>

          {/* FAQ Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {filtered.map((section, sIdx) => (
              <div key={sIdx}>
                <h2 className="text-lg font-bold text-[#171717] mb-2">
                  {section.title}
                </h2>
                <div>
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
                className="text-[#5E53E0] hover:underline font-medium"
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
