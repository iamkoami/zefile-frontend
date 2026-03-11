"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "iconoir-react";

type PageKey = "howItWorks" | "pricing" | "help" | "about" | "blog";

interface CrossLinksProps {
  exclude: PageKey;
}

const ALL_LINKS: { key: PageKey; href: string }[] = [
  { key: "howItWorks", href: "/how-it-works" },
  { key: "pricing", href: "/pricing" },
  { key: "help", href: "/help" },
  { key: "about", href: "/about" },
  { key: "blog", href: "/blog" },
];

export default function CrossLinks({ exclude }: CrossLinksProps) {
  const t = useTranslations("crossLinks");
  const links = ALL_LINKS.filter((l) => l.key !== exclude).slice(0, 3);

  return (
    <nav
      aria-label={t("sectionTitle")}
      className="max-w-6xl mx-auto px-6 pb-8"
    >
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
        {t("sectionTitle")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-1.5 p-5 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            <span className="flex items-center justify-between">
              <span className="text-base font-bold text-[#171717] group-hover:text-[#5E53E0] transition-colors">
                {t(`${link.key}.label`)}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#5E53E0] group-hover:translate-x-1 transition-all duration-200" />
            </span>
            <span className="text-xs text-gray-500 leading-relaxed">
              {t(`${link.key}.description`)}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
