import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Help Center - ZeFile Support & FAQ',
    description: 'Get help with ZeFile. Find answers to frequently asked questions about file transfers, payments, account settings, and troubleshooting. Contact our support team.',
  },
  fr: {
    title: 'Centre d\'aide - Support et FAQ ZeFile',
    description: 'Obtenez de l\'aide avec ZeFile. Trouvez des réponses aux questions fréquentes sur les transferts de fichiers, paiements, paramètres de compte. Contactez notre équipe.',
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
      url: `${SITE_URL}/help`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/help`,
      languages: {
        'en': `${SITE_URL}/help`,
        'fr': `${SITE_URL}/help`,
        'x-default': `${SITE_URL}/help`,
      },
    },
  };
}

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Help Center', url: `${SITE_URL}/help` },
      ]} />
      {children}
    </>
  );
}
