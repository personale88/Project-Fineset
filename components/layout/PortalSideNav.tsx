"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  portalSideNavFixedClassName,
  portalSideNavShellClassName,
  portalSideNavWidthClassName,
} from "@/components/layout/portal-side-nav-styles";

export interface PortalSideNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface PortalSideNavProps {
  items: PortalSideNavItem[];
  ariaLabel: string;
  isActive?: (pathname: string, href: string) => boolean;
  className?: string;
  /** Pin flush to the viewport left edge, full viewport height. */
  fixed?: boolean;
  /** Optional brand mark rendered at the top of the rail (e.g. logo). */
  brand?: React.ReactNode;
}

function defaultIsActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function PortalSideNavLink({
  href,
  label,
  icon: Icon,
  active,
}: PortalSideNavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cn(
        "relative flex w-full flex-col items-center justify-center gap-1 px-1 py-3 text-center transition-colors",
        active
          ? "text-brand-gold"
          : "text-text-muted hover:bg-surface-secondary/60 hover:text-text-primary",
      )}
    >
      {active ? (
        <span
          className="absolute bottom-2 left-0 top-2 w-0.5 rounded-r bg-brand-gold"
          aria-hidden
        />
      ) : null}
      <Icon
        className={cn("size-5 shrink-0", active ? "text-brand-gold" : "text-text-muted")}
        aria-hidden
      />
      <span className="w-full break-words text-[10px] font-medium leading-tight">{label}</span>
    </Link>
  );
}

/** Reusable slim side navigation: icon stacked above label in an 80px rail. */
export function PortalSideNav({
  items,
  ariaLabel,
  isActive = defaultIsActive,
  className,
  fixed = false,
  brand,
}: PortalSideNavProps) {
  const pathname = usePathname();

  return (
    <aside
      data-testid="portal-side-nav"
      className={cn(
        fixed ? portalSideNavFixedClassName : portalSideNavShellClassName,
        !fixed && portalSideNavWidthClassName,
        className,
      )}
    >
      {brand ? (
        <div className="flex shrink-0 items-center justify-center border-b border-border px-2 py-4">
          {brand}
        </div>
      ) : null}
      <nav
        aria-label={ariaLabel}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <PortalSideNavLink
            key={item.href}
            {...item}
            active={isActive(pathname, item.href)}
          />
        ))}
      </nav>
    </aside>
  );
}
