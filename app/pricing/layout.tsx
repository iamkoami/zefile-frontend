import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd, FAQJsonLd, PricingJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Pricing Plans - Choose Your Perfect Plan',
    description: 'Compare ZeFile subscription plans: Free, Starter, and Pro. Get secure file transfers with payment protection. Free plan includes 2GB transfers. No credit card required.',
    faqs: [
      {
        question: 'How much does ZeFile cost?',
        answer: 'ZeFile offers a free plan with 2GB file transfers. Paid plans start at €4.99/month for Starter (10GB) and €9.99/month for Pro (50GB) with additional features like custom branding and priority support.',
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
    title: 'Tarifs - Choisissez votre forfait idéal',
    description: 'Comparez les forfaits ZeFile : Gratuit, Starter et Pro. Transferts de fichiers sécurisés avec protection du paiement. Le forfait gratuit inclut 2 Go. Sans carte bancaire.',
    faqs: [
      {
        question: 'Combien coûte ZeFile ?',
        answer: 'ZeFile propose un forfait gratuit avec des transferts de 2 Go. Les forfaits payants commencent à 4,99 €/mois pour Starter (10 Go) et 9,99 €/mois pour Pro (50 Go) avec des fonctionnalités supplémentaires.',
      },
      {
        question: 'Puis-je changer de forfait à tout moment ?',
        answer: 'Oui, vous pouvez passer à un forfait supérieur ou inférieur à tout moment. Lors d\'une mise à niveau, vous serez facturé de la différence au prorata. Lors d\'un passage à un forfait inférieur, le nouveau tarif s\'applique à votre prochain cycle de facturation.',
      },
      {
        question: 'Quels moyens de paiement acceptez-vous ?',
        answer: 'Nous acceptons toutes les principales cartes de crédit (Visa, Mastercard, American Express) et le Mobile Money (MTN, Orange, Moov) pour les utilisateurs des pays africains supportés.',
      },
    ],
  },
};

const pricingTiers = [
  {
    name: 'Free',
    description: 'Basic file transfer with 2GB limit',
    price: 0,
    currency: 'EUR',
    features: ['2GB file transfers', 'Email notifications', '14-day expiry'],
  },
  {
    name: 'Starter',
    description: 'Professional file transfer with 10GB limit',
    price: 4.99,
    currency: 'EUR',
    features: ['10GB file transfers', 'Custom branding', '30-day expiry', 'Priority support'],
  },
  {
    name: 'Pro',
    description: 'Enterprise file transfer with 50GB limit',
    price: 9.99,
    currency: 'EUR',
    features: ['50GB file transfers', 'Custom domain', '90-day expiry', 'API access', 'Dedicated support'],
  },
];

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
      <PricingJsonLd tiers={pricingTiers} />
      {children}
    </>
  );
}
