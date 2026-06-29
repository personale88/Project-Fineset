import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminReadOnlyBannerProps {
  message: string;
  className?: string;
}

export function AdminReadOnlyBanner({ message, className }: AdminReadOnlyBannerProps) {
  return (
    <div
      role="note"
      data-testid="admin-read-only-banner"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-surface-secondary/60 px-4 py-3 text-sm text-text-secondary",
        className,
      )}
    >
      <Eye className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
