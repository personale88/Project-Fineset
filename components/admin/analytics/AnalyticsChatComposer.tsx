"use client";

import { useCallback, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

const MIN_TEXTAREA_HEIGHT_PX = 44;
const MAX_TEXTAREA_HEIGHT_PX = 128;

interface AnalyticsChatComposerProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  submitLabel: string;
  rechargeLabel: string;
  canSubmit: boolean;
  outOfCredits: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRecharge: () => void;
  className?: string;
  variant?: "mobile" | "desktop";
  footer?: React.ReactNode;
}

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const nextHeight = Math.min(
    Math.max(element.scrollHeight, MIN_TEXTAREA_HEIGHT_PX),
    MAX_TEXTAREA_HEIGHT_PX,
  );
  element.style.height = `${nextHeight}px`;
}

export function AnalyticsChatComposer({
  id,
  label,
  value,
  placeholder,
  submitLabel,
  rechargeLabel,
  canSubmit,
  outOfCredits,
  onChange,
  onSubmit,
  onRecharge,
  className,
  variant = "mobile",
  footer,
}: AnalyticsChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = variant === "mobile";

  const syncHeight = useCallback(() => {
    if (!isMobile) return;
    const element = textareaRef.current;
    if (!element) return;
    resizeTextarea(element);
  }, [isMobile]);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  const handleSubmit = () => {
    if (outOfCredits) {
      onRecharge();
      return;
    }
    if (canSubmit) onSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;

    if (isMobile && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
      return;
    }

    if (!isMobile && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  if (!isMobile) {
    return (
      <div
        className={cn("shrink-0 px-5 pb-5 pt-3", className)}
        data-analytics-composer
      >
        <div className="rounded-2xl border border-border bg-surface-primary p-3 shadow-sm transition-[border-color,box-shadow] focus-within:border-brand-gold/40 focus-within:ring-2 focus-within:ring-brand-gold/15">
          <label className="sr-only" htmlFor={id}>
            {label}
          </label>
          <div className="flex items-end gap-3">
            <Textarea
              id={id}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              rows={3}
              className="min-h-[3.25rem] max-h-32 flex-1 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={handleKeyDown}
            />
            <Button
              type="button"
              className="h-10 shrink-0 rounded-xl px-5"
              disabled={!canSubmit && !outOfCredits}
              onClick={handleSubmit}
            >
              {outOfCredits ? rechargeLabel : submitLabel}
            </Button>
          </div>
        </div>
        {footer ? <div className="mt-2 px-1">{footer}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 bg-surface-card/95 backdrop-blur-sm",
        "px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      data-analytics-composer
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>

      <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface-primary p-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-brand-gold/40 focus-within:ring-2 focus-within:ring-brand-gold/20">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          rows={1}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-base leading-snug text-text-primary placeholder:text-text-muted focus:outline-none"
          style={{ height: `${MIN_TEXTAREA_HEIGHT_PX}px` }}
        />

        <Button
          type="button"
          size="icon"
          className="mb-0.5 h-10 w-10 shrink-0 rounded-xl"
          disabled={!canSubmit && !outOfCredits}
          aria-label={outOfCredits ? rechargeLabel : submitLabel}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
