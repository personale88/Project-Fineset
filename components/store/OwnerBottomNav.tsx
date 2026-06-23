"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, MoreHorizontal, Phone } from "lucide-react";
import { useState } from "react";
import { content } from "@/content/en";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import {
  bottomNavIconClass,
  bottomNavIconStroke,
  bottomNavIconWrapClass,
  bottomNavItemClass,
  bottomNavShellClassName,
} from "@/components/layout/bottom-nav-styles";
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

  return (
    <>
      <nav className={bottomNavShellClassName} aria-label={copy.label}>
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          <li>
            <Link
              href={BUSINESS_OWNER_DASHBOARD_PATH}
              aria-current={homeActive ? "page" : undefined}
              className={bottomNavItemClass(homeActive)}
            >
              <span className={bottomNavIconWrapClass(homeActive)}>
                <Home
                  className={bottomNavIconClass(homeActive)}
                  strokeWidth={bottomNavIconStroke(homeActive)}
                  aria-hidden
                />
              </span>
              {copy.home}
            </Link>
          </li>
          <li>
            <Link
              href={portalSectionPath("calls", "BUSINESS_OWNER", storeId)}
              aria-current={callsActive ? "page" : undefined}
              className={bottomNavItemClass(callsActive)}
            >
              <span className={bottomNavIconWrapClass(callsActive)}>
                <Phone
                  className={bottomNavIconClass(callsActive)}
                  strokeWidth={bottomNavIconStroke(callsActive)}
                  aria-hidden
                />
              </span>
              {copy.calls}
            </Link>
          </li>
          <li>
            <Link
              href={portalSectionPath("follow-ups", "BUSINESS_OWNER", storeId)}
              aria-current={followUpsActive ? "page" : undefined}
              className={bottomNavItemClass(followUpsActive)}
            >
              <span className={bottomNavIconWrapClass(followUpsActive)}>
                <History
                  className={bottomNavIconClass(followUpsActive)}
                  strokeWidth={bottomNavIconStroke(followUpsActive)}
                  aria-hidden
                />
              </span>
              {copy.followUps}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={bottomNavItemClass(false)}
            >
              <span className={bottomNavIconWrapClass(false)}>
                <MoreHorizontal
                  className={bottomNavIconClass(false)}
                  strokeWidth={bottomNavIconStroke(false)}
                  aria-hidden
                />
              </span>
              {copy.more}
            </button>
          </li>
        </ul>
      </nav>

      <OwnerMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
