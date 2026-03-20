import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Security at ZeFile - How We Protect Your Files',
    description: 'ZeFile takes security seriously. Learn how we protect your files, our responsible disclosure policy, and how to report vulnerabilities.',
  },
  fr: {
    title: 'Securite chez ZeFile - Comment nous protegeons vos fichiers',
    description: 'ZeFile prend la securite au serieux. Decouvrez comment nous protegeon vos fichiers, notre politique de divulgation responsable et comment signaler des vulnerabilites.',
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
