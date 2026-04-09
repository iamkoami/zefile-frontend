import React from "react";
import { useTranslations } from "next-intl";
import { LightBulb, Xmark } from "iconoir-react";

interface AnalyticsTipBannerProps {
  tipKey: string;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  onDismiss: (tipKey: string) => void;
}

const AnalyticsTipBanner: React.FC<AnalyticsTipBannerProps> = ({
  tipKey,
  messageKey,
  messageParams,
  onDismiss,
}) => {
  const t = useTranslations("analytics");

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-400 rounded-r-lg p-4 flex items-start gap-3">
      <LightBulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
        {t(messageKey, messageParams)}
      </p>
      <button
        onClick={() => onDismiss(tipKey)}
        className="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 shrink-0"
        aria-label={t("tipDismiss")}
      >
        <Xmark className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AnalyticsTipBanner;
