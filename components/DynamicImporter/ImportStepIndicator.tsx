"use client";

import { cn } from "@/lib/utils";
import { WIZARD_STEPS, type WizardStepId } from "./import-copy";

interface ImportStepIndicatorProps {
  currentStep: WizardStepId;
}

export function ImportStepIndicator({ currentStep }: ImportStepIndicatorProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Import progress">
      {WIZARD_STEPS.map((step, index) => {
        const isComplete = step.id < currentStep;
        const isCurrent = step.id === currentStep;

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isComplete && "bg-brand-gold text-white",
                  isCurrent && "border-2 border-brand-gold bg-brand-gold/10 text-brand-gold",
                  !isComplete && !isCurrent && "bg-surface-muted text-text-muted",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? "✓" : step.id}
              </span>
              <span
                className={cn(
                  "hidden truncate text-sm sm:inline",
                  isCurrent ? "font-medium text-text-primary" : "text-text-muted",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  step.id < currentStep ? "bg-brand-gold/50" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
