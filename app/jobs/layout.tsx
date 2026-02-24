import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://zefile.io';

export const metadata: Metadata = {
  title: 'Jobs',
  description: 'Career opportunities at ZeFile. Join our team building the future of secure file transfers.',
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: `${SITE_URL}/jobs`,
    languages: {
      'en': `${SITE_URL}/jobs`,
      'fr': `${SITE_URL}/jobs`,
      'x-default': `${SITE_URL}/jobs`,
    },
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Jobs', url: `${SITE_URL}/jobs` },
      ]} />
      {children}
    </>
  );
}
