import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Privacy Policy',
    description: 'Read ZeFile\'s Privacy Policy. Learn how we collect, use, and protect your data when you use our secure file transfer platform. GDPR compliant.',
  },
  fr: {
    title: 'Politique de confidentialité',
    description: 'Lisez la politique de confidentialité de ZeFile. Découvrez comment nous collectons, utilisons et protégeons vos données. Conforme au RGPD.',
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
      url: `${SITE_URL}/privacy`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/privacy`,
    },
  };
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Privacy Policy', url: `${SITE_URL}/privacy` },
      ]} />
      {children}
    </>
  );
}
