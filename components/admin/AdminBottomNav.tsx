"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useAdminPortalOptional } from "@/components/admin/AdminPortalContext";
import { AdminMoreSheet } from "@/components/admin/AdminMoreSheet";
import {
  bottomNavIconClass,
  bottomNavIconStroke,
  bottomNavIconWrapClass,
  bottomNavItemClass,
  bottomNavShellClassName,
} from "@/components/layout/bottom-nav-styles";
import {
  isAdminNavActive,
  resolveAdminNavItems,
  splitAdminNavForMobile,
} from "@/lib/admin/admin-dashboard-nav-config";
import type { Content } from "@/content/en";

interface AdminBottomNavProps {
  labels: Content["admin"]["nav"];
}

export function AdminBottomNav({ labels }: AdminBottomNavProps) {
  const pathname = usePathname();
  const portal = useAdminPortalOptional();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = resolveAdminNavItems(labels, portal?.role, portal?.permissions);
  const { primary, overflow } = splitAdminNavForMobile(items);
  const overflowActive = overflow.some((item) => isAdminNavActive(pathname, item.href));
  const columnCount = primary.length + (overflow.length > 0 ? 1 : 0);

  return (
    <>
      <nav className={bottomNavShellClassName} aria-label="Admin navigation">
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {primary.map((item) => {
            const active = isAdminNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={bottomNavItemClass(active)}
                >
                  <span className={bottomNavIconWrapClass(active)}>
                    <Icon
                      className={bottomNavIconClass(active)}
                      strokeWidth={bottomNavIconStroke(active)}
                      aria-hidden
                    />
                  </span>
                  {item.shortLabel}
                </Link>
              </li>
            );
          })}
          {overflow.length > 0 ? (
            <li>
              <button
                type="button"
                aria-current={overflowActive ? "page" : undefined}
                className={bottomNavItemClass(overflowActive)}
                onClick={() => setMoreOpen(true)}
              >
                <span className={bottomNavIconWrapClass(overflowActive)}>
                  <MoreHorizontal
                    className={bottomNavIconClass(overflowActive)}
                    strokeWidth={bottomNavIconStroke(overflowActive)}
                    aria-hidden
                  />
                </span>
                More
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      {overflow.length > 0 ? (
        <AdminMoreSheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          items={overflow}
        />
      ) : null}
    </>
  );
}
