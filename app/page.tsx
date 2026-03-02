export const runtime = "edge";

import { getTranslations } from "next-intl/server";
import { FAQJsonLd } from "@/components/seo/JsonLd";
import HomeClient from "@/features/home/components/HomeClient";

export default async function Home() {
  const t = await getTranslations("hero");
  const seo = await getTranslations("homeSeo");

  const faqs = [
    { question: seo("faq1Question"), answer: seo("faq1Answer") },
    { question: seo("faq2Question"), answer: seo("faq2Answer") },
    { question: seo("faq3Question"), answer: seo("faq3Answer") },
    { question: seo("faq4Question"), answer: seo("faq4Answer") },
    { question: seo("faq5Question"), answer: seo("faq5Answer") },
    { question: seo("faq6Question"), answer: seo("faq6Answer") },
  ];

  return (
    <main>
      <FAQJsonLd faqs={faqs} />

      {/* Server-rendered SEO content — present in initial HTML for crawlers.
          HeroText (client component) provides the styled visual version on desktop.
          This ensures the H1 is in the server response before JS hydration. */}
      <h1 className="sr-only">{t("title")}</h1>
      <p className="sr-only">{t("subtitle")}</p>

      {/* Keyword-rich SEO description for search engines — invisible to users */}
      <div className="sr-only" role="doc-subtitle">
        <p>{seo("description")}</p>
      </div>

      <HomeClient />

      {/* Server-rendered SEO content section for crawlers — mirrors visible content */}
      <section className="sr-only" aria-label={seo("aboutLabel")}>
        <h2>{seo("whatIsTitle")}</h2>
        <p>{seo("whatIsDescription")}</p>

        <h2>{seo("howItWorksTitle")}</h2>
        <ol>
          <li>{seo("step1")}</li>
          <li>{seo("step2")}</li>
          <li>{seo("step3")}</li>
        </ol>

        <h2>{seo("whyTitle")}</h2>
        <ul>
          <li>{seo("feature1")}</li>
          <li>{seo("feature2")}</li>
          <li>{seo("feature3")}</li>
          <li>{seo("feature4")}</li>
        </ul>

        <h2>{seo("faqTitle")}</h2>
        {faqs.map((faq, i) => (
          <div key={i}>
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
