"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

interface ProfileCTAProps {
  handle: string;
  tier: string;
  hasFileRequests: boolean;
}

export default function ProfileCTA({
  handle,
  tier,
  hasFileRequests,
}: ProfileCTAProps) {
  const t = useTranslations("profile");

  // Starter+ with file requests enabled: "Request a delivery" linking to file request flow
  // FREE tier: "Contact me" using handle-based internal routing (no email exposed)
  const isPaidTier = tier !== "FREE" && hasFileRequests;

  if (isPaidTier) {
    return (
      <section className="flex justify-center">
        <Link
          href={`/deliver?creator=${encodeURIComponent(handle)}`}
          className="inline-flex items-center justify-center px-8 py-3 text-base font-medium bg-[#87E64B] text-[#171717] rounded hover:bg-[#78d43f] transition-colors"
        >
          {t("cta.requestDelivery")}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex justify-center">
      <Link
        href={`/contact-us?creator=${encodeURIComponent(handle)}`}
        className="inline-flex items-center justify-center px-8 py-3 text-base font-medium bg-[#87E64B] text-[#171717] rounded hover:bg-[#78d43f] transition-colors"
      >
        {t("cta.contactMe")}
      </Link>
    </section>
  );
}
