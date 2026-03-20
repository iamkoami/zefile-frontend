import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Help Center - Support & FAQ',
    description: 'Get help with ZeFile. Answers to your questions about file transfers, payments, account settings, and troubleshooting. Contact our support team.',
  },
  fr: {
    title: 'Centre d\'aide - Support et FAQ',
    description: 'Obtenez de l\'aide avec ZeFile. R\u00e9ponses \u00e0 vos questions sur les transferts, paiements et param\u00e8tres de compte. Contactez notre \u00e9quipe.',
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
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: 'ZeFile Help Center' }],
    },
    twitter: {
      card: 'summary_large_image',
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

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("pages.help");

  const faqs = [
    { question: t("faq1Q"), answer: t("faq1A") },
    { question: t("faq2Q"), answer: t("faq2A") },
    { question: t("faq3Q"), answer: t("faq3A") },
    { question: t("faq4Q"), answer: t("faq4A") },
    { question: t("faq5Q"), answer: t("faq5A") },
    { question: t("faq6Q"), answer: t("faq6A") },
    { question: t("faq7Q"), answer: t("faq7A") },
    { question: t("faq8Q"), answer: t("faq8A") },
    { question: t("faq9Q"), answer: t("faq9A") },
    { question: t("faq10Q"), answer: t("faq10A") },
    { question: t("faq11Q"), answer: t("faq11A") },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Help Center', url: `${SITE_URL}/help` },
      ]} />
      <FAQJsonLd faqs={faqs} />
      {children}
    </>
  );
}
