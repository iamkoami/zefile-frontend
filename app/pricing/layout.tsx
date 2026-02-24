import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BreadcrumbJsonLd, FAQJsonLd, OfferCatalogJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const pricingTiers = {
  en: [
    {
      name: 'Free',
      description: 'Send files up to 2GB with payment protection. No credit card required.',
      price: '0',
      priceCurrency: 'EUR',
      features: ['2GB per transfer', 'Up to 10 recipients', 'Payment protection', '7-day expiry', 'File preview with watermarks'],
    },
    {
      name: 'Starter',
      description: 'Larger transfers and longer storage for growing businesses.',
      price: '4.99',
      priceCurrency: 'EUR',
      billingPeriod: 'P1M',
      features: ['10GB per transfer', 'Up to 10 recipients', '30-day expiry', '7% platform fee', 'Priority email support'],
    },
    {
      name: 'Pro',
      description: 'Maximum capacity with custom branding for professionals.',
      price: '9.99',
      priceCurrency: 'EUR',
      billingPeriod: 'P1M',
      features: ['50GB per transfer', 'Up to 10 recipients', '90-day expiry', '5% platform fee', 'Custom branding', 'Priority support'],
    },
  ],
  fr: [
    {
      name: 'Gratuit',
      description: 'Envoyez des fichiers jusqu\'a 2 Go avec protection du paiement. Sans carte bancaire.',
      price: '0',
      priceCurrency: 'EUR',
      features: ['2 Go par transfert', 'Jusqu\'a 10 destinataires', 'Protection du paiement', 'Expiration 7 jours', 'Apercu avec filigrane'],
    },
    {
      name: 'Starter',
      description: 'Transferts plus volumineux et stockage prolonge pour les entreprises en croissance.',
      price: '4.99',
      priceCurrency: 'EUR',
      billingPeriod: 'P1M',
      features: ['10 Go par transfert', 'Jusqu\'a 10 destinataires', 'Expiration 30 jours', 'Frais de plateforme 7%', 'Support email prioritaire'],
    },
    {
      name: 'Pro',
      description: 'Capacite maximale avec personnalisation pour les professionnels.',
      price: '9.99',
      priceCurrency: 'EUR',
      billingPeriod: 'P1M',
      features: ['50 Go par transfert', 'Jusqu\'a 10 destinataires', 'Expiration 90 jours', 'Frais de plateforme 5%', 'Image de marque personnalisee', 'Support prioritaire'],
    },
  ],
};

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
      {
        question: 'Is there a free trial?',
        answer: 'Yes, the Pro plan includes a 7-day free trial so you can test all premium features before committing. No credit card required to start your trial.',
      },
      {
        question: 'What file types are supported?',
        answer: 'ZeFile supports images (JPEG, PNG, WEBP, GIF, SVG), videos (MP4, MOV, AVI, MKV), audio (MP3, WAV, FLAC, AAC), documents (PDF, DOCX, XLSX, PPTX), and archives (ZIP, RAR, 7Z). All files get watermarked previews for security.',
      },
      {
        question: 'What is the maximum file size?',
        answer: 'The maximum transfer size depends on your plan: 2GB on the Free plan, 10GB on Starter, and 50GB on Pro. Each transfer can include multiple files up to your plan limit.',
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
      {
        question: 'Y a-t-il un essai gratuit ?',
        answer: 'Oui, le forfait Pro inclut un essai gratuit de 7 jours pour tester toutes les fonctionnalit\u00e9s premium avant de vous engager. Aucune carte bancaire requise pour commencer.',
      },
      {
        question: 'Quels types de fichiers sont support\u00e9s ?',
        answer: 'ZeFile supporte les images (JPEG, PNG, WEBP, GIF, SVG), vid\u00e9os (MP4, MOV, AVI, MKV), audio (MP3, WAV, FLAC, AAC), documents (PDF, DOCX, XLSX, PPTX) et archives (ZIP, RAR, 7Z). Tous les fichiers disposent d\'un aper\u00e7u avec filigrane pour la s\u00e9curit\u00e9.',
      },
      {
        question: 'Quelle est la taille maximale des fichiers ?',
        answer: 'La taille maximale d\u00e9pend de votre forfait : 2 Go sur le forfait Gratuit, 10 Go sur Starter et 50 Go sur Pro. Chaque transfert peut inclure plusieurs fichiers jusqu\'\u00e0 la limite de votre forfait.',
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
      languages: {
        'en': `${SITE_URL}/pricing`,
        'fr': `${SITE_URL}/pricing`,
        'x-default': `${SITE_URL}/pricing`,
      },
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
  const tiers = pricingTiers[locale as keyof typeof pricingTiers] || pricingTiers.en;

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Pricing', url: `${SITE_URL}/pricing` },
      ]} />
      <FAQJsonLd faqs={content.faqs} />
      <OfferCatalogJsonLd tiers={tiers} />
      {children}
    </>
  );
}
