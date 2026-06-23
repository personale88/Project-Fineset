"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Phone, Plus } from "lucide-react";
import { content } from "@/content/en";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  bottomNavIconClass,
  bottomNavIconStroke,
  bottomNavIconWrapClass,
  bottomNavItemClass,
  bottomNavShellClassName,
} from "@/components/layout/bottom-nav-styles";
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
      <nav className={bottomNavShellClassName} aria-label={copy.label}>
        <ul className="mx-auto grid w-full max-w-lg grid-cols-3 items-center px-page-x">
          <li className="flex min-w-0 justify-center">
            <Link
              href={STAFF_DASHBOARD_PATH}
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
          <li className="flex min-w-0 justify-center">
            <button
              type="button"
              onClick={() => setLogOpen(true)}
              className={bottomNavItemClass(false)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold text-white shadow-[0_4px_14px_-4px_rgba(184,134,11,0.55)] ring-2 ring-brand-gold/20 transition-transform duration-200 active:scale-95">
                <Plus className="h-[22px] w-[22px]" strokeWidth={2.35} aria-hidden />
              </span>
              {copy.log}
            </button>
          </li>
          <li className="flex min-w-0 justify-center">
            <Link
              href={`${STAFF_DASHBOARD_PATH}/calls`}
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
        </ul>
      </nav>

      <StaffLogSheet open={logOpen} onOpenChange={setLogOpen} />
    </>
  );
}
