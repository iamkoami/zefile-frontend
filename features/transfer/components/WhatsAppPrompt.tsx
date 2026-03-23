"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { contactsApi, PromptEligibleContact } from "@/services/contacts-api";
import { PhoneNumberInput } from "@/features/payment/components/PhoneNumberInput";
import { CountryCode } from "libphonenumber-js/min";

interface WhatsAppPromptProps {
  recipientEmails: string[];
}

interface PromptState {
  phoneNumber: string;
  isValid: boolean;
  countryCode: CountryCode;
  status: "idle" | "saving" | "saved" | "skipped";
}

// Brief confirmation delay before removing prompt (ms)
const CONFIRMATION_DELAY = 1200;

/**
 * WhatsAppPrompt — non-blocking post-transfer prompt to add WhatsApp numbers
 * for eligible contacts (no whatsappNumber, whatsappPromptShown = false).
 * Each eligible contact gets an independent prompt.
 */
const WhatsAppPrompt: React.FC<WhatsAppPromptProps> = ({
  recipientEmails,
}) => {
  const t = useTranslations("upload");
  const [eligibleContacts, setEligibleContacts] = useState<
    PromptEligibleContact[]
  >([]);
  const [promptStates, setPromptStates] = useState<
    Record<string, PromptState>
  >({});
  // Track which contacts have been dismissed after brief confirmation
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Stabilize recipientEmails dependency to avoid re-fetching on array reference change
  const emailsKey = useMemo(
    () => JSON.stringify([...(recipientEmails || [])].sort()),
    [recipientEmails]
  );

  // Use ref to access latest promptStates in callbacks without re-creating them
  const statesRef = useRef(promptStates);
  statesRef.current = promptStates;

  // Fetch eligible contacts on mount
  useEffect(() => {
    const emails: string[] = JSON.parse(emailsKey);
    if (emails.length === 0) return;

    let cancelled = false;
    contactsApi
      .getPromptEligibleContacts(emails)
      .then((res) => {
        if (!cancelled && res.data && res.data.length > 0) {
          setEligibleContacts(res.data);
          const states: Record<string, PromptState> = {};
          for (const contact of res.data) {
            states[contact.id] = {
              phoneNumber: "",
              isValid: false,
              countryCode: "CI",
              status: "idle",
            };
          }
          setPromptStates(states);
        }
      })
      .catch(() => {
        // Silently fail — prompt is non-blocking
      });

    return () => {
      cancelled = true;
    };
  }, [emailsKey]);

  // Schedule dismissal after brief confirmation
  const scheduleDismiss = useCallback((contactId: string) => {
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(contactId));
    }, CONFIRMATION_DELAY);
  }, []);

  const handlePhoneChange = useCallback(
    (contactId: string, phoneNumber: string, isValid: boolean, countryCode: CountryCode) => {
      setPromptStates((prev) => ({
        ...prev,
        [contactId]: { ...prev[contactId], phoneNumber, isValid, countryCode },
      }));
    },
    []
  );

  const handleSave = useCallback(
    async (contactId: string) => {
      const state = statesRef.current[contactId];
      if (!state || !state.isValid) return;

      setPromptStates((prev) => ({
        ...prev,
        [contactId]: { ...prev[contactId], status: "saving" },
      }));

      try {
        await contactsApi.updateWhatsAppPrompt(contactId, state.phoneNumber);
        setPromptStates((prev) => ({
          ...prev,
          [contactId]: { ...prev[contactId], status: "saved" },
        }));
        scheduleDismiss(contactId);
      } catch {
        setPromptStates((prev) => ({
          ...prev,
          [contactId]: { ...prev[contactId], status: "idle" },
        }));
      }
    },
    [scheduleDismiss]
  );

  const handleSkip = useCallback(
    async (contactId: string) => {
      setPromptStates((prev) => ({
        ...prev,
        [contactId]: { ...prev[contactId], status: "saving" },
      }));

      try {
        await contactsApi.updateWhatsAppPrompt(contactId);
        setPromptStates((prev) => ({
          ...prev,
          [contactId]: { ...prev[contactId], status: "skipped" },
        }));
        scheduleDismiss(contactId);
      } catch {
        setPromptStates((prev) => ({
          ...prev,
          [contactId]: { ...prev[contactId], status: "idle" },
        }));
      }
    },
    [scheduleDismiss]
  );

  // Don't render if no eligible contacts
  if (eligibleContacts.length === 0) return null;

  // Filter out dismissed contacts
  const activeContacts = eligibleContacts.filter(
    (c) => !dismissed.has(c.id)
  );

  if (activeContacts.length === 0) return null;

  return (
    <div className="w-full mt-4 space-y-3">
      {activeContacts.map((contact) => {
        const state = promptStates[contact.id];
        if (!state) return null;

        const isDone = state.status === "saved" || state.status === "skipped";

        return (
          <div
            key={contact.id}
            className={`border rounded p-4 transition-all duration-300 ${
              isDone
                ? "border-[#87E64B]/50 bg-[#87E64B]/5 dark:bg-[#87E64B]/10"
                : "border-gray-200 dark:border-[oklch(0.30_0_0)] bg-gray-50 dark:bg-[oklch(0.20_0_0)]"
            }`}
          >
            {isDone ? (
              <p className="text-sm text-[#171717] dark:text-[oklch(0.85_0_0)] font-medium">
                {state.status === "saved"
                  ? t("whatsappPromptSaved")
                  : t("whatsappPromptSkipped")}
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-700 dark:text-[oklch(0.75_0_0)] mb-3">
                  {t("whatsappPromptTitle", {
                    name: contact.name || contact.email,
                  })}
                </p>

                <div className="mb-3">
                  <PhoneNumberInput
                    value={state.phoneNumber}
                    onChange={(phoneNumber, isValid, countryCode) =>
                      handlePhoneChange(contact.id, phoneNumber, isValid, countryCode)
                    }
                    defaultCountry="CI"
                    disabled={state.status === "saving"}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(contact.id)}
                    disabled={!state.isValid || state.status === "saving"}
                    className="px-4 py-2 text-sm font-medium rounded bg-[#87E64B] text-[#171717] hover:bg-[#78d43f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {state.status === "saving"
                      ? t("whatsappPromptSaving")
                      : t("whatsappPromptSave")}
                  </button>
                  <button
                    onClick={() => handleSkip(contact.id)}
                    disabled={state.status === "saving"}
                    className="px-4 py-2 text-sm font-medium rounded text-gray-600 dark:text-[oklch(0.65_0_0)] hover:text-gray-800 dark:hover:text-[oklch(0.80_0_0)] hover:bg-gray-100 dark:hover:bg-[oklch(0.28_0_0)] disabled:opacity-50 transition-colors"
                  >
                    {t("whatsappPromptSkip")}
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WhatsAppPrompt;
