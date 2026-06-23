"use client";

/**
 * Renders AI-generated text with a blinking cursor while streaming.
 * When streaming ends, the text is displayed as-is (structured highlights/
 * recommendations are rendered by the parent from the report_complete event).
 */

import { cn } from "@/lib/utils";

interface AnalyticsStreamingTextProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function AnalyticsStreamingText({
  text,
  isStreaming,
  className,
}: AnalyticsStreamingTextProps) {
  if (!text && !isStreaming) return null;

  return (
    <p
      className={cn(
        "text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap",
        className,
      )}
    >
      {text}
      {isStreaming && (
        <span
          aria-hidden="true"
          className="inline-block w-0.5 h-4 ml-0.5 bg-primary align-middle animate-pulse"
        />
      )}
    </p>
  );
}
