import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Blog - ZeFile',
    description: 'Tips, comparisons, and guides for creative professionals. Learn about secure file transfer, getting paid for your work, and growing your creative business.',
  },
  fr: {
    title: 'Blog - ZeFile',
    description: 'Conseils, comparaisons et guides pour les cr\u00e9atifs. Transfert de fichiers s\u00e9curis\u00e9, mon\u00e9tisation de votre travail et croissance de votre activit\u00e9.',
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
      url: `${SITE_URL}/blog`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/blog`,
      languages: {
        'en': `${SITE_URL}/blog`,
        'fr': `${SITE_URL}/blog`,
        'x-default': `${SITE_URL}/blog`,
      },
    },
  };
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
      ]} />
      {children}
    </>
  );
}
