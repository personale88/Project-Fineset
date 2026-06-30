"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

const MOBILE_MIN_TEXTAREA_HEIGHT_PX = 44;
const DESKTOP_MIN_TEXTAREA_HEIGHT_PX = 36;
const MAX_TEXTAREA_HEIGHT_PX = 128;

export interface AnalyticsChatComposerHandle {
  focus: () => void;
}

interface AnalyticsChatComposerProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  submitLabel: string;
  rechargeLabel: string;
  canSubmit: boolean;
  outOfCredits: boolean;
  validationHint?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSubmitAttempt?: () => void;
  onRecharge: () => void;
  className?: string;
  variant?: "mobile" | "desktop";
  footer?: React.ReactNode;
}

function resizeTextarea(element: HTMLTextAreaElement, minHeightPx: number) {
  element.style.height = "auto";
  const nextHeight = Math.min(
    Math.max(element.scrollHeight, minHeightPx),
    MAX_TEXTAREA_HEIGHT_PX,
  );
  element.style.height = `${nextHeight}px`;
}

export const AnalyticsChatComposer = forwardRef<
  AnalyticsChatComposerHandle,
  AnalyticsChatComposerProps
>(function AnalyticsChatComposer(
  {
    id,
    label,
    value,
    placeholder,
    submitLabel,
    rechargeLabel,
    canSubmit,
    outOfCredits,
    validationHint,
    onChange,
    onSubmit,
    onSubmitAttempt,
    onRecharge,
    className,
    variant = "mobile",
    footer,
  },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = variant === "mobile";

  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  const syncHeight = useCallback(() => {
    const element = textareaRef.current;
    if (!element) return;
    resizeTextarea(
      element,
      isMobile ? MOBILE_MIN_TEXTAREA_HEIGHT_PX : DESKTOP_MIN_TEXTAREA_HEIGHT_PX,
    );
  }, [isMobile]);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  const handleSubmit = () => {
    if (outOfCredits) {
      onRecharge();
      return;
    }
    if (canSubmit) {
      onSubmit();
      return;
    }
    onSubmitAttempt?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;

    if (isMobile && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
      return;
    }

    if (!isMobile && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const validationBlock = validationHint ? (
    <p className="mt-1 px-0.5 text-xs text-status-warning" role="status">
      {validationHint}
    </p>
  ) : null;

  if (!isMobile) {
    return (
      <div
        className={cn("shrink-0 px-4 pb-3 pt-2 sm:px-5", className)}
        data-analytics-composer
      >
        <div className="rounded-input border border-border bg-surface-primary px-2.5 py-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-brand-gold/40 focus-within:ring-2 focus-within:ring-brand-gold/15">
          <label className="sr-only" htmlFor={id}>
            {label}
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              id={id}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              rows={1}
              className="min-h-9 max-h-32 flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm leading-snug shadow-none focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              style={{ height: `${DESKTOP_MIN_TEXTAREA_HEIGHT_PX}px` }}
              onKeyDown={handleKeyDown}
            />
            <Button
              type="button"
              className="h-9 shrink-0 px-4 text-sm"
              disabled={!canSubmit && !outOfCredits}
              onClick={handleSubmit}
            >
              {outOfCredits ? rechargeLabel : submitLabel}
            </Button>
          </div>
        </div>
        {validationBlock}
        {footer ? <div className="mt-1 px-0.5">{footer}</div> : null}
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

      <div className="flex items-end gap-2 rounded-input border border-border bg-surface-primary p-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-brand-gold/40 focus-within:ring-2 focus-within:ring-brand-gold/20">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          rows={1}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2.5 py-2.5 text-sm leading-snug text-text-primary placeholder:text-text-muted focus:outline-none"
          style={{ height: `${MOBILE_MIN_TEXTAREA_HEIGHT_PX}px` }}
        />

        <Button
          type="button"
          size="icon"
          className="mb-0.5 h-10 w-10 shrink-0 rounded-input"
          disabled={!canSubmit && !outOfCredits}
          aria-label={outOfCredits ? rechargeLabel : submitLabel}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      {validationBlock}
      {footer ? <div className="mt-1.5 px-1">{footer}</div> : null}
    </div>
  );
});
