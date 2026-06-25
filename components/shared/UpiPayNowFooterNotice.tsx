import { cn } from "@/lib/utils";

interface UpiPayNowFooterNoticeProps {
  title: string;
  message: string;
  compact?: boolean;
}

export function UpiPayNowFooterNotice({
  title,
  message,
  compact = false,
}: UpiPayNowFooterNoticeProps) {
  return (
    <div
      role="note"
      aria-label={`${title}: ${message}`}
      className={cn(
        "rounded-r-input border-l-[3px] border-status-warning bg-surface-secondary/50",
        compact ? "px-2.5 py-2" : "px-3 py-2.5",
      )}
    >
      <p
        className={cn(
          "leading-snug",
          compact ? "text-xs" : "text-sm",
        )}
      >
        <span className="font-semibold text-text-primary">{title}: </span>
        <span className="text-text-secondary">{message}</span>
      </p>
    </div>
  );
}
