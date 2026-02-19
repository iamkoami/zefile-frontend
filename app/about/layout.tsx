import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'About Us - Secure File Delivery Platform',
    description: 'Learn about ZeFile, the secure file transfer platform that protects creators and freelancers. Get paid before your files are downloaded. Our mission and story.',
  },
  fr: {
    title: 'À propos - Plateforme de livraison de fichiers sécurisée',
    description: 'Découvrez ZeFile, la plateforme de transfert de fichiers sécurisée qui protège les créateurs et freelances. Soyez payé avant que vos fichiers soient téléchargés.',
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
