import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

const seoContent = {
  en: {
    title: 'My Downloads - ZeFile',
    description: 'View and manage your downloaded files on ZeFile. Access your download history and re-download files within the expiry period.',
  },
  fr: {
    title: 'Mes téléchargements - ZeFile',
    description: 'Consultez et gérez vos fichiers téléchargés sur ZeFile. Accédez à votre historique de téléchargements et re-téléchargez vos fichiers.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return {
    title: content.title,
    description: content.description,
    robots: {
      index: false, // User-specific page, should not be indexed
      follow: false,
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: `${SITE_URL}/downloads`,
    },
    alternates: {
      canonical: `${SITE_URL}/downloads`,
    },
  };
}

export default function DownloadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
