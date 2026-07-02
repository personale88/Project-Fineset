/** Shared layout for admin pages with a docked scope panel (Automation, Settings, Accounts). */

export const ADMIN_SCOPED_PAGE_ROOT_CLASS =
  "flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3 overflow-x-hidden lg:gap-4";

export const ADMIN_SCOPED_CONTENT_CARD_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface-card shadow-card";

/** Scrollable body below a pinned results header inside the content card. */
export const ADMIN_SCOPED_CONTENT_SCROLL_CLASS =
  "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain max-lg:pb-8 lg:pb-5";

/** Mobile horizontal scope pill row — stays pinned above the scrolling card. */
export const ADMIN_SCOPED_MOBILE_SCOPE_NAV_CLASS =
  "flex w-full min-w-0 max-w-full shrink-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 touch-pan-x scroll-px-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:hidden";
