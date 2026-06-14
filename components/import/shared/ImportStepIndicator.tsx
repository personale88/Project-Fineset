"use client";

import { cn } from "@/lib/utils";
import type { ImportWizardStep } from "@/lib/import-engine/types";

const STEPS: Array<{ id: ImportWizardStep; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "mapping", label: "Mapping" },
  { id: "confirm", label: "Confirm" },
  { id: "progress", label: "Import" },
  { id: "summary", label: "Summary" },
];

interface ImportStepIndicatorProps {
  currentStep: ImportWizardStep;
}

export function ImportStepIndicator({ currentStep }: ImportStepIndicatorProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label="Import progress">
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <li key={step.id} className="flex min-w-0 items-center gap-2">
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
                {isComplete ? "✓" : index + 1}
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
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "hidden h-px w-6 sm:block",
                  index < currentIndex ? "bg-brand-gold/50" : "bg-border",
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
