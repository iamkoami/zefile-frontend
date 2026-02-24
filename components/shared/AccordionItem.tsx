"use client";

import { useState } from "react";

interface AccordionItemProps {
  question: string;
  answer: string;
}

export default function AccordionItem({ question, answer }: AccordionItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-[#F5F5F4] transition-colors duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-[15px] font-semibold text-[#171717] pr-4">
          {question}
        </span>
        <div
          className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg
            className="w-3.5 h-3.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div
        className="grid transition-all duration-400 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5">
            <div className="border-t border-black/[0.06] pt-3">
              <p className="text-sm text-gray-500 leading-relaxed">{answer}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
