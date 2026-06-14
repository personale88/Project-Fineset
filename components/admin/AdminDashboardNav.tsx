"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutGrid, ScrollText, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";

type AdminNavLabels = Content["admin"]["nav"];

const NAV_ITEMS = [
  { href: "/admin/dashboard", labelKey: "overview" as const, icon: LayoutGrid },
  { href: "/admin/dashboard/analytics", labelKey: "analytics" as const, icon: BarChart3 },
  { href: "/admin/dashboard/stores", labelKey: "stores" as const, icon: Store },
  { href: "/admin/dashboard/audit", labelKey: "audit" as const, icon: ScrollText },
] as const;

function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

interface AdminDashboardNavProps {
  labels: AdminNavLabels;
  className?: string;
}

export function AdminDashboardNav({ labels, className }: AdminDashboardNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin dashboard"
      className={cn("border-b border-border", className)}
    >
      <div
        className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isAdminNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                active
                  ? "border-brand-gold text-brand-gold"
                  : "border-transparent text-text-muted hover:border-border hover:text-text-primary",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-brand-gold" : "text-text-muted",
                )}
                aria-hidden
              />
              {labels[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
