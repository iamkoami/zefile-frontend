"use client";

import React from "react";
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
import ContactForm from "./ContactForm";
import ContactFAQ from "./ContactFAQ";
import ChatButton from "./ChatButton";

interface ContactStrings {
  supportIntro: string;
  chatTitle: string;
  chatDesc: string;
  chatValue: string;
  emailTitle: string;
  emailDesc: string;
  emailValue: string;
  socialTitle: string;
  socialDesc: string;
  socialValue: string;
  faqSectionTitle: string;
  faqs: { question: string; answer: string }[];
  form: {
    formTitle: string;
    formSubtitle: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    categoryLabel: string;
    cat_fileTransfer: string;
    cat_billing: string;
    cat_partnership: string;
    cat_bug: string;
    cat_featureRequest: string;
    cat_other: string;
    submitButton: string;
    sending: string;
    successTitle: string;
    successMessage: string;
    sendAnother: string;
    errorMessage: string;
  };
}

interface ContactPageContentProps {
  strings: ContactStrings;
}

export default function ContactPageContent({ strings }: ContactPageContentProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
      <p className="text-center font-medium text-gray-600 max-w-2xl mx-auto mb-12 text-base leading-relaxed">
        {strings.supportIntro}
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
                    {strings.chatTitle}
                  </h2>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {strings.chatDesc}
                  </p>
                  <ChatButton label={strings.chatValue} />
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-6">
                <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center shrink-0 text-[#171717]">
                  <Mail width={24} height={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#171717] mb-0.5">
                    {strings.emailTitle}
                  </h2>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {strings.emailDesc}
                  </p>
                  <a
                    href="mailto:hello@zefile.io"
                    className="text-sm font-medium text-[#171717] underline underline-offset-2 hover:text-[#171717] transition-colors"
                  >
                    {strings.emailValue}
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
                    {strings.socialTitle}
                  </h2>
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    {strings.socialDesc}
                  </p>
                  <span className="text-sm font-medium text-[#171717]">
                    {strings.socialValue}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex gap-4 mt-12 lg:mt-0">
            {[
              { href: "https://tiktok.com/@zefilehq", label: "TikTok", Icon: Tiktok },
              { href: "https://instagram.com/zefilehq", label: "Instagram", Icon: Instagram },
              { href: "https://threads.net/@zefilehq", label: "Threads", Icon: Threads },
              { href: "https://facebook.com/zefilehq", label: "Facebook", Icon: Facebook },
              { href: "https://linkedin.com/company/zefilehq", label: "LinkedIn", Icon: Linkedin },
              { href: "https://youtube.com/@zefilehq", label: "YouTube", Icon: Youtube },
              { href: "https://x.com/zefilehq", label: "X", Icon: X },
            ].map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-white transition-colors"
                aria-label={label}
              >
                <Icon width={18} height={18} />
              </a>
            ))}
          </div>
        </div>

        {/* Right Column -- Contact Form */}
        <div className="bg-[#87E64B] p-8 lg:p-12">
          <ContactForm strings={strings.form} />
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 lg:mt-24 max-w-3xl mx-auto">
        <h2
          className="text-3xl lg:text-4xl font-bold text-[#171717] text-center mb-10"
          dangerouslySetInnerHTML={{
            __html: strings.faqSectionTitle.replace(
              /<highlight>(.*?)<\/highlight>/g,
              '<span class="ze-highlight-green">$1</span>'
            ),
          }}
        />
        <ContactFAQ faqs={strings.faqs} />
      </div>
    </div>
  );
}
