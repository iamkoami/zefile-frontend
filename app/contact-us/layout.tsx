import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Contact Us - Get in Touch with ZeFile',
    description: 'Have a question or need help? Reach out to the ZeFile team. We\'re here to help with file transfers, payments, partnerships, and more.',
  },
  fr: {
    title: 'Contactez-nous - ZeFile',
    description: 'Une question ou besoin d\'aide ? Contactez l\'\u00e9quipe ZeFile. Nous sommes l\u00e0 pour vous aider avec vos transferts de fichiers, paiements, partenariats et plus.',
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
      url: `${SITE_URL}/contact-us`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/contact-us`,
    },
  };
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Contact', url: `${SITE_URL}/contact-us` },
      ]} />
      {children}
    </>
  );
}
