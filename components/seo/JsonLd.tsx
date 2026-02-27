/**
 * JSON-LD Structured Data Components for SEO
 * Provides rich snippets in search results
 *
 * Schema graph uses @id linking:
 *   Organization (#org) ← WebSite (#website) ← WebApplication (#app)
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zefile.io";

// Organization Schema - appears on all pages via root layout
export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "ZeFile",
    url: SITE_URL,
    logo: `${SITE_URL}/zefile-logo.png`,
    description: "Secure file transfer platform with payment protection",
    foundingDate: "2026",
    sameAs: [
      "https://x.com/zefilehq",
      "https://linkedin.com/company/zefilehq",
      "https://facebook.com/zefilehq",
      "https://instagram.com/zefilehq",
      "https://threads.net/@zefilehq",
      "https://tiktok.com/@zefilehq",
      "https://youtube.com/@zefilehq",
    ],
    email: "support@zefile.io",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "support@zefile.io",
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

// WebSite Schema - homepage only
export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "ZeFile",
    url: SITE_URL,
    description: "Secure file transfer platform with payment protection",
    inLanguage: ["en", "fr"],
    publisher: { "@id": `${SITE_URL}/#org` },
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebApplication Schema - homepage only (replaces SoftwareApplication)
export function WebApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: "ZeFile",
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    browserRequirements: "Requires a modern web browser",
    description:
      "Secure file transfer platform with payment protection. Send large files and get paid before recipients can download.",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "9.99",
      priceCurrency: "EUR",
      offerCount: 3,
    },
    featureList: [
      "Secure file transfer up to 2GB (free)",
      "Payment protection before download",
      "Password-protected transfers",
      "Custom expiry dates",
      "Email notifications",
      "File preview with watermarks",
    ],
    provider: { "@id": `${SITE_URL}/#org` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQ Schema - for pricing page
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

// Product/Offer Catalog Schema - for pricing page
interface PricingTier {
  name: string;
  description: string;
  price: string;
  priceCurrency: string;
  billingPeriod?: string;
  features: string[];
}

export function OfferCatalogJsonLd({ tiers }: { tiers: PricingTier[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "ZeFile Plans",
    itemListElement: tiers.map((tier) => ({
      "@type": "Offer",
      name: tier.name,
      description: tier.description,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: tier.price,
        priceCurrency: tier.priceCurrency,
        ...(tier.billingPeriod && { billingDuration: tier.billingPeriod }),
        unitText: tier.billingPeriod ? "MONTH" : undefined,
      },
      seller: { "@id": `${SITE_URL}/#org` },
      itemOffered: {
        "@type": "Service",
        name: `ZeFile ${tier.name}`,
        description: tier.description,
        provider: { "@id": `${SITE_URL}/#org` },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Features",
          itemListElement: tier.features.map((f) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: f },
          })),
        },
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
    publisher: { "@id": `${SITE_URL}/#org` },
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
