import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'About ZeFile - Secure File Delivery for Creatives',
    description: 'ZeFile is a secure file delivery platform made in Africa for creatives worldwide. Upload files, set a price, get paid before download.',
  },
  fr: {
    title: '\u00c0 propos de ZeFile - Livraison de fichiers s\u00e9curis\u00e9e pour les cr\u00e9atifs',
    description: 'ZeFile est une plateforme de livraison de fichiers s\u00e9curis\u00e9e, con\u00e7ue en Afrique pour les cr\u00e9atifs. Fixez un prix, soyez pay\u00e9 avant le t\u00e9l\u00e9chargement.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return {
    title: content.title,
    description: content.description,
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${SITE_URL}/about`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/about`,
      languages: {
        'en': `${SITE_URL}/about`,
        'fr': `${SITE_URL}/about`,
        'x-default': `${SITE_URL}/about`,
      },
    },
  };
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'About', url: `${SITE_URL}/about` },
      ]} />
      {children}
    </>
  );
}
