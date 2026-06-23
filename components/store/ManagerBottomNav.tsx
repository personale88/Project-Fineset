"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Briefcase, Home, Plus, Users } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  storeManagerDetailPath,
  storeManagerHomeHubHref,
} from "@/lib/utils/store-dashboard-url";
import {
  bottomNavIconClass,
  bottomNavIconStroke,
  bottomNavIconWrapClass,
  bottomNavItemClass,
  bottomNavShellClassName,
} from "@/components/layout/bottom-nav-styles";
import { ManagerLogSheet } from "@/components/store/ManagerLogSheet";
import { useState } from "react";

export function ManagerBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hubParam = searchParams.get("hub");
  const copy = content.store.managerShell.bottomNav;
  const { staffLinked } = useManagerActor();
  const { storeId } = useStoreDashboard();
  const [logOpen, setLogOpen] = useState(false);

  const analyticsHref = storeId ? storeManagerDetailPath(storeId) : STORE_MANAGER_DASHBOARD_PATH;

  const homeActive =
    pathname === STORE_MANAGER_DASHBOARD_PATH && hubParam !== "team" && hubParam !== "my-work";
  const myWorkActive =
    hubParam === "my-work" ||
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/my-work`) ||
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/my-`) ||
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/log-`);
  const teamRoutes = [
    "/team",
    "/calls",
    "/follow-ups",
    "/visits",
    "/field-sales",
    "/staff",
    "/activity",
  ];
  const teamActive =
    hubParam === "team" ||
    teamRoutes.some((segment) =>
      pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}${segment}`),
    );
  const analyticsActive =
    Boolean(storeId) &&
    pathname.startsWith(storeManagerDetailPath(storeId as string));

  const navItem = (active: boolean) => bottomNavItemClass(active);

  return (
    <>
      <nav className={bottomNavShellClassName} aria-label={copy.label}>
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          <li>
            <Link
              href={STORE_MANAGER_DASHBOARD_PATH}
              aria-current={homeActive ? "page" : undefined}
              className={navItem(homeActive)}
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
              href={storeManagerHomeHubHref("my-work")}
              aria-current={myWorkActive ? "page" : undefined}
              className={navItem(myWorkActive)}
            >
              <span className={bottomNavIconWrapClass(myWorkActive)}>
                <Briefcase
                  className={bottomNavIconClass(myWorkActive)}
                  strokeWidth={bottomNavIconStroke(myWorkActive)}
                  aria-hidden
                />
              </span>
              {copy.myWork}
            </Link>
          </li>
          <li>
            <Link
              href={storeManagerHomeHubHref("team")}
              aria-current={teamActive ? "page" : undefined}
              className={navItem(teamActive)}
            >
              <span className={bottomNavIconWrapClass(teamActive)}>
                <Users
                  className={bottomNavIconClass(teamActive)}
                  strokeWidth={bottomNavIconStroke(teamActive)}
                  aria-hidden
                />
              </span>
              {copy.team}
            </Link>
          </li>
          <li>
            <Link
              href={analyticsHref}
              aria-current={analyticsActive ? "page" : undefined}
              className={navItem(analyticsActive)}
            >
              <span className={bottomNavIconWrapClass(analyticsActive)}>
                <BarChart3
                  className={bottomNavIconClass(analyticsActive)}
                  strokeWidth={bottomNavIconStroke(analyticsActive)}
                  aria-hidden
                />
              </span>
              {copy.analytics}
            </Link>
          </li>
        </ul>
      </nav>

      {staffLinked ? (
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold text-white shadow-lg sm:hidden"
          aria-label={copy.log}
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <ManagerLogSheet open={logOpen} onOpenChange={setLogOpen} />
    </>
  );
}
