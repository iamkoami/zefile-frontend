"use client";

import React, { useState } from "react";
import { apiClient } from "@/services/api-client";
import { Check } from "iconoir-react";

type Category =
  | "fileTransfer"
  | "billing"
  | "partnership"
  | "bug"
  | "featureRequest"
  | "other";

const categoryKeys: Category[] = [
  "fileTransfer",
  "billing",
  "partnership",
  "bug",
  "featureRequest",
  "other",
];

interface ContactFormStrings {
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
}

interface ContactFormProps {
  strings: ContactFormStrings;
}

export default function ContactForm({ strings }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const categoryLabelMap: Record<Category, string> = {
    fileTransfer: strings.cat_fileTransfer,
    billing: strings.cat_billing,
    partnership: strings.cat_partnership,
    bug: strings.cat_bug,
    featureRequest: strings.cat_featureRequest,
    other: strings.cat_other,
  };

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
        categories: categories.map((c) => categoryLabelMap[c]),
      });

      if (response.error) {
        setError(strings.errorMessage);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError(strings.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#171717] flex items-center justify-center mb-6">
          <Check width={28} height={28} color="white" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-[#171717] mb-2">
          {strings.successTitle}
        </h2>
        <p className="text-[#171717]/70">{strings.successMessage}</p>
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
          {strings.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-3xl lg:text-4xl font-bold text-[#171717] mb-3 leading-tight">
        {strings.formTitle}
      </h2>
      <p className="text-[#171717]/70 font-medium mb-8">
        {strings.formSubtitle}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label
            htmlFor="contact-name"
            className="block text-sm font-semibold text-[#171717] mb-2"
          >
            {strings.nameLabel}
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b-2 border-[#171717]/30 focus:border-[#171717] outline-none pb-2 text-[#171717] placeholder-[#171717]/40 transition-colors"
            placeholder={strings.namePlaceholder}
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-semibold text-[#171717] mb-2"
          >
            {strings.emailLabel}
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b-2 border-[#171717]/30 focus:border-[#171717] outline-none pb-2 text-[#171717] placeholder-[#171717]/40 transition-colors"
            placeholder={strings.emailPlaceholder}
          />
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="contact-message"
            className="block text-sm font-semibold text-[#171717] mb-2"
          >
            {strings.messageLabel}
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full bg-transparent border-b-2 border-[#171717]/30 focus:border-[#171717] outline-none pb-2 text-[#171717] placeholder-[#171717]/40 transition-colors resize-none"
            placeholder={strings.messagePlaceholder}
          />
        </div>

        {/* Categories */}
        <div>
          <p className="text-sm font-semibold text-[#171717] mb-3">
            {strings.categoryLabel}
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
                  {categoryLabelMap[cat]}
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
          {isSubmitting ? strings.sending : strings.submitButton}
        </button>
      </form>
    </>
  );
}
