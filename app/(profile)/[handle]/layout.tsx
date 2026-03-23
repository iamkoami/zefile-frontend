import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { fetchPublicProfile } from "@/services/creators-public-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const locale = await getLocale();
  const profile = await fetchPublicProfile(handle);

  if (!profile) {
    return {
      title: "Profile Not Found - ZeFile",
      robots: "noindex,nofollow",
    };
  }

  const name = profile.name || `@${profile.handle}`;
  const specialty =
    locale === "fr"
      ? profile.specialtyFr || profile.specialtyEn
      : profile.specialtyEn || profile.specialtyFr;
  const bio =
    locale === "fr"
      ? profile.bioFr || profile.bioEn
      : profile.bioEn || profile.bioFr;

  const title = `${name} (@${profile.handle}) - ZeFile`;
  const description =
    specialty || (bio ? bio.substring(0, 160) : `${name} on ZeFile`);

  return {
    title,
    description,
    openGraph: {
      title: `${name} - ${specialty || "Creator"}`,
      description: bio ? bio.substring(0, 200) : description,
      type: "profile",
      url: `${SITE_URL}/@${profile.handle}`,
      ...(profile.profilePictureUrl && {
        images: [
          {
            url: profile.profilePictureUrl,
            width: 400,
            height: 400,
            alt: name,
          },
        ],
      }),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/@${profile.handle}`,
    },
    robots: profile.isIndexable ? "index,follow" : "noindex,nofollow",
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
