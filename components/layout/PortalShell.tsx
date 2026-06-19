"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearVisitDraft } from "@/components/forms/VisitForm/useVisitDraft";
import {
  ADMIN_DASHBOARD_PATH,
  BUSINESS_OWNER_DASHBOARD_PATH,
  STAFF_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";
import { Logo } from "@/components/shared/Logo";
import { OfflineQueueBanner } from "@/components/pwa/OfflineQueueBanner";

interface NavItem {
  href: string;
  label: string;
}

interface PortalShellProps {
  title: string;
  homeHref?: string;
  navItems?: NavItem[];
  bottomNav?: React.ReactNode;
  signOutLabel: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function PortalShell({
  title,
  homeHref = "/",
  navItems = [],
  bottomNav,
  signOutLabel,
  headerActions,
  children,
}: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      clearVisitDraft();
      queryClient.clear();
      await fetch("/api/auth/signout", { method: "POST" });
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Dev bypass or offline Supabase — cookie sign-out above is enough.
      }
      router.replace("/");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  }

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
      return (
        pathname === href ||
        pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/stores/`)
      );
    }
    if (href === ADMIN_DASHBOARD_PATH) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div
      className="min-h-screen bg-surface-primary [--portal-header-offset:4.5rem] [--portal-sticky-gap:0.75rem] max-sm:[--portal-header-offset:8.25rem]"
      data-testid="portal-shell"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-brand-gold focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-20 border-b border-border bg-surface-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-page-x py-4 sm:px-page-md">
          <div className="flex items-center gap-6">
            <Link href={homeHref} className="flex items-center gap-2.5">
              <Logo size={28} linked={false} />
              <span className="font-display text-lg font-semibold text-brand-gold">
                {title}
              </span>
            </Link>
            {navItems.length > 0 && (
              <nav className="hidden gap-4 sm:flex" aria-label="Main navigation">
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
          <div className="flex items-center gap-2">
            {headerActions}
            <Button
              variant="outline"
              size="sm"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              {isSigningOut ? "Signing out…" : signOutLabel}
            </Button>
          </div>
        </div>
        {navItems.length > 0 && (
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
        )}
      </header>
      <OfflineQueueBanner />
      <main
        id="main-content"
        className={cn(
          "mx-auto min-w-0 max-w-7xl px-page-x py-6 sm:px-page-md",
          bottomNav ? "pb-24 sm:pb-6" : undefined,
        )}
      >
        {children}
      </main>
      {bottomNav}
    </div>
  );
}
