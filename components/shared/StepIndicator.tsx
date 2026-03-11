"use client";

import React from "react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
}) => {
  if (steps.length <= 1) return null;

  return (
    <div className="flex items-center max-w-xs mx-auto mb-6 w-full">
      {steps.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <React.Fragment key={label}>
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200 ${
                  isCompleted
                    ? "bg-[#87E64B] text-white"
                    : isActive
                      ? "bg-[#5E53E0] text-white"
                      : "border border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1 text-[10px] whitespace-nowrap transition-colors duration-200 ${
                  isCompleted
                    ? "text-[#87E64B] font-medium"
                    : isActive
                      ? "text-[#5E53E0] font-medium"
                      : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-px min-w-3 mb-4 transition-colors duration-200 ${
                  index < currentStep ? "bg-[#87E64B]" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
