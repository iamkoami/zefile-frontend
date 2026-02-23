"use client";

import { useState, useEffect, useRef } from "react";
import { List, Xmark } from "iconoir-react";
import { useTranslations } from "next-intl";

interface TocSection {
  id: string;
  title: string;
  index: number;
}

interface MobileTocButtonProps {
  sections: TocSection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export default function MobileTocButton({
  sections,
  activeSection,
  onSectionClick,
  sentinelRef,
}: MobileTocButtonProps) {
  const t = useTranslations("legalLayout");
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Show button only after scrolling past the sentinel (PageHero)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Button visible when sentinel is NOT intersecting (scrolled past hero)
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelRef]);

  // Lock body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSectionClick = (sectionId: string) => {
    setIsOpen(false);
    // Small delay so overlay closes before scroll starts
    setTimeout(() => onSectionClick(sectionId), 150);
  };

  return (
    <div className="lg:hidden">
      {isVisible && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 rounded shadow-lg px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-[#171717]"
          aria-label={t("contents")}
        >
          <List className="w-4 h-4" />
          {t("contents")}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={panelRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] overflow-y-auto p-6 animate-[slideUp_0.3s_ease]"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-[#171717]">
                {t("tableOfContents")}
              </p>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <Xmark className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <ul className="space-y-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => handleSectionClick(section.id)}
                    className={`w-full text-left text-sm py-2 pl-3 pr-2 border-l-2 transition-colors ${
                      activeSection === section.id
                        ? "border-[#5E53E0] text-[#5E53E0] font-semibold"
                        : "border-transparent text-gray-500"
                    }`}
                  >
                    {section.index + 1}. {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
