"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, MoreHorizontal, Plus, Users } from "lucide-react";
import { content } from "@/content/en";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { cn } from "@/lib/utils";
import { ManagerMoreSheet } from "@/components/store/ManagerMoreSheet";
import { ManagerLogSheet } from "@/components/store/ManagerLogSheet";
import { useState } from "react";

export function ManagerBottomNav() {
  const pathname = usePathname();
  const copy = content.store.managerShell.bottomNav;
  const [moreOpen, setMoreOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const homeActive = pathname === STORE_MANAGER_DASHBOARD_PATH;
  const myWorkActive =
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/my-work`) ||
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/my-`) ||
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}/log-`);
  const teamRoutes = ["/team", "/calls", "/visits", "/field-sales", "/follow-ups", "/staff"];
  const teamActive = teamRoutes.some((segment) =>
    pathname.startsWith(`${STORE_MANAGER_DASHBOARD_PATH}${segment}`),
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
              href={`${STORE_MANAGER_DASHBOARD_PATH}/my-work`}
              aria-current={myWorkActive ? "page" : undefined}
              className={navClass(myWorkActive)}
            >
              <Briefcase className="h-5 w-5" aria-hidden />
              {copy.myWork}
            </Link>
          </li>
          <li>
            <Link
              href={`${STORE_MANAGER_DASHBOARD_PATH}/team`}
              aria-current={teamActive ? "page" : undefined}
              className={navClass(teamActive)}
            >
              <Users className="h-5 w-5" aria-hidden />
              {copy.team}
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

      <button
        type="button"
        onClick={() => setLogOpen(true)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold text-white shadow-lg sm:hidden"
        aria-label={copy.log}
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>

      <ManagerLogSheet open={logOpen} onOpenChange={setLogOpen} />
      <ManagerMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
