"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePortalSignOut } from "@/hooks/usePortalSignOut";
import {
  ADMIN_DASHBOARD_PATH,
  BUSINESS_OWNER_DASHBOARD_PATH,
  STAFF_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";
import { Logo } from "@/components/shared/Logo";
import { OfflineQueueBanner } from "@/components/pwa/OfflineQueueBanner";
import { portalHeaderIconButtonClass } from "@/components/layout/portal-header-button";
import { shouldHidePortalBottomNav } from "@/lib/utils/portal-bottom-nav";
import {
  portalAdminHeaderFixedClassName,
  portalAdminHeaderPaddingClassName,
  portalAdminMainClassName,
  portalAdminMobileBottomNavPaddingClassName,
  portalAdminShellColumnClassName,
  portalSideNavOffsetClassName,
} from "@/components/layout/portal-side-nav-styles";

interface NavItem {
  href: string;
  label: string;
}

interface PortalShellProps {
  title: string;
  portalType?: string;
  homeHref?: string;
  navItems?: NavItem[];
  showDesktopNav?: boolean;
  bottomNav?: React.ReactNode;
  signOutLabel: string;
  showSignOut?: boolean;
  headerActions?: React.ReactNode;
  /** Full-height left rail; header and main content start to its right. */
  sideNav?: React.ReactNode;
  children: React.ReactNode;
}

export function PortalShell({
  title,
  portalType,
  homeHref = "/",
  navItems = [],
  showDesktopNav = true,
  bottomNav,
  signOutLabel,
  showSignOut = true,
  headerActions,
  sideNav,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const { signOut, isSigningOut } = usePortalSignOut();

  useEffect(() => {
    if (!sideNav) return;
    document.documentElement.classList.add("admin-portal-scroll-lock");
    return () => {
      document.documentElement.classList.remove("admin-portal-scroll-lock");
    };
  }, [sideNav]);

  function isActive(href: string): boolean {
    if (href === STAFF_DASHBOARD_PATH) {
      return pathname === href;
    }
    if (href === BUSINESS_OWNER_DASHBOARD_PATH) {
      return (
        pathname === href ||
        pathname.startsWith(`${BUSINESS_OWNER_DASHBOARD_PATH}/stores/`)
      );
    }
    if (href === STORE_MANAGER_DASHBOARD_PATH) {
      return pathname === href;
    }
    if (
      href.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/stores/`) ||
      href.startsWith(`${BUSINESS_OWNER_DASHBOARD_PATH}/stores/`)
    ) {
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    if (href === ADMIN_DASHBOARD_PATH) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  const hideBottomNav = Boolean(bottomNav) && shouldHidePortalBottomNav(pathname);
  const showBottomNav = Boolean(bottomNav) && !hideBottomNav;
  const adminHomeHref = sideNav ? homeHref || ADMIN_DASHBOARD_PATH : homeHref;
  const hasMobileHeaderNav = navItems.length > 0 && !bottomNav;

  const shellHeader = (
    <header
      className={cn(
        "shrink-0 border-b border-border bg-surface-card",
        sideNav ? portalAdminHeaderFixedClassName : "sticky top-0 z-20",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 py-4 sm:gap-4",
          sideNav
            ? portalAdminHeaderPaddingClassName
            : "mx-auto max-w-7xl px-page-x sm:px-page-md",
        )}
      >
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          {sideNav ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href={adminHomeHref}
                className="inline-flex shrink-0 lg:hidden"
                aria-label="Admin dashboard home"
              >
                <Logo size={32} linked={false} />
              </Link>
              <span className="min-w-0">
                <span
                  className="block font-display text-lg font-semibold leading-tight text-brand-gold"
                  data-testid="portal-brand-title"
                >
                  {title}
                </span>
                {portalType ? (
                  <span
                    className="block text-xs leading-tight text-text-muted"
                    data-testid="portal-type-label"
                  >
                    {portalType}
                  </span>
                ) : null}
              </span>
            </div>
          ) : (
            <Link href={homeHref} className="flex shrink-0 items-center gap-2.5">
              <Logo size={36} linked={false} />
              <span className="min-w-0">
                <span
                  className="block font-display text-lg font-semibold leading-tight text-brand-gold"
                  data-testid="portal-brand-title"
                >
                  {title}
                </span>
                {portalType ? (
                  <span
                    className="block text-xs leading-tight text-text-muted"
                    data-testid="portal-type-label"
                  >
                    {portalType}
                  </span>
                ) : null}
              </span>
            </Link>
          )}
          {navItems.length > 0 && showDesktopNav && (
            <nav className="hidden shrink-0 gap-4 sm:flex" aria-label="Main navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "text-sm transition-colors",
                    isActive(item.href)
                      ? "font-medium text-brand-gold"
                      : "text-text-secondary hover:text-brand-gold",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {showSignOut ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isSigningOut}
                onClick={() => void signOut()}
                className="hidden gap-1.5 sm:inline-flex"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                {isSigningOut ? "Signing out…" : signOutLabel}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isSigningOut}
                onClick={() => void signOut()}
                className={portalHeaderIconButtonClass}
                aria-label={isSigningOut ? "Signing out…" : signOutLabel}
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {hasMobileHeaderNav ? (
        <nav
          className="flex h-14 items-center gap-2 overflow-x-auto border-t border-border px-page-x [scrollbar-width:none] [-ms-overflow-style:none] sm:hidden [&::-webkit-scrollbar]:hidden"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-chip px-3 py-2 text-xs",
                isActive(item.href)
                  ? "bg-brand-gold text-white"
                  : "bg-surface-secondary text-text-secondary",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );

  return (
    <div
      className={cn(
        "bg-surface-primary [--portal-header-offset:4.5rem] [--portal-sticky-gap:0.75rem]",
        hasMobileHeaderNav && "max-sm:[--portal-header-offset:8.25rem]",
        sideNav ? "h-dvh overflow-hidden" : "min-h-screen",
      )}
      data-testid="portal-shell"
    >
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:z-50 focus:rounded-input focus:bg-brand-gold focus:px-4 focus:py-2 focus:text-white",
          sideNav ? "focus:left-4 lg:focus:left-24" : "focus:left-4",
        )}
      >
        Skip to main content
      </a>
      {sideNav}
      {sideNav ? shellHeader : null}
      <div
        className={cn(
          sideNav ? portalAdminShellColumnClassName : "flex min-h-screen flex-col",
          sideNav && portalSideNavOffsetClassName,
        )}
      >
        {!sideNav ? shellHeader : null}
        <OfflineQueueBanner />
        <main
          id="main-content"
          className={cn(
            "flex min-w-0 flex-col",
            sideNav
              ? portalAdminMainClassName
              : cn("mx-auto min-h-0 max-w-7xl flex-1 px-page-x py-6 sm:px-page-md"),
            showBottomNav
              ? sideNav
                ? portalAdminMobileBottomNavPaddingClassName
                : "pb-24 sm:pb-6"
              : undefined,
          )}
        >
          {children}
        </main>
        {showBottomNav ? bottomNav : null}
      </div>
    </div>
  );
}
