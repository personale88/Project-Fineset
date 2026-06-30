"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AdminChildPanelIntro } from "@/components/admin/AdminPageIntro";
import { cn } from "@/lib/utils";
import { portalChildSideNavFixedClassName, portalChildSideNavScrollClassName } from "@/components/layout/portal-side-nav-styles";

interface PortalChildSidePanelProps {
  children: React.ReactNode;
  /** Accessible name for the secondary navigation region. */
  "aria-label": string;
  className?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  pageMeta?: string;
}

function PortalChildSidePanelContent({
  children,
  "aria-label": ariaLabel,
  className,
  pageTitle,
  pageSubtitle,
  pageMeta,
}: PortalChildSidePanelProps) {
  const showPageIntro = Boolean(pageTitle);

  return (
    <aside
      aria-label={ariaLabel}
      data-testid="portal-child-side-panel"
      className={cn(portalChildSideNavFixedClassName, className)}
    >
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          portalChildSideNavScrollClassName,
        )}
      >
        {showPageIntro ? (
          <AdminChildPanelIntro title={pageTitle!} subtitle={pageSubtitle} meta={pageMeta} />
        ) : null}
        {children}
      </div>
    </aside>
  );
}

function getPortalShellNode(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>('[data-testid="portal-shell"]');
}

function subscribePortalShellNode(onStoreChange: () => void) {
  const frameId = requestAnimationFrame(onStoreChange);
  return () => cancelAnimationFrame(frameId);
}

/**
 * Full-height secondary panel docked flush to the primary side nav.
 * Portaled to the portal shell so scroll never chains into page content or the header.
 */
export function PortalChildSidePanel(props: PortalChildSidePanelProps) {
  const mountNode = useSyncExternalStore(
    subscribePortalShellNode,
    getPortalShellNode,
    () => null,
  );

  if (!mountNode) return null;

  return createPortal(<PortalChildSidePanelContent {...props} />, mountNode);
}
