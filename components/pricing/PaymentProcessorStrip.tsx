"use client";

import { useTranslations } from "next-intl";

/**
 * Trust strip showing supported payment processors. Displayed under the
 * processing-fee explainer so buyers see at a glance which methods work.
 *
 * Logos are text-only for now (avoids licensing review for each brand). Swap
 * to actual brand SVGs once usage rights are confirmed for each:
 * - Paystack, Wave, MTN MoMo, Orange Money, Visa, Mastercard, Moov Money.
 */
export default function PaymentProcessorStrip() {
  const t = useTranslations("pricing.processors");

  const processors = [
    "Paystack",
    "Wave",
    "MTN MoMo",
    "Orange Money",
    "Moov Money",
    "Visa",
    "Mastercard",
  ];

  return (
    <section className="max-w-5xl mx-auto px-6 pb-16">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-6">
          {t("label")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {processors.map((name) => (
            <span
              key={name}
              className="text-base md:text-lg font-bold text-[#171717]/70 hover:text-[#171717] transition-colors"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-6 max-w-xl mx-auto">
          {t("disclaimer")}
        </p>
      </div>
    </section>
  );
}
