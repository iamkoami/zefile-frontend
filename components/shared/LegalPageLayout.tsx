"use client";

import { useMemo, useRef, useCallback, type ReactNode } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import TableOfContents from "@/components/shared/TableOfContents";
import MobileTocButton from "@/components/shared/MobileTocButton";
import { useActiveSection } from "@/hooks/useActiveSection";

interface LegalSection {
  title: string;
  content: string;
}

interface LegalPageLayoutProps {
  title: string | ReactNode;
  subtitle?: string;
  sections: LegalSection[];
}

export default function LegalPageLayout({
  title,
  subtitle,
  sections,
}: LegalPageLayoutProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sectionIds = useMemo(
    () => sections.map((_, i) => `section-${i}`),
    [sections],
  );

  const tocSections = useMemo(
    () =>
      sections.map((s, i) => ({
        id: `section-${i}`,
        title: s.title,
        index: i,
      })),
    [sections],
  );

  const activeSection = useActiveSection(sectionIds);

  const handleSectionClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero title={title} subtitle={subtitle} />

        {/* Sentinel for mobile TOC visibility */}
        <div ref={sentinelRef} className="h-0" />

        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="lg:flex lg:gap-10">
            {/* Desktop sidebar TOC */}
            <aside className="hidden lg:block lg:w-60 flex-shrink-0">
              <TableOfContents
                sections={tocSections}
                activeSection={activeSection}
                onSectionClick={handleSectionClick}
              />
            </aside>

            {/* Content column */}
            <div className="flex-1 max-w-4xl">
              <div className="space-y-8">
                {sections.map((section, index) => (
                  <section
                    key={index}
                    id={`section-${index}`}
                    className="bg-white rounded-2xl border border-gray-200 p-8 scroll-mt-8"
                  >
                    <h2 className="text-xl font-bold text-[#171717] mb-4">
                      {index + 1}. {section.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile floating TOC */}
        <MobileTocButton
          sections={tocSections}
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          sentinelRef={sentinelRef}
        />
      </main>

      <Footer />
    </div>
  );
}
