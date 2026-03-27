
import React, { type ReactNode } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import { getTranslations } from "next-intl/server";
import {
  ChatBubble,
  Mail,
  Globe,
  Tiktok,
  Instagram,
  Threads,
  Facebook,
  Linkedin,
  Youtube,
  X,
} from "iconoir-react";
import ChatButton from "./ChatButton";
import ContactForm from "./ContactForm";
import ContactFAQ from "./ContactFAQ";

export default async function ContactPage() {
  const t = await getTranslations("pages.contact");

  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  const formStrings = {
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
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero
          title={t.rich("title", { highlight })}
          subtitle={t("subtitle")}
        />

        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
          {/* Support intro text */}
          <p className="text-center font-medium text-gray-600 max-w-2xl mx-auto mb-12 text-base leading-relaxed">
            {t("supportIntro")}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl overflow-hidden">
            {/* Left Column -- Contact Info */}
            <div className="p-8 lg:p-12 flex flex-col justify-between">
              <div>
                <div className="space-y-10">
                  {/* Chat */}
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center shrink-0 text-[#171717]">
                      <ChatBubble width={24} height={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#171717] mb-0.5">
                        {t("chatTitle")}
                      </h2>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        {t("chatDesc")}
                      </p>
                      <ChatButton label={t("chatValue")} />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center shrink-0 text-[#171717]">
                      <Mail width={24} height={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#171717] mb-0.5">
                        {t("emailTitle")}
                      </h2>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        {t("emailDesc")}
                      </p>
                      <a
                        href="mailto:hello@zefile.io"
                        className="text-sm font-medium text-[#171717] underline underline-offset-2 hover:text-[#171717] transition-colors"
                      >
                        {t("emailValue")}
                      </a>
                    </div>
                  </div>

                  {/* Social */}
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center shrink-0 text-[#171717]">
                      <Globe width={24} height={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#171717] mb-0.5">
                        {t("socialTitle")}
                      </h2>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        {t("socialDesc")}
                      </p>
                      <span className="text-sm font-medium text-[#171717]">
                        {t("socialValue")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Icons */}
              <div className="flex gap-4 mt-12 lg:mt-0">
                <a
                  href="https://tiktok.com/@zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="TikTok"
                >
                  <Tiktok width={18} height={18} />
                </a>
                <a
                  href="https://instagram.com/zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram width={18} height={18} />
                </a>
                <a
                  href="https://threads.net/@zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="Threads"
                >
                  <Threads width={18} height={18} />
                </a>
                <a
                  href="https://facebook.com/zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook width={18} height={18} />
                </a>
                <a
                  href="https://linkedin.com/company/zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin width={18} height={18} />
                </a>
                <a
                  href="https://youtube.com/@zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube width={18} height={18} />
                </a>
                <a
                  href="https://x.com/zefilehq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                  aria-label="X"
                >
                  <X width={18} height={18} />
                </a>
              </div>
            </div>

            {/* Right Column -- Contact Form */}
            <div className="bg-[#87E64B] p-8 lg:p-12">
              <ContactForm strings={formStrings} />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16 lg:mt-24 max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#171717] text-center mb-10">
              {t.rich("faqSectionTitle", { highlight })}
            </h2>
            <ContactFAQ
              faqs={[
                { question: t("faq1Question"), answer: t("faq1Answer") },
                { question: t("faq2Question"), answer: t("faq2Answer") },
                { question: t("faq3Question"), answer: t("faq3Answer") },
                { question: t("faq4Question"), answer: t("faq4Answer") },
                { question: t("faq5Question"), answer: t("faq5Answer") },
              ]}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
