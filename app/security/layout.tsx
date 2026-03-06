import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Security - Responsible Disclosure Policy',
    description: 'ZeFile takes security seriously. Learn about our responsible disclosure policy, how to report vulnerabilities, and our commitment to keeping your files safe.',
  },
  fr: {
    title: 'Securite - Politique de divulgation responsable',
    description: 'ZeFile prend la securite au serieux. Decouvrez notre politique de divulgation responsable, comment signaler des vulnerabilites, et notre engagement a proteger vos fichiers.',
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
      url: `${SITE_URL}/security`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/security`,
      languages: {
        'en': `${SITE_URL}/security`,
        'fr': `${SITE_URL}/security`,
        'x-default': `${SITE_URL}/security`,
      },
    },
  };
}

export default function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Security', url: `${SITE_URL}/security` },
      ]} />
      {children}
    </>
  );
}
