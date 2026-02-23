import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Pricing Plans - Choose Your Perfect Plan',
    description: 'Compare ZeFile subscription plans: Free, Starter, and Pro. Get secure file transfers with payment protection. Free plan includes 2GB transfers. No credit card required.',
    faqs: [
      {
        question: 'How much does ZeFile cost?',
        answer: 'ZeFile offers a free plan with 2GB file transfers. Paid plans start at \u20ac4.99/month for Starter (10GB) and \u20ac9.99/month for Pro (50GB) with additional features like custom branding and priority support.',
      },
      {
        question: 'Can I change my plan at any time?',
        answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, the new rate applies at your next billing cycle.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and Mobile Money (MTN, Orange, Moov) for users in supported African countries.',
      },
    ],
  },
  fr: {
    title: 'Tarifs - Choisissez votre forfait id\u00e9al',
    description: 'Comparez les forfaits ZeFile : Gratuit, Starter et Pro. Transferts de fichiers s\u00e9curis\u00e9s avec protection du paiement. Le forfait gratuit inclut 2 Go. Sans carte bancaire.',
    faqs: [
      {
        question: 'Combien co\u00fbte ZeFile ?',
        answer: 'ZeFile propose un forfait gratuit avec des transferts de 2 Go. Les forfaits payants commencent \u00e0 4,99 \u20ac/mois pour Starter (10 Go) et 9,99 \u20ac/mois pour Pro (50 Go) avec des fonctionnalit\u00e9s suppl\u00e9mentaires.',
      },
      {
        question: 'Puis-je changer de forfait \u00e0 tout moment ?',
        answer: 'Oui, vous pouvez passer \u00e0 un forfait sup\u00e9rieur ou inf\u00e9rieur \u00e0 tout moment. Lors d\'une mise \u00e0 niveau, vous serez factur\u00e9 de la diff\u00e9rence au prorata. Lors d\'un passage \u00e0 un forfait inf\u00e9rieur, le nouveau tarif s\'applique \u00e0 votre prochain cycle de facturation.',
      },
      {
        question: 'Quels moyens de paiement acceptez-vous ?',
        answer: 'Nous acceptons toutes les principales cartes de cr\u00e9dit (Visa, Mastercard, American Express) et le Mobile Money (MTN, Orange, Moov) pour les utilisateurs des pays africains support\u00e9s.',
      },
    ],
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
      url: `${SITE_URL}/pricing`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/pricing`,
    },
  };
}

export default async function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Pricing', url: `${SITE_URL}/pricing` },
      ]} />
      <FAQJsonLd faqs={content.faqs} />
      {children}
    </>
  );
}
