import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Careers at ZeFile - Join Our Team',
    description: 'Career opportunities at ZeFile. Join our team building the future of secure file transfers and payment-gated delivery for creatives.',
  },
  fr: {
    title: 'Carrieres chez ZeFile - Rejoignez notre equipe',
    description: 'Opportunites de carriere chez ZeFile. Rejoignez notre equipe et construisez l\'avenir du transfert de fichiers securise pour les creatifs.',
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
      url: `${SITE_URL}/jobs`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/jobs`,
      languages: {
        'en': `${SITE_URL}/jobs`,
        'fr': `${SITE_URL}/jobs`,
        'x-default': `${SITE_URL}/jobs`,
      },
    },
  };
}

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Careers', url: `${SITE_URL}/jobs` },
      ]} />
      {children}
    </>
  );
}
