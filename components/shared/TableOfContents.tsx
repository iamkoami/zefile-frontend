"use client";

import { useTranslations } from "next-intl";

interface TocSection {
  id: string;
  title: string;
  index: number;
}

interface TableOfContentsProps {
  sections: TocSection[];
  activeSection: string | null;
  onSectionClick: (sectionId: string) => void;
}

export default function TableOfContents({
  sections,
  activeSection,
  onSectionClick,
}: TableOfContentsProps) {
  const t = useTranslations("legalLayout");

  return (
    <nav aria-label={t("tableOfContents")} className="sticky top-8">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
        {t("tableOfContents")}
      </p>
      <ul className="space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {sections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => onSectionClick(section.id)}
              aria-current={activeSection === section.id ? "true" : undefined}
              className={`w-full text-left text-sm py-1.5 pl-3 pr-2 border-l-2 transition-colors ${
                activeSection === section.id
                  ? "border-[#5E53E0] text-[#5E53E0] font-bold"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {section.index + 1}. {section.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
