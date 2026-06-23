import { cn } from "@/lib/utils";

/** Mobile square icon button; expands with label on sm+ (notifications). */
export const portalHeaderActionButtonClass = cn(
  "relative h-9 w-9 shrink-0 p-0",
  "sm:h-9 sm:w-auto sm:px-3 sm:gap-1.5",
);

/** Mobile-only square icon button (search, sign out). */
export const portalHeaderIconButtonClass = "h-9 w-9 shrink-0 p-0 sm:hidden";
