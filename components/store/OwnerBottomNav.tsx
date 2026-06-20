"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, MoreHorizontal, Phone } from "lucide-react";
import { useState } from "react";
import { content } from "@/content/en";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { cn } from "@/lib/utils";
import { OwnerMoreSheet } from "@/components/store/OwnerMoreSheet";

export function OwnerBottomNav() {
  const pathname = usePathname();
  const copy = content.store.ownerShell.bottomNav;
  const { storeId } = useStoreDashboard();
  const [moreOpen, setMoreOpen] = useState(false);

  const homeActive = pathname === BUSINESS_OWNER_DASHBOARD_PATH;
  const callsActive = pathname.startsWith(`${BUSINESS_OWNER_DASHBOARD_PATH}/calls`);
  const followUpsActive = pathname.startsWith(
    `${BUSINESS_OWNER_DASHBOARD_PATH}/follow-ups`,
  );

  const navClass = (active: boolean) =>
    cn(
      "flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium",
      active ? "text-brand-gold" : "text-text-muted",
    );

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label={copy.label}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          <li>
            <Link
              href={BUSINESS_OWNER_DASHBOARD_PATH}
              aria-current={homeActive ? "page" : undefined}
              className={navClass(homeActive)}
            >
              <Home className="h-5 w-5" aria-hidden />
              {copy.home}
            </Link>
          </li>
          <li>
            <Link
              href={portalSectionPath("calls", "BUSINESS_OWNER", storeId)}
              aria-current={callsActive ? "page" : undefined}
              className={navClass(callsActive)}
            >
              <Phone className="h-5 w-5" aria-hidden />
              {copy.calls}
            </Link>
          </li>
          <li>
            <Link
              href={portalSectionPath("follow-ups", "BUSINESS_OWNER", storeId)}
              aria-current={followUpsActive ? "page" : undefined}
              className={navClass(followUpsActive)}
            >
              <History className="h-5 w-5" aria-hidden />
              {copy.followUps}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex w-full flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium text-text-muted"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              {copy.more}
            </button>
          </li>
        </ul>
      </nav>

      <OwnerMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
