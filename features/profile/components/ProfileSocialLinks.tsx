"use client";

import { useTranslations } from "next-intl";
import type { SocialLink } from "@/services/creators-api";
import {
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Tiktok,
  Facebook,
  Globe,
} from "@/utils/icons";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const platformIcons: Record<string, IconComponent> = {
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Tiktok,
  facebook: Facebook,
  website: Globe,
  // Platforms without a specific icon in our icon set use Globe as fallback
  behance: Globe,
  dribbble: Globe,
  soundcloud: Globe,
  spotify: Globe,
  pinterest: Globe,
};

interface ProfileSocialLinksProps {
  links: SocialLink[];
}

export default function ProfileSocialLinks({
  links,
}: ProfileSocialLinksProps) {
  const t = useTranslations("profile");

  return (
    <section>
      <h2 className="text-lg font-semibold text-[#171717] dark:text-white mb-3">
        {t("socialLinks.heading")}
      </h2>
      <div className="flex flex-wrap gap-3">
        {links.map((link, index) => {
          const Icon = platformIcons[link.platform] || Globe;
          const label =
            t(`socialLinks.${link.platform}` as Parameters<typeof t>[0]);

          return (
            <a
              key={`${link.platform}-${index}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={label}
              className="inline-flex items-center justify-center w-10 h-10 rounded bg-gray-100 text-gray-600 hover:bg-[#5E53E0] hover:text-white transition-colors dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-[#5E53E0] dark:hover:text-white"
            >
              <Icon width={20} height={20} />
            </a>
          );
        })}
      </div>
    </section>
  );
}
