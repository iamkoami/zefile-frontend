"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

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
      aria-label="Related pages"
      className="max-w-6xl mx-auto px-6 pb-8"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex flex-col gap-1 p-5 rounded-xl border border-gray-200 bg-white hover:border-[#5E53E0]/30 hover:shadow-sm transition-all"
          >
            <span className="text-sm font-semibold text-[#171717] group-hover:text-[#5E53E0] transition-colors">
              {t(`${link.key}.label`)}
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
