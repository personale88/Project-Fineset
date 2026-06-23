"use client";

import { useEffect, useRef } from "react";
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

const SCROLL_ROW_CLASS =
  "flex gap-2 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory touch-pan-x scroll-px-2 px-2 pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function PeriodSwitcher({
  options,
  value,
  onChange,
  className,
}: PeriodSwitcherProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>(`[data-period="${value}"]`);
    if (!active) return;

    const isFirst = active === container.firstElementChild;
    const isLast = active === container.lastElementChild;
    active.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: isFirst ? "start" : isLast ? "end" : "center",
    });
  }, [value]);

  return (
    <div className={cn("min-w-0 w-full", className)}>
      <div
        ref={scrollRef}
        className={SCROLL_ROW_CLASS}
        role="group"
        aria-label="Time period"
      >
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "default" : "outline"}
            data-period={option.value}
            aria-pressed={value === option.value}
            className="shrink-0 snap-start whitespace-nowrap"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
