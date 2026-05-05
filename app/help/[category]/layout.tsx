import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  general: { en: "Getting started", fr: "Premiers pas" },
  download: { en: "Downloads", fr: "Téléchargements" },
  payment: { en: "Payments", fr: "Paiements" },
  payout: { en: "Payouts", fr: "Retraits" },
  account: { en: "Account & billing", fr: "Compte & facturation" },
  technical: { en: "Technical support", fr: "Support technique" },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const locale = await getLocale();
  const labels = CATEGORY_LABELS[category];
  if (!labels) return { title: "Help — ZeFile" };

  const label = labels[locale === "fr" ? "fr" : "en"];
  const title = locale === "fr"
    ? `${label} — Aide ZeFile`
    : `${label} — ZeFile Help`;
  const description = locale === "fr"
    ? `Articles d'aide ZeFile sur ${label.toLowerCase()}. Réponses, guides et bonnes pratiques pour utiliser la plateforme.`
    : `ZeFile help articles about ${label.toLowerCase()}. Answers, guides, and best practices for using the platform.`;

  const enUrl = `${SITE_URL}/help/${category}`;
  const frUrl = `${SITE_URL}/fr/help/${category}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: locale === "fr" ? frUrl : enUrl,
      type: "website",
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: label }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: locale === "fr" ? frUrl : enUrl,
      languages: {
        en: enUrl,
        fr: frUrl,
        "x-default": enUrl,
      },
    },
  };
}

export default function HelpCategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
