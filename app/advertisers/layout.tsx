import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'Advertise on ZeFile - Reach Creative Professionals',
    description: 'Promote your brand on ZeFile. Reach thousands of creative professionals, freelancers, and businesses who transfer files daily. Advertising opportunities and rates.',
  },
  fr: {
    title: 'Publicité sur ZeFile - Atteignez les professionnels créatifs',
    description: 'Faites la promotion de votre marque sur ZeFile. Touchez des milliers de professionnels créatifs et freelances qui transfèrent des fichiers quotidiennement.',
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
      url: `${SITE_URL}/advertisers`,
      type: 'website',
    },
    twitter: {
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: `${SITE_URL}/advertisers`,
    },
  };
}

export default function AdvertisersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
