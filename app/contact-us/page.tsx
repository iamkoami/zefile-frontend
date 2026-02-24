"use client";

export const runtime = "edge";

import React, { useState, type ReactNode } from "react";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import PageHero from "@/components/shared/PageHero";
import { useTranslations } from "next-intl";
import { apiClient } from "@/services/api-client";
import { useChatStore } from "@/stores/chat-store";
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
  Check,
} from "iconoir-react";

type Category =
  | "fileTransfer"
  | "billing"
  | "partnership"
  | "bug"
  | "featureRequest"
  | "other";

export default function ContactPage() {
  const t = useTranslations("pages.contact");
  const { openChat } = useChatStore();
  const highlight = (chunks: ReactNode) => (
    <span className="ze-highlight-green">{chunks}</span>
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const categoryKeys: Category[] = [
    "fileTransfer",
    "billing",
    "partnership",
    "bug",
    "featureRequest",
    "other",
  ];

  const toggleCategory = (cat: Category) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const isValid = name.trim() && email.trim() && message.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await apiClient.post("/contact", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        categories: categories.map((c) => t(`cat_${c}`)),
      });

      if (response.error) {
        setError(t("errorMessage"));
      } else {
        setSubmitted(true);
      }
    } catch {
      setError(t("errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactChannels = [
    {
      icon: <ChatBubble width={24} height={24} strokeWidth={1.5} />,
      titleKey: "chatTitle",
      descKey: "chatDesc",
      valueKey: "chatValue",
      onClick: openChat,
    },
    {
      icon: <Mail width={24} height={24} strokeWidth={1.5} />,
      titleKey: "emailTitle",
      descKey: "emailDesc",
      valueKey: "emailValue",
      href: "mailto:hello@zefile.io",
    },
    {
      icon: <Globe width={24} height={24} strokeWidth={1.5} />,
      titleKey: "socialTitle",
      descKey: "socialDesc",
      valueKey: "socialValue",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F0]">
      <Header />

      <main className="flex-1">
        <PageHero title={t.rich("title", { highlight })} subtitle={t("subtitle")} />

        <div className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white rounded-2xl overflow-hidden">
            {/* Left Column -- Contact Info */}
            <div className="p-8 lg:p-12 flex flex-col justify-between">
              <div>
                <div className="space-y-10">
                  {contactChannels.map((channel, index) => (
                    <div key={index} className="flex gap-6">
                      <div className="w-10 h-10 rounded-full bg-[#F5F5F0] flex items-center justify-center shrink-0 text-[#171717]">
                        {channel.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#171717] mb-0.5">
                          {t(channel.titleKey)}
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mb-1">
                          {t(channel.descKey)}
                        </p>
                        {channel.onClick ? (
                          <button
                            onClick={channel.onClick}
                            className="text-sm font-medium text-[#171717] underline underline-offset-2 hover:text-[#171717] transition-colors"
                          >
                            {t(channel.valueKey)}
                          </button>
                        ) : channel.href ? (
                          <a
                            href={channel.href}
                            className="text-sm font-medium text-[#171717] underline underline-offset-2 hover:text-[#171717] transition-colors"
                          >
                            {t(channel.valueKey)}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-[#171717]">
                            {t(channel.valueKey)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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
              {submitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#171717] flex items-center justify-center mb-6">
                    <Check
                      width={28}
                      height={28}
                      color="white"
                      strokeWidth={2}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-[#171717] mb-2">
                    {t("successTitle")}
                  </h2>
                  <p className="text-[#171717]/70">{t("successMessage")}</p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                      setCategories([]);
                    }}
                    className="mt-8 text-sm font-semibold text-[#171717] underline underline-offset-2 hover:opacity-70 transition-opacity"
                  >
                    {t("sendAnother")}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl lg:text-4xl font-bold text-[#171717] mb-3 leading-tight">
                    {t("formTitle")}
                  </h2>
                  <p className="text-[#171717]/70 font-medium mb-8">
                    {t("formSubtitle")}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-sm font-semibold text-[#171717] mb-2"
                      >
                        {t("nameLabel")}
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-[#171717]/30 focus:border-[#171717] outline-none pb-2 text-[#171717] placeholder-[#171717]/40 transition-colors"
                        placeholder={t("namePlaceholder")}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-sm font-semibold text-[#171717] mb-2"
                      >
                        {t("emailLabel")}
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-transparent border-b-2 border-[#171717]/30 focus:border-[#171717] outline-none pb-2 text-[#171717] placeholder-[#171717]/40 transition-colors"
                        placeholder={t("emailPlaceholder")}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-sm font-semibold text-[#171717] mb-2"
                      >
                        {t("messageLabel")}
                      </label>
                      <textarea
                        id="contact-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full bg-transparent border-b-2 border-[#171717]/30 focus:border-[#171717] outline-none pb-2 text-[#171717] placeholder-[#171717]/40 transition-colors resize-none"
                        placeholder={t("messagePlaceholder")}
                      />
                    </div>

                    {/* Categories */}
                    <div>
                      <p className="text-sm font-semibold text-[#171717] mb-3">
                        {t("categoryLabel")}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {categoryKeys.map((cat) => (
                          <label
                            key={cat}
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                categories.includes(cat)
                                  ? "bg-[#171717] border-[#171717]"
                                  : "border-[#171717]/30 group-hover:border-[#171717]/60"
                              }`}
                            >
                              {categories.includes(cat) && (
                                <Check
                                  width={12}
                                  height={12}
                                  color="white"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={categories.includes(cat)}
                              onChange={() => toggleCategory(cat)}
                              className="sr-only"
                            />
                            <span className="text-sm font-medium text-[#171717]">
                              {t(`cat_${cat}`)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {error && <p className="text-sm text-red-700">{error}</p>}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="w-full bg-[#171717] text-white py-3.5 mt-10 rounded font-bold text-lg hover:bg-[#2a2a2a] transition-colors disabled:bg-[#5a5a5a] disabled:text-white/60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? t("sending") : t("submitButton")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
