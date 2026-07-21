"use client";

import React from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface WizardStep {
  key: string;
  title: string;
}

export interface MultiStepWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  canNext?: boolean;
  canBack?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  children: React.ReactNode;
}

/**
 * Generic, reusable multi-step wizard shell.
 *
 * Renders a progress bar, the current step content (children), and
 * navigation buttons. The parent owns `currentStep` state and is
 * responsible for rendering the right content per step.
 */
const MultiStepWizard: React.FC<MultiStepWizardProps> = ({
  steps,
  currentStep,
  onNext,
  onBack,
  onSubmit,
  canNext = true,
  canBack = true,
  submitLabel = "Submit",
  submitDisabled = false,
  children,
}) => {
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Progress Bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const isFirst = i === 0;
            // Left connector fills when this step is reached (i.e., i <= currentStep)
            const leftFilled = i <= currentStep;
            // Right connector fills when advancing to next step (i.e., i < currentStep)
            const rightFilled = i < currentStep;
            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                {/* Row: [left-line | circle | right-line] — keeps the circle centered above the label */}
                <div className="flex items-center w-full">
                  {/* Left line: takes flex-1; invisible spacer on step 0 so circle stays centered */}
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-500 ${
                      isFirst ? "opacity-0" : leftFilled ? "bg-red-600 dark:bg-red-500" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 transition-all duration-300 ${
                      i < currentStep
                        ? "bg-green-600 text-white"
                        : i === currentStep
                          ? "bg-red-600 dark:bg-red-500 text-white ring-4 ring-red-600/20 dark:ring-red-500/30"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
                  </div>
                  {/* Right line: takes flex-1; invisible spacer on the last step */}
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-500 ${
                      isLast ? "opacity-0" : rightFilled ? "bg-red-600 dark:bg-red-500" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs mt-2 font-medium text-center transition-colors duration-300 ${
                    i === currentStep
                      ? "text-red-600 dark:text-red-400"
                      : i < currentStep
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div key={currentStep} className="animate-in fade-in slide-in-from-right-4 duration-300">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={!canBack || isFirst}
          className={`${
            isFirst ? "opacity-0!" : ""
          }`}
        >
          {!isFirst && <ArrowLeft className="h-5 w-5 mr-1" />}
          {!isFirst ? "Back" : ""}
        </Button>
        {isLast ? (
          <Button
            type="button"
            variant="cta"
            size="lg"
            onClick={onSubmit}
            disabled={submitDisabled}
          >
            {submitLabel} <Check className="ml-1 h-5 w-5" />
          </Button>
        ) : (
          <Button type="button" onClick={onNext} disabled={!canNext}>
            Continue <ArrowRight className="ml-1 h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MultiStepWizard;