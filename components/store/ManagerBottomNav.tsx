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
import { cn } from "@/lib/utils";
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

  const navClass = (active: boolean) =>
    cn(
      "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium",
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
              href={STORE_MANAGER_DASHBOARD_PATH}
              aria-current={homeActive ? "page" : undefined}
              className={navClass(homeActive)}
            >
              <Home className="h-5 w-5" aria-hidden />
              {copy.home}
            </Link>
          </li>
          <li>
            <Link
              href={storeManagerHomeHubHref("my-work")}
              aria-current={myWorkActive ? "page" : undefined}
              className={navClass(myWorkActive)}
            >
              <Briefcase className="h-5 w-5" aria-hidden />
              {copy.myWork}
            </Link>
          </li>
          <li>
            <Link
              href={storeManagerHomeHubHref("team")}
              aria-current={teamActive ? "page" : undefined}
              className={navClass(teamActive)}
            >
              <Users className="h-5 w-5" aria-hidden />
              {copy.team}
            </Link>
          </li>
          <li>
            <Link
              href={analyticsHref}
              aria-current={analyticsActive ? "page" : undefined}
              className={navClass(analyticsActive)}
            >
              <BarChart3 className="h-5 w-5" aria-hidden />
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
