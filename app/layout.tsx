// Polyfill localStorage for SSR (must be first import)
import "@/lib/localStorage-polyfill";

import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import PostHogProvider from "@/components/providers/PostHogProvider";
import SentryProvider from "@/components/providers/SentryProvider";
import { OrganizationJsonLd, WebSiteJsonLd, WebApplicationJsonLd } from "@/components/seo/JsonLd";
import GlobalSideDrawer from "@/components/providers/GlobalSideDrawer";
import ToastContainer from "@/components/shared/Toast";
import ChatWidget from "@/components/shared/ChatWidget";
import CookieConsentBanner from "@/components/shared/CookieConsentBanner";
import "react-flagpack/dist/style.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metropolis font - Full weight pack
const metropolis = localFont({
  src: [
    {
      path: "../public/fonts/metropolis/Metropolis-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-metropolis",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

// Base URL for metadata
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

// SEO metadata by locale
const seoContent = {
  en: {
    title: 'ZeFile — Send Files & Get Paid Before Download',
    description: 'The file transfer platform where freelancers get paid before download. Send large files with payment protection, watermarked previews, and automatic expiry. Free up to 2 GB.',
    keywords: 'secure file transfer, send large files, payment protection, get paid before download, file sharing, sell files online, freelancer file delivery, file transfer for creatives, WeTransfer alternative, WeTransfer alternative for freelancers',
  },
  fr: {
    title: 'ZeFile — Envoyez vos fichiers, soyez payé avant le téléchargement',
    description: 'La plateforme de transfert de fichiers où les freelances sont payés avant le téléchargement. Envoyez de gros fichiers avec protection de paiement, aperçus en filigrane et expiration automatique. Gratuit jusqu\'à 2 Go.',
    keywords: 'transfert de fichiers sécurisé, envoyer gros fichiers, protection de paiement, payé avant téléchargement, partage de fichiers, vendre fichiers en ligne, livraison fichiers freelance, alternative WeTransfer',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const content = seoContent[locale as keyof typeof seoContent] || seoContent.en;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: content.title,
      template: '%s | ZeFile',
    },
    description: content.description,
    keywords: content.keywords,
    authors: [{ name: 'ZeFile', url: SITE_URL }],
    creator: 'ZeFile',
    publisher: 'ZeFile',
    robots: {
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      url: SITE_URL,
      siteName: 'ZeFile',
      title: content.title,
      description: content.description,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'ZeFile - Secure File Transfer Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: [`${SITE_URL}/og-image.png`],
      creator: '@zefile',
      site: '@zefile',
    },
    alternates: {
      canonical: SITE_URL,
      languages: {
        'x-default': SITE_URL,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.png', type: 'image/png' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      apple: '/favicon.png',
    },
    manifest: '/manifest.json',
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || undefined,
      other: {
        ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
          ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION }
          : {}),
      },
    },
    category: 'technology',
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || ''} />
        <link rel="preconnect" href="https://eu.i.posthog.com" />
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <WebApplicationJsonLd />
      </head>
      <body
        className={`${metropolis.variable} ${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        style={{ fontFamily: "var(--font-metropolis), system-ui, arial" }}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Suspense fallback={null}>
            <SentryProvider>
              <PostHogProvider>
                <ToastContainer />
                {children}
                <GlobalSideDrawer />
                <ChatWidget />
                <CookieConsentBanner />
              </PostHogProvider>
            </SentryProvider>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
