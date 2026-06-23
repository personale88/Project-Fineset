/** Minimum 48px bottom inset plus device safe area for modal shells. */
export const modalSafeBottomClassName =
  "pb-[calc(48px+env(safe-area-inset-bottom,0px))]";

/** Centered dialogs: preserve desktop padding, expand bottom inset on small screens. */
export const modalSafeBottomMobileClassName =
  "max-sm:pb-[calc(48px+env(safe-area-inset-bottom,0px))]";

/** Sticky modal footers on mobile; normal padding on larger screens. */
export const modalFooterSafeClassName =
  "pb-[calc(48px+env(safe-area-inset-bottom,0px))] sm:pb-4";

/** Scrollable modal bodies that need bottom breathing room. */
export const modalScrollSafeClassName =
  "pb-[calc(48px+env(safe-area-inset-bottom,0px))]";
