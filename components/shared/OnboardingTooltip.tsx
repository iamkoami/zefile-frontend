"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

export interface TooltipStep {
  elementId: string;
  placement: "bottom" | "top";
  title: string;
  body: string;
}

interface OnboardingTooltipProps {
  steps: TooltipStep[];
  onComplete: () => void;
}

const TOOLTIP_WIDTH = 288;
const TOOLTIP_GAP = 12;
const VIEWPORT_PADDING = 16;
const HIGHLIGHT_CLASS = "ze-onboarding-highlight";

const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  steps,
  onComplete,
}) => {
  const t = useTranslations("onboarding");
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem("zefile_onboarding_complete", "true");
    } catch {
      // localStorage unavailable
    }
    // Clean up highlight from current element
    const el = document.getElementById(steps[currentStep]?.elementId);
    if (el) el.classList.remove(HIGHLIGHT_CLASS);
    onComplete();
  }, [onComplete, steps, currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setIsVisible(false);
      // Remove highlight from current element
      const el = document.getElementById(steps[currentStep].elementId);
      if (el) el.classList.remove(HIGHLIGHT_CLASS);
      setTimeout(() => {
        setCurrentStep((s) => s + 1);
      }, 200);
    } else {
      handleComplete();
    }
  }, [currentStep, steps, handleComplete]);

  // Position tooltip relative to target element
  useEffect(() => {
    const step = steps[currentStep];
    if (!step) {
      handleComplete();
      return;
    }

    const el = document.getElementById(step.elementId);
    if (!el) {
      // Element not found — skip this step
      if (currentStep < steps.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        handleComplete();
      }
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // Element invisible — skip
      if (currentStep < steps.length - 1) {
        setCurrentStep((s) => s + 1);
      } else {
        handleComplete();
      }
      return;
    }

    // Add highlight
    el.classList.add(HIGHLIGHT_CLASS);

    // Calculate position
    let top: number;
    if (step.placement === "bottom") {
      top = rect.bottom + TOOLTIP_GAP;
    } else {
      top = rect.top - TOOLTIP_GAP; // Will be adjusted after render
    }

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_PADDING),
    );

    setPosition({ top, left });
    requestAnimationFrame(() => setIsVisible(true));

    return () => {
      el.classList.remove(HIGHLIGHT_CLASS);
    };
  }, [currentStep, steps, handleComplete]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleComplete();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleComplete]);

  if (!position) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isTop = step.placement === "top";

  const tooltipContent = (
    <>
      {/* Transparent backdrop — click to skip */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={handleComplete}
        aria-hidden="true"
      />

      {/* Tooltip bubble */}
      <div
        className={`fixed z-[9998] rounded bg-[#171717] text-white px-4 py-3 shadow-lg transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          top: isTop ? undefined : position.top,
          bottom: isTop ? `calc(100vh - ${position.top}px)` : undefined,
          left: position.left,
          width: TOOLTIP_WIDTH,
        }}
        role="tooltip"
      >
        {/* Caret */}
        {isTop ? (
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderTop: "8px solid #171717",
            }}
          />
        ) : (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: "8px solid #171717",
            }}
          />
        )}

        <p className="text-sm font-bold mb-1">{step.title}</p>
        <p className="text-xs text-gray-300 leading-relaxed">{step.body}</p>

        <div className="flex items-center justify-between mt-3">
          <button
            onClick={handleComplete}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isLast ? "" : t("skip")}
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-1.5 text-xs font-bold text-white bg-[#5E53E0] rounded hover:bg-[#4a42b8] transition-colors"
          >
            {isLast ? t("gotIt") : t("next")}
          </button>
        </div>

        {/* Step dots */}
        {steps.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentStep ? "bg-white" : "bg-gray-600"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(tooltipContent, document.body);
};

export default OnboardingTooltip;
