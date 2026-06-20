"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Phone, Plus } from "lucide-react";
import { content } from "@/content/en";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { cn } from "@/lib/utils";
import { StaffLogSheet } from "@/components/staff/StaffLogSheet";
import { useState } from "react";

export function StaffBottomNav() {
  const pathname = usePathname();
  const copy = content.staff.bottomNav;
  const [logOpen, setLogOpen] = useState(false);

  const homeActive =
    pathname === STAFF_DASHBOARD_PATH ||
    pathname.startsWith(`${STAFF_DASHBOARD_PATH}/my-`);
  const callsActive = pathname.startsWith(`${STAFF_DASHBOARD_PATH}/calls`);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label={copy.label}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-3">
          <li>
            <Link
              href={STAFF_DASHBOARD_PATH}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium",
                homeActive ? "text-brand-gold" : "text-text-muted",
              )}
            >
              <Home className="h-5 w-5" aria-hidden />
              {copy.home}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className="flex w-full flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium text-text-muted"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold text-white">
                <Plus className="h-4 w-4" aria-hidden />
              </span>
              {copy.log}
            </button>
          </li>
          <li>
            <Link
              href={`${STAFF_DASHBOARD_PATH}/calls`}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium",
                callsActive ? "text-brand-gold" : "text-text-muted",
              )}
            >
              <Phone className="h-5 w-5" aria-hidden />
              {copy.calls}
            </Link>
          </li>
        </ul>
      </nav>

      <StaffLogSheet open={logOpen} onOpenChange={setLogOpen} />
    </>
  );
}
