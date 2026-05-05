import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Press - News & Media Resources',
    description: 'ZeFile press kit, news, and media resources. Get the latest updates on our secure file transfer platform built in Africa for creatives worldwide.',
  },
  fr: {
    title: 'Presse - Actualites & Ressources medias',
    description: 'Kit presse, actualites et ressources medias de ZeFile. Les dernieres informations sur notre plateforme de transfert de fichiers securise.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return {
    title: content.title,
    description: content.description,
    // Placeholder content — keep out of the index until a real press kit ships.
    robots: { index: false, follow: true },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${SITE_URL}/press`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: locale === 'fr' ? `${SITE_URL}/fr/press` : `${SITE_URL}/press`,
      languages: {
        'en': `${SITE_URL}/press`,
        'fr': `${SITE_URL}/fr/press`,
        'x-default': `${SITE_URL}/press`,
      },
    },
  };
}

export default function PressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Press', url: `${SITE_URL}/press` },
      ]} />
      {children}
    </>
  );
}
