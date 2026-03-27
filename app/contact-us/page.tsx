export const runtime = "edge";

import React, { type ReactNode } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import { getTranslations } from "next-intl/server";
import ContactPageContent from "./ContactPageContent";

export default async function ContactPage() {
  const t = await getTranslations("pages.contact");

  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  const strings = {
    supportIntro: t("supportIntro"),
    chatTitle: t("chatTitle"),
    chatDesc: t("chatDesc"),
    chatValue: t("chatValue"),
    emailTitle: t("emailTitle"),
    emailDesc: t("emailDesc"),
    emailValue: t("emailValue"),
    socialTitle: t("socialTitle"),
    socialDesc: t("socialDesc"),
    socialValue: t("socialValue"),
    faqSectionTitle: t("faqSectionTitle"),
    faqs: [
      { question: t("faq1Question"), answer: t("faq1Answer") },
      { question: t("faq2Question"), answer: t("faq2Answer") },
      { question: t("faq3Question"), answer: t("faq3Answer") },
      { question: t("faq4Question"), answer: t("faq4Answer") },
      { question: t("faq5Question"), answer: t("faq5Answer") },
    ],
    form: {
      formTitle: t("formTitle"),
      formSubtitle: t("formSubtitle"),
      nameLabel: t("nameLabel"),
      namePlaceholder: t("namePlaceholder"),
      emailLabel: t("emailLabel"),
      emailPlaceholder: t("emailPlaceholder"),
      messageLabel: t("messageLabel"),
      messagePlaceholder: t("messagePlaceholder"),
      categoryLabel: t("categoryLabel"),
      cat_fileTransfer: t("cat_fileTransfer"),
      cat_billing: t("cat_billing"),
      cat_partnership: t("cat_partnership"),
      cat_bug: t("cat_bug"),
      cat_featureRequest: t("cat_featureRequest"),
      cat_other: t("cat_other"),
      submitButton: t("submitButton"),
      sending: t("sending"),
      successTitle: t("successTitle"),
      successMessage: t("successMessage"),
      sendAnother: t("sendAnother"),
      errorMessage: t("errorMessage"),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero
          title={t.rich("title", { highlight })}
          subtitle={t("subtitle")}
        />
        <ContactPageContent strings={strings} />
      </main>

      <Footer />
    </div>
  );
}
