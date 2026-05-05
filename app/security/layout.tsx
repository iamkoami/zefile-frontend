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
    title: 'Sécurité chez ZeFile — Comment nous protégeons vos fichiers',
    description: 'Comment ZeFile protège vos fichiers et vos paiements : chiffrement, filigrane, divulgation responsable. Signalez une vulnérabilité.',
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
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Security at ZeFile',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: [`${SITE_URL}/og-image.png`],
    },
    alternates: {
      canonical: locale === 'fr' ? `${SITE_URL}/fr/security` : `${SITE_URL}/security`,
      languages: {
        'en': `${SITE_URL}/security`,
        'fr': `${SITE_URL}/fr/security`,
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
