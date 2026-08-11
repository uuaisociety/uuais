"use client";

import React, { useRef, useEffect } from "react";
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
  /** Actionable hint shown next to the nav buttons when Continue is blocked. */
  nextDisabledHint?: string;
  /** Actionable hint shown next to the nav buttons when Submit is blocked. */
  submitDisabledHint?: string;
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
  nextDisabledHint,
  submitDisabledHint,
  children,
}) => {
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // The step header scrolls horizontally on narrow screens; keep the active step in view.
  const stepBarRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const bar = stepBarRef.current;
    const el = stepRefs.current[currentStep];
    if (!bar || !el) return;
    const left = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [currentStep]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Progress Bar */}
      <div className="mb-10">
        <div
          ref={stepBarRef}
          className="relative overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex items-center w-max min-w-full pt-2">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const isFirst = i === 0;
              // Left connector fills when this step is reached (i.e., i <= currentStep)
              const leftFilled = i <= currentStep;
              // Right connector fills when advancing to next step (i.e., i < currentStep)
              const rightFilled = i < currentStep;
              return (
                <div
                  key={step.key}
                  ref={(el) => { stepRefs.current[i] = el; }}
                  className="flex flex-col items-center flex-1 min-w-20"
                >
                  {/* Row: [left-line | circle | right-line] — keeps the circle centered above the label */}
                  <div className="flex items-center w-full">
                    {/* Left line: takes flex-1; invisible spacer on step 0 so circle stays centered */}
                    <div
                      className={`h-0.5 flex-1 transition-colors duration-500 ${
                        isFirst ? "opacity-0" : leftFilled ? "bg-primary" : "bg-foreground/10"
                      }`}
                    />
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 transition-all duration-300 ${
                        i < currentStep
                          ? "bg-primary text-primary-foreground"
                          : i === currentStep
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : "bg-foreground/8 text-muted-foreground border border-border"
                      }`}
                    >
                      {i < currentStep ? <Check className="h-5 w-5" /> : i + 1}
                    </div>
                    {/* Right line: takes flex-1; invisible spacer on the last step */}
                    <div
                      className={`h-0.5 flex-1 transition-colors duration-500 ${
                        isLast ? "opacity-0" : rightFilled ? "bg-primary" : "bg-foreground/10"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium text-center whitespace-nowrap transition-colors duration-300 ${
                      i === currentStep
                        ? "text-primary"
                        : i < currentStep
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div key={currentStep} className="animate-in fade-in slide-in-from-right-4 duration-300">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={!canBack || isFirst}
          className={`${
            isFirst ? "opacity-0!" : ""
          }`}
        >
          {!isFirst && <ArrowLeft className="h-5 w-5 mr-1 max-sm:mr-0" />}
          {!isFirst && <span className="max-sm:hidden">Back</span>}
        </Button>
        {isLast ? (
          <Button
            type="button"
            variant="cta"
            size="lg"
            onClick={onSubmit}
            disabled={submitDisabled}
          >
            <span className="max-sm:hidden">{submitLabel}</span> <Check className="ml-1 h-5 w-5 max-sm:ml-0" />
          </Button>
        ) : (
          <Button variant="outline" type="button" onClick={onNext} disabled={!canNext}>
            <span className="max-sm:hidden">Continue</span> <ArrowRight className="ml-1 h-5 w-5 max-sm:ml-0" />
          </Button>
        )}
      </div>
      {/* Why is the action blocked? A disabled button without a reason is a wall. */}
      {!isLast && !canNext && nextDisabledHint && (
        <p className="text-sm text-muted-foreground text-right mt-3" role="status">
          {nextDisabledHint}
        </p>
      )}
      {isLast && submitDisabled && submitDisabledHint && (
        <p className="text-sm text-muted-foreground text-right mt-3" role="status">
          {submitDisabledHint}
        </p>
      )}
    </div>
  );
};

export default MultiStepWizard;