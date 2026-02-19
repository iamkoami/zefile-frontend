/**
 * JSON-LD Structured Data Components for SEO
 * Provides rich snippets in search results
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";

// Organization Schema - appears on all pages
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZeFile",
    url: SITE_URL,
    logo: `${SITE_URL}/zefile-logo.png`,
    description: "Secure file transfer platform with payment protection",
    foundingDate: "2026",
    sameAs: [
      "https://twitter.com/zefile",
      "https://linkedin.com/company/zefile",
      "https://facebook.com/zefile",
      "https://instagram.com/zefile",
      "https://tiktok.com/@zefile",
      "https://youtube.com/@zefile",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SITE_URL}/help`,
      availableLanguage: ["English", "French"],
    },
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Software Application Schema - for homepage
export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ZeFile",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    description:
      "Secure file transfer platform with payment protection. Send large files and get paid before recipients can download.",
    url: SITE_URL,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free plan with 2GB file transfers",
    },
    featureList: [
      "Secure file transfer up to 2GB (free)",
      "Payment protection before download",
      "Password-protected transfers",
      "Custom expiry dates",
      "Email notifications",
      "File preview with watermarks",
    ],
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebSite Schema with SearchAction - for homepage
export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ZeFile",
    url: SITE_URL,
    description: "Secure file transfer platform with payment protection",
    inLanguage: ["en", "fr"],
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ Schema - for pricing and help pages
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Breadcrumb Schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Product/Service Schema - for pricing page
interface PricingTier {
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
}

export function PricingJsonLd({ tiers }: { tiers: PricingTier[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "ZeFile Subscription Plans",
    description:
      "Secure file transfer subscription plans with payment protection",
    brand: {
      "@type": "Brand",
      name: "ZeFile",
    },
    offers: tiers.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: tier.description,
      price: tier.price,
      priceCurrency: tier.currency,
      availability: "https://schema.org/InStock",
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    })),
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// Article Schema - for blog posts
interface ArticleJsonLdProps {
  headline: string;
  datePublished: string;
  dateModified: string;
  author: string;
  image?: string;
  description: string;
  url: string;
}

export function ArticleJsonLd({
  headline,
  datePublished,
  dateModified,
  author,
  image,
  description,
  url,
}: ArticleJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    datePublished,
    dateModified,
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: "ZeFile",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/zefile-logo.png`,
      },
    },
    ...(image && {
      image: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
    }),
    description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// HowTo Schema - for how-it-works page
interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

export function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: HowToStep[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
