"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PeriodValue =
  | "yesterday"
  | "today"
  | "week"
  | "month"
  | "last3months"
  | "last6months";

interface PeriodOption {
  value: PeriodValue;
  label: string;
}

interface PeriodSwitcherProps {
  options: PeriodOption[];
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  className?: string;
}

export function PeriodSwitcher({
  options,
  value,
  onChange,
  className,
}: PeriodSwitcherProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? "default" : "outline"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
