import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
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
      path: "../public/fonts/metropolis/Metropolis-ExtraBold.woff",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/metropolis/Metropolis-Black.woff",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-metropolis",
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "ZeFile - Partage de fichiers sécurisé",
  description: "Partagez vos fichiers en toute sécurité avec ZeFile",
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/favicon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${metropolis.variable} ${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        style={{ fontFamily: "var(--font-metropolis), system-ui, arial" }}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
