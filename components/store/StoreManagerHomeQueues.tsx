"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { ManagerWorkHub } from "@/components/store/ManagerWorkHub";
import { StoreCorrectionRequests } from "@/components/store/StoreCorrectionRequests";
import { StoreManagerTeamActivity } from "@/components/store/StoreManagerTeamActivity";
import { StoreManagerWorkQueue } from "@/components/store/StoreManagerWorkQueue";
import {
  buildManagerMyWorkHubLinks,
  buildManagerTeamHubLinks,
} from "@/components/store/manager-nav-links";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { cn } from "@/lib/utils";

type HomeQueueTab = "store" | "personal";
type HomeHubTab = "team" | "myWork";

function HomeTabList<T extends string>({
  label,
  options,
  value,
  onChange,
  getLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (option: T) => string;
}) {
  return (
    <div
      className="inline-flex rounded-input border border-border bg-surface-secondary/60 p-0.5"
      role="tablist"
      aria-label={label}
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-input px-4 py-2 text-sm font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
            value === option
              ? "bg-surface-card text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

function parseHubTab(hub: string | null): HomeHubTab {
  return hub === "my-work" ? "myWork" : "team";
}

export function StoreManagerHomeQueues({ storeId }: { storeId: string }) {
  const copy = content.store.managerDashboard;
  const hubs = content.store.managerShell.hubs;
  const actorCopy = content.store.managerShell.actorSetup;
  const { staffLinked } = useManagerActor();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hubParam = searchParams.get("hub");
  const [queueTab, setQueueTab] = useState<HomeQueueTab>("store");
  const [hubTab, setHubTab] = useState<HomeHubTab>(() => parseHubTab(hubParam));

  const [prevHubParam, setPrevHubParam] = useState(hubParam);
  if (hubParam !== prevHubParam) {
    setPrevHubParam(hubParam);
    setHubTab(parseHubTab(hubParam));
  }

  useEffect(() => {
    if (hubParam !== "team" && hubParam !== "my-work") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  function updateHubTab(next: HomeHubTab) {
    setHubTab(next);
    if (pathname !== STORE_MANAGER_DASHBOARD_PATH) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("hub", next === "team" ? "team" : "my-work");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <HomeTabList
          label={copy.homeQueues.tabListLabel}
          options={["store", "personal"] as const}
          value={queueTab}
          onChange={setQueueTab}
          getLabel={(option) =>
            option === "store" ? copy.homeQueues.storeTab : copy.homeQueues.personalTab
          }
        />

        {queueTab === "store" ? (
          <StoreManagerWorkQueue storeId={storeId} variant="store" />
        ) : staffLinked ? (
          <StoreManagerWorkQueue storeId={storeId} variant="personal" />
        ) : (
          <p className="rounded-card border border-border bg-surface-card px-4 py-6 text-sm text-text-secondary">
            {actorCopy.dashboardHint}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <HomeTabList
          label={copy.homeQueues.hubTabListLabel}
          options={["team", "myWork"] as const}
          value={hubTab}
          onChange={updateHubTab}
          getLabel={(option) =>
            option === "team" ? copy.homeQueues.teamHubTab : copy.homeQueues.myWorkHubTab
          }
        />

        {hubTab === "team" ? (
          <div className="space-y-8">
            <ManagerWorkHub
              embedded
              title={hubs.team.title}
              subtitle={hubs.team.subtitle}
              links={buildManagerTeamHubLinks(storeId)}
            />
            <StoreManagerTeamActivity storeId={storeId} />
            <StoreCorrectionRequests storeId={storeId} />
          </div>
        ) : staffLinked ? (
          <ManagerWorkHub
            embedded
            title={hubs.myWork.title}
            subtitle={hubs.myWork.subtitle}
            links={buildManagerMyWorkHubLinks()}
          />
        ) : (
          <p className="rounded-card border border-border bg-surface-card px-4 py-6 text-sm text-text-secondary">
            {actorCopy.dashboardHint}
          </p>
        )}
      </section>
    </div>
  );
}
