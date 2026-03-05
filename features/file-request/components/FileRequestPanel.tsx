"use client";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useDrawerStore } from "@/stores/drawer-store";
import {
  fileRequestApi,
  CreateFileRequestDto,
} from "@/services/file-request-api";
import { toast } from "@/components/shared/Toast";

interface FileRequestPanelProps {
  isAuthenticated: boolean;
  userTier: string;
}

const FileRequestPanel: React.FC<FileRequestPanelProps> = ({
  isAuthenticated,
  userTier,
}) => {
  const t = useTranslations("fileRequests");

  if (!isAuthenticated) return <NotLoggedInState t={t} />;
  if (userTier === "free") return <FreeTierState t={t} />;
  return <RequestForm t={t} />;
};

function NotLoggedInState({
  t,
}: {
  t: ReturnType<typeof useTranslations>;
}) {
  const handleLogin = () => {
    window.dispatchEvent(new CustomEvent("open-auth-modal"));
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <h2 className="text-xl font-bold text-[#171717] mb-2">
        {t("notLoggedInTitle")}
      </h2>
      <p className="text-sm font-medium text-gray-500 mb-8">
        {t("notLoggedInDesc")}
      </p>
      <button
        onClick={handleLogin}
        className="w-full bg-[#5E53E0] text-white py-3 rounded font-semibold hover:bg-[#4e45c8] transition-colors mb-3"
      >
        {t("loginCta")}
      </button>
      <button
        onClick={handleLogin}
        className="text-[#5E53E0] font-semibold text-sm hover:underline"
      >
        {t("signUpLink")}
      </button>
    </div>
  );
}

function FreeTierState({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { openDrawer } = useDrawerStore();

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <h2 className="text-xl font-bold text-[#171717] mb-2">
        {t("freeTierTitle")}
      </h2>
      <p className="text-sm font-medium text-gray-500 mb-8">{t("freeTierDesc")}</p>
      <button
        onClick={() => openDrawer("subscriptions")}
        className="w-full bg-[#5E53E0] text-white py-3 rounded font-semibold hover:bg-[#4e45c8] transition-colors"
      >
        {t("upgradeToStarter")}
      </button>
    </div>
  );
}

function RequestForm({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [currency] = useState("XOF");
  const [creativeEmail, setCreativeEmail] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{
    email: string;
    shortCode: string;
  } | null>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = t("titleRequired");
    if (title.length > 255) newErrors.title = t("titleTooLong");
    const budgetNum = Number(budget);
    if (!budget || budgetNum <= 0) newErrors.budget = t("budgetRequired");
    if (budget && isNaN(budgetNum)) newErrors.budget = t("budgetInvalid");
    if (!creativeEmail.trim())
      newErrors.creativeEmail = t("creativeEmailRequired");
    if (
      creativeEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creativeEmail)
    ) {
      newErrors.creativeEmail = t("creativeEmailInvalid");
    }
    if (deadline) {
      const deadlineDate = new Date(deadline + "T23:59:59");
      if (deadlineDate <= new Date()) {
        newErrors.deadline = t("deadlinePast");
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const dto: CreateFileRequestDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        budgetMinorUnits: Math.round(Number(budget)),
        currency,
        creativeEmail: creativeEmail.trim().toLowerCase(),
        deadline: deadline || undefined,
      };
      const response = await fileRequestApi.createFileRequest(dto);
      if (response.error) {
        const errorMsg =
          typeof response.error.message === "string"
            ? response.error.message
            : Array.isArray(response.error.message)
              ? response.error.message[0]
              : t("genericError");
        toast.error(errorMsg);
        return;
      }
      if (response.data) {
        setSuccess({
          email: creativeEmail,
          shortCode: response.data.shortCode,
        });
        setTitle("");
        setDescription("");
        setBudget("");
        setCreativeEmail("");
        setDeadline("");
      }
    } catch {
      toast.error(t("networkError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
        <h2 className="text-xl font-bold text-[#171717] mb-2">
          {t("successTitle")}
        </h2>
        <p className="text-sm font-medium text-gray-500 mb-6">
          {t("successDesc", { email: success.email })}
        </p>
        <button
          onClick={() => setSuccess(null)}
          className="w-full bg-[#5E53E0] text-white py-3 rounded font-semibold hover:bg-[#4e45c8] transition-colors"
        >
          {t("sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="py-4 px-0">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="fr-email"
            className="block text-sm text-gray-500 mb-1"
          >
            {t("formCreativeEmail")}
          </label>
          <input
            id="fr-email"
            type="email"
            value={creativeEmail}
            onChange={(e) => {
              setCreativeEmail(e.target.value);
              setErrors((prev) => ({ ...prev, creativeEmail: "" }));
            }}
            placeholder={t("formCreativeEmailPlaceholder")}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-[#5E53E0] transition-colors"
          />
          {errors.creativeEmail && (
            <p className="text-red-500 text-xs mt-1">
              {errors.creativeEmail}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="fr-title"
            className="block text-sm text-gray-500 mb-1"
          >
            {t("formTitle")}
          </label>
          <input
            id="fr-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((prev) => ({ ...prev, title: "" }));
            }}
            placeholder={t("formTitlePlaceholder")}
            maxLength={255}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-[#5E53E0] transition-colors"
          />
          {errors.title && (
            <p className="text-red-500 text-xs mt-1">{errors.title}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="fr-desc"
            className="block text-sm text-gray-500 mb-1"
          >
            {t("formDescription")}
          </label>
          <input
            id="fr-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("formDescriptionPlaceholder")}
            className="w-full border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-[#5E53E0] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded px-4 py-2 flex-1">
            <span className="text-sm text-gray-500">{t("formBudget")}</span>
            <input
              id="fr-budget"
              type="number"
              value={budget}
              onChange={(e) => {
                setBudget(e.target.value);
                setErrors((prev) => ({ ...prev, budget: "" }));
              }}
              min="1"
              placeholder="0"
              className="w-20 text-sm bg-transparent focus:outline-none text-[#5E53E0] font-medium"
            />
            <span className="text-xs text-gray-400">{currency}</span>
          </div>
        </div>
        {errors.budget && (
          <p className="text-red-500 text-xs">{errors.budget}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-[#5E53E0] text-white py-3 rounded font-semibold hover:bg-[#4e45c8] transition-colors disabled:opacity-50 mt-2"
        >
          {isSubmitting ? t("sending") : t("sendRequest")}
        </button>
      </div>
    </div>
  );
}

export default FileRequestPanel;
