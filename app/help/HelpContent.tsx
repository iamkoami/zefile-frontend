"use client";

import { useState, useMemo } from "react";
import AccordionItem from "@/components/shared/AccordionItem";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  faqs: FaqItem[];
}

interface HelpContentProps {
  sections: FaqSection[];
  searchPlaceholder: string;
  noResults: string;
  contactTitle: string;
  contactContent: string;
  contactEmail: string;
}

export default function HelpContent({
  sections,
  searchPlaceholder,
  noResults,
  contactTitle,
  contactContent,
  contactEmail,
}: HelpContentProps) {
  const [search, setSearch] = useState("");

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
    <>
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
            placeholder={searchPlaceholder}
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
          {noResults}
        </p>
      )}

      {/* Contact */}
      <section className="mt-16 text-center">
        <h2 className="text-xl font-semibold text-[#171717] mb-3">
          {contactTitle}
        </h2>
        <p className="text-gray-600">
          {contactContent}{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="text-[#171717] underline font-medium"
          >
            {contactEmail}
          </a>
        </p>
      </section>
    </>
  );
}
