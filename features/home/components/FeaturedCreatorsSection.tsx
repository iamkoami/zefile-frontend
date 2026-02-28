"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { platformApi, FeaturedCreator } from "@/services/platform-api";
import {
  trackCreatorSectionViewed,
  trackCreatorSocialLinkClicked,
} from "@/lib/posthog";

const SocialIcon: React.FC<{
  type: string;
  url: string;
  creatorId?: string;
}> = ({ type, url, creatorId }) => {
  const iconPaths: Record<string, string> = {
    instagram:
      "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    behance:
      "M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.332-1.761-1.753-2.066-2.441-2.066-.958 0-2.14.453-2.524 2.066zM1 18.5h5.304c3.766 0 5.784-1.725 5.784-4.512 0-1.736-.755-3.175-2.695-3.675C10.903 9.893 11.6 8.88 11.6 7.4c0-2.475-1.893-3.9-5.143-3.9H1v15zm3-7h2.586c1.68 0 2.77.718 2.77 2.03 0 1.39-1.18 2.1-2.78 2.1H4v-4.13zm0-4.74h2.23c1.25 0 2.16.518 2.16 1.73 0 1.37-.83 1.93-2.23 1.93H4V6.76z",
    twitter:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
    portfolio:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
  };

  const path = iconPaths[type];
  if (!path) return null;

  const handleClick = () => {
    if (creatorId) {
      trackCreatorSocialLinkClicked(creatorId, type);
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-400 hover:text-[#5E53E0] transition-colors"
      aria-label={type}
      onClick={handleClick}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="inline-block"
      >
        <path d={path} />
      </svg>
    </a>
  );
};

const CompactCreatorItem: React.FC<{ creator: FeaturedCreator }> = ({ creator }) => {
  const initials = creator.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
        {creator.photoUrl ? (
          <Image
            src={creator.photoUrl}
            alt={creator.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#5E53E0]/10 text-[#5E53E0] font-semibold text-xs">
            {initials}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500 truncate max-w-[80px] text-center">
        {creator.name.split(" ")[0]}
      </span>
    </div>
  );
};

const CreatorCard: React.FC<{ creator: FeaturedCreator }> = ({ creator }) => {
  const initials = creator.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded shadow-sm border border-gray-100 min-w-[140px]">
      {/* Photo */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-100 mb-3 flex-shrink-0">
        {creator.photoUrl ? (
          <Image
            src={creator.photoUrl}
            alt={creator.name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#5E53E0]/10 text-[#5E53E0] font-bold text-lg">
            {initials}
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-[#171717] text-center truncate w-full">
        {creator.name}
      </p>

      {/* Role */}
      {creator.role && (
        <p className="text-xs text-gray-500 text-center truncate w-full mt-0.5">
          {creator.role}
        </p>
      )}

      {/* Social Links */}
      {creator.socialLinks && Object.keys(creator.socialLinks).length > 0 && (
        <div className="flex items-center gap-2 mt-2">
          {Object.entries(creator.socialLinks).map(([type, url]) =>
            url ? (
              <SocialIcon
                key={type}
                type={type}
                url={url}
                creatorId={creator.id}
              />
            ) : null,
          )}
        </div>
      )}
    </div>
  );
};

interface FeaturedCreatorsSectionProps {
  variant?: "full" | "compact";
}

const FeaturedCreatorsSection: React.FC<FeaturedCreatorsSectionProps> = ({
  variant = "full",
}) => {
  const t = useTranslations("featuredCreators");
  const [creators, setCreators] = useState<FeaturedCreator[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    platformApi
      .getFeaturedCreators()
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setCreators(res.data);
        }
      })
      .catch(() => {
        // Non-critical, silently fail
      });
  }, []);

  // Track section viewed via IntersectionObserver (fire once per page view)
  useEffect(() => {
    if (creators.length === 0) return;
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackCreatorSectionViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [creators]);

  if (creators.length === 0) return null;

  if (variant === "compact") {
    return (
      <div ref={sectionRef} className="border-t border-gray-100 py-4 mt-6">
        <p className="text-xs text-gray-400 text-center mb-3">
          {t("heading")}
        </p>
        <div className="flex items-start justify-center gap-4 flex-wrap">
          {creators.slice(0, 6).map((creator) => (
            <CompactCreatorItem key={creator.id} creator={creator} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <h3 className="text-lg font-bold text-[#171717] text-center mb-8">
          {t("heading")}
        </h3>

        {/* Desktop grid / Mobile scroll */}
        <div className="hidden sm:grid sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>

        {/* Mobile horizontal scroll */}
        <div className="sm:hidden overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {creators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCreatorsSection;
