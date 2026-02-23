import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

export const metadata: Metadata = {
  title: 'Press',
  description: 'ZeFile press kit, news, and media resources. Get the latest updates on our secure file transfer platform.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE_URL}/press`,
  },
};

export default function PressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Press', url: `${SITE_URL}/press` },
      ]} />
      {children}
    </>
  );
}
