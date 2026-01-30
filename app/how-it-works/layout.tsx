import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'How ZeFile Works - Send Files with Payment Guarantee',
    description: 'Learn how to use ZeFile in 3 simple steps: Upload files, set your price, share the link. Your recipients pay before downloading. Secure and simple file transfer.',
  },
  fr: {
    title: 'Comment fonctionne ZeFile - Envoyez des fichiers avec garantie de paiement',
    description: 'Découvrez comment utiliser ZeFile en 3 étapes simples : Téléversez vos fichiers, fixez votre prix, partagez le lien. Vos destinataires paient avant de télécharger.',
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
      url: `${SITE_URL}/how-it-works`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/how-it-works`,
    },
  };
}

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
