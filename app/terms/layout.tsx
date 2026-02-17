import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Terms of Service - ZeFile',
    description: 'Read ZeFile\'s Terms of Service. Understand your rights and responsibilities when using our secure file transfer platform, including file sharing, payments, and account policies.',
  },
  fr: {
    title: 'Conditions d\'utilisation - ZeFile',
    description: 'Lisez les conditions d\'utilisation de ZeFile. Comprenez vos droits et responsabilités lors de l\'utilisation de notre plateforme de transfert de fichiers sécurisée.',
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
      url: `${SITE_URL}/terms`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/terms`,
    },
  };
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Terms of Service', url: `${SITE_URL}/terms` },
      ]} />
      {children}
    </>
  );
}
