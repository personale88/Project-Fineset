"use client";

import Link from "next/link";
import {
  ClipboardList,
  History,
  ListTodo,
  MapPin,
  Phone,
  Route,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ManagerHubLink, ManagerHubLinkId } from "@/components/store/manager-nav-links";
import { cn } from "@/lib/utils";

const HUB_ICONS: Record<ManagerHubLinkId, LucideIcon> = {
  teamCalls: Phone,
  followUps: ListTodo,
  visitsLog: History,
  staffRoster: Users,
  activity: ScrollText,
  fieldSalesLog: Route,
  myCalls: Phone,
  callUsers: Phone,
  myFollowUps: ListTodo,
  myVisits: History,
  myFieldSales: Route,
  logVisit: ClipboardList,
  logFieldSale: MapPin,
};

interface ManagerWorkHubProps {
  title: string;
  subtitle: string;
  links: ManagerHubLink[];
  embedded?: boolean;
  linksOnly?: boolean;
}

export function ManagerWorkHub({
  title,
  subtitle,
  links,
  embedded = false,
  linksOnly = false,
}: ManagerWorkHubProps) {
  return (
    <div className="space-y-4">
      {!linksOnly && !embedded ? (
        <header className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">{title}</h1>
          <p className="text-text-secondary">{subtitle}</p>
        </header>
      ) : !linksOnly && embedded && subtitle ? (
        <p className="text-sm text-text-muted">{subtitle}</p>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {links.map((link) => {
          const Icon = HUB_ICONS[link.id];

          return (
            <li key={link.href} className="min-h-[9.5rem]">
              <Link
                href={link.href}
                className={cn(
                  "group flex h-full flex-col rounded-card border border-border bg-surface-card p-4 shadow-card transition-all",
                  "hover:border-brand-gold/35 hover:bg-brand-gold/[0.03] hover:shadow-md",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
                )}
              >
                <span
                  className={cn(
                    "mb-3 flex h-10 w-10 items-center justify-center rounded-input",
                    "bg-surface-secondary text-brand-gold ring-1 ring-border/70",
                    "transition-colors group-hover:bg-brand-gold/10 group-hover:ring-brand-gold/30",
                  )}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>

                <span className="font-display text-base font-semibold leading-snug text-text-primary">
                  {link.title}
                </span>

                <span className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-text-muted sm:text-sm">
                  {link.description}
                </span>

                <span className="mt-3 text-xs font-medium text-brand-gold opacity-80 transition-opacity group-hover:opacity-100">
                  {link.cta} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
