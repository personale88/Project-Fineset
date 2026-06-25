"use client";

import { Store } from "lucide-react";
import { ProfileStoreFilter } from "@/components/store/profile/ProfileStoreFilter";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import type { ProfileCopy } from "@/components/store/profile/profile-scope";
import type { ManagerStoreOption } from "@/types";

interface PortalProfilePreferencesProps {
  copy: ProfileCopy["preferences"];
  portalRole: "STORE_MANAGER" | "BUSINESS_OWNER";
  assignedStore?: ManagerStoreOption | null;
}

function StoreContextCard({
  store,
  locationFallback,
}: {
  store: ManagerStoreOption;
  locationFallback: string;
}) {
  const location = [store.city, store.state].filter(Boolean).join(", ");

  return (
    <div className="rounded-input border border-border bg-surface-secondary/30 px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gold/10 text-brand-gold">
          <Store className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{store.name}</p>
          <p className="mt-0.5 text-xs text-text-muted">{location || locationFallback}</p>
        </div>
      </div>
    </div>
  );
}

export function PortalProfilePreferences({
  copy,
  portalRole,
  assignedStore = null,
}: PortalProfilePreferencesProps) {
  const isOwner = portalRole === "BUSINESS_OWNER";
  const { storeId, setStoreId, stores, hasMultipleStores } = useStoreDashboard();
  const activeStoreId = storeId ?? stores[0]?.id ?? assignedStore?.id ?? null;
  const activeStore =
    stores.find((store) => store.id === activeStoreId) ??
    assignedStore ??
    stores[0] ??
    null;

  if (isOwner && hasMultipleStores) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{copy.activeStoreLabel}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{copy.activeStoreHint}</p>
        </div>
        {activeStoreId ? (
          <ProfileStoreFilter
            stores={stores}
            activeStoreId={activeStoreId}
            onSelect={setStoreId}
            label={copy.activeStoreLabel}
          />
        ) : null}
      </div>
    );
  }

  if (activeStore) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            {isOwner ? copy.singleStoreTitle : copy.managerStoreTitle}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
            {isOwner ? copy.singleStoreHint : copy.managerStoreHint}
          </p>
        </div>
        <StoreContextCard store={activeStore} locationFallback={copy.locationFallback} />
      </div>
    );
  }

  return <p className="text-sm text-text-muted">{copy.empty}</p>;
}
