/** Shared layout classes for Automation Center (375px-safe mobile). */

export const AUTOMATION_CENTER_ROOT_CLASS =
  "flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-x-hidden lg:gap-6";

export const AUTOMATION_CENTER_BODY_CLASS = "w-full min-w-0";

export const AUTOMATION_CENTER_CONTENT_CARD_CLASS =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-surface-card shadow-card";

/** Scrollable main column inside the content card (header stays pinned above). */
export const AUTOMATION_CENTER_CONTENT_SCROLL_CLASS =
  "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain max-lg:pb-8 lg:pb-5";

/** Full-bleed admin tab nav inside portal main padding on small screens. */
export const AUTOMATION_CENTER_NAV_CLASS =
  "-mx-page-x px-page-x sm:-mx-page-md sm:px-page-md lg:mx-0 lg:px-0";

export const AUTOMATION_CENTER_INTRO_CLASS = "min-w-0";

export const AUTOMATION_MOBILE_ACTION_ROW_CLASS =
  "flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap";

export const AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS = "w-full sm:w-auto";

export const AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS =
  "flex w-full min-w-0 max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory touch-pan-x scroll-px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
