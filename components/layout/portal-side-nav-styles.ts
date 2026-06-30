import { cn } from "@/lib/utils";

/** Slim icon rail width in pixels (Tailwind `w-20`). */
export const PORTAL_SIDE_NAV_WIDTH_PX = 80;

export const portalSideNavWidthClassName = "w-20";

/** Offset main content when a fixed side nav is present (desktop only). */
export const portalSideNavOffsetClassName = "lg:pl-20";

export const portalSideNavShellClassName = cn(
  portalSideNavWidthClassName,
  "flex flex-col shrink-0 border-r border-border bg-white",
);

export const portalSideNavFixedClassName = cn(
  portalSideNavShellClassName,
  "fixed inset-y-0 left-0 z-30 hidden min-h-screen lg:flex",
);

/** Secondary panel docked flush to the primary side nav (e.g. Settings scopes). */
export const PORTAL_CHILD_SIDE_NAV_WIDTH_PX = 288;

export const portalChildSideNavWidthClassName = "w-72";

export const portalChildSideNavFixedClassName = cn(
  portalChildSideNavWidthClassName,
  "fixed left-20 top-[var(--portal-header-offset)] z-20",
  "hidden h-[calc(100dvh-var(--portal-header-offset))] flex-col overflow-hidden",
  "border-r border-border bg-white lg:flex",
);

/** Hide scrollbars inside docked child side panels while keeping scroll behavior. */
export const portalChildSideNavScrollClassName =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/** 12px body copy in docked child side panels (`--font-size-xs`). */
export const portalChildSideNavBodyTextClassName = "text-xs leading-snug";

/** Uppercase category labels in docked child side panels. */
export const portalChildSideNavCategoryLabelClassName =
  "text-xs font-medium uppercase tracking-wider text-text-muted";

/** Primary item title in docked child side panel lists. */
export const portalChildSideNavItemTitleClassName = "text-xs font-semibold";

/** Secondary hint copy in docked child side panel lists. */
export const portalChildSideNavItemHintClassName = "text-xs leading-snug text-text-muted";

/** Fixed admin header spanning the area to the right of the primary nav. */
export const portalAdminHeaderFixedClassName = cn(
  "fixed top-0 right-0 z-40 border-b border-border bg-surface-card left-0 lg:left-20",
);

/** Tighter vertical padding for full-height analytics (title lives in child panel). */
export const portalAdminAnalyticsContentAreaClassName = "pt-2 pb-4 lg:pt-3 lg:pb-5";

/** Default vertical padding for scrollable admin pages. */
export const portalAdminContentVerticalPaddingClassName = "py-4 lg:py-6";

/** Analytics main column: no outer scroll; chat panel scrolls internally. */
export const portalAdminAnalyticsContentClassName = cn(
  "min-h-0 overflow-hidden overflow-x-hidden",
  portalAdminAnalyticsContentAreaClassName,
);

/** Automation main column: no outer scroll; config card scrolls internally. */
export const portalAdminScopedPageContentClassName = cn(
  "flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden",
  portalAdminContentVerticalPaddingClassName,
);

/** @deprecated Use portalAdminScopedPageContentClassName */
export const portalAdminAutomationContentClassName = portalAdminScopedPageContentClassName;

/** Gap between docked left panels and page content. */
export const PORTAL_ADMIN_CONTENT_GAP_PX = 40;

/** Full-width admin content shell (horizontal inset only). */
export const portalAdminContentShellClassName = cn(
  "flex w-full min-w-0 max-w-none flex-1 flex-col",
  "px-4 lg:pl-10 lg:pr-10",
);

/** Full-width admin content area with a 40px gap from the primary side nav. */
export const portalAdminContentAreaClassName = cn(
  portalAdminContentShellClassName,
  portalAdminContentVerticalPaddingClassName,
);

/** Extra inset when a child side panel is docked (e.g. Settings scopes). */
export const portalAdminContentWithChildPanelClassName = "lg:pl-[calc(18rem+2.5rem)]";

/** Header row padding aligned with docked child panel content (inside the pl-20 shell column). */
export const portalAdminHeaderPaddingClassName = "w-full px-4 lg:pl-4 lg:pr-10";

/** Bottom inset when the mobile admin bottom nav is visible. */
export const portalAdminMobileBottomNavPaddingClassName =
  "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0";

/** Admin shell column to the right of the fixed primary nav. */
export const portalAdminShellColumnClassName = cn(
  "flex h-dvh flex-col overflow-hidden overscroll-none",
  "pt-[var(--portal-header-offset)]",
);

/** Main landmark wrapper — defers scrolling to AdminDashboardContent. */
export const portalAdminMainClassName = "flex min-h-0 flex-1 flex-col overflow-hidden";

/** Scroll container for admin page content below the fixed header. */
export const portalAdminMainScrollClassName = cn(
  "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
);

/** Offset page content when a docked child side panel is visible (legacy — prefer AdminDashboardContent). */
export const portalChildSideNavOffsetClassName = portalAdminContentWithChildPanelClassName;
