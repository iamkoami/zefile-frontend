"use client";

import { useState, useEffect, useCallback } from "react";

interface Section {
  id: string;
  label: string;
}

interface SectionIndicatorProps {
  sections: readonly Section[];
}

export default function SectionIndicator({ sections }: SectionIndicatorProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      // Find the most visible section
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        setActiveSection(visible[0].target.id);
      }
    },
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.3,
      rootMargin: "-10% 0px -10% 0px",
    });

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, handleObserver]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-3">
      {sections.map(({ id, label }) => {
        const isActive = activeSection === id;
        return (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className="group relative flex items-center"
            aria-label={`Jump to ${label}`}
          >
            {/* Tooltip */}
            <span className="absolute right-full mr-3 px-2.5 py-1 text-xs font-medium text-white bg-[#171717] dark:bg-white dark:text-[#171717] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              {label}
            </span>
            {/* Dot */}
            <span
              className={`rounded-full transition-all duration-200 ${
                isActive
                  ? "w-2.5 h-2.5 bg-[#171717] dark:bg-white"
                  : "w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-500 dark:group-hover:bg-gray-400"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
