"use client";

import { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
}

export default function ContactFAQ({ faqs }: { faqs: FAQ[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3 md:space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="rounded-2xl bg-[#FFFFFF] transition-colors duration-300"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex items-center justify-between w-full px-6 md:px-8 py-5 md:py-6 text-left group"
            aria-expanded={openIndex === index}
          >
            <span className="text-base md:text-lg font-bold text-[#171717] pr-6">
              {faq.question}
            </span>
            <div
              className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            >
              <svg
                className="w-3.5 h-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>
          <div
            className="grid transition-all duration-400 ease-in-out"
            style={{
              gridTemplateRows: openIndex === index ? "1fr" : "0fr",
            }}
          >
            <div className="overflow-hidden">
              <div className="px-6 md:px-8 pb-6">
                <div className="border-t border-black/[0.06] pt-4">
                  <p className="text-sm font-medium md:text-[15px] text-gray-500 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
