"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, LogOut, Store } from "lucide-react";
import { content } from "@/content/en";
import { PortalProfileBilling } from "@/components/store/profile/PortalProfileBilling";
import { PortalBillingTariffButton } from "@/components/store/profile/PortalBillingTariffButton";
import { PortalProfilePreferences } from "@/components/store/profile/PortalProfilePreferences";
import {
  PortalProfileSupport,
  type PortalSupportContact,
} from "@/components/store/profile/PortalProfileSupport";
import {
  PortalProfileSidePanel,
  ProfileResultsHeader,
} from "@/components/store/profile/PortalProfileSidePanel";
import {
  parseProfileSection,
  profileScopeMeta,
  type ProfileScope,
} from "@/components/store/profile/profile-scope";
import { ProfileStoreFilter } from "@/components/store/profile/ProfileStoreFilter";
import { PortalStoreActivityLog } from "@/components/store/PortalStoreActivityLog";
import { SelectStorePrompt } from "@/components/store/SelectStorePrompt";
import { StaffManagement } from "@/components/store/StaffManagement";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { usePortalSignOut } from "@/hooks/usePortalSignOut";
import { Button } from "@/components/ui/button";
import { portalDashboardPath, storeDetailPathForRole } from "@/lib/utils/store-dashboard-url";
import type { getStaff } from "@/lib/api/staff";
import type { ManagerStoreOption } from "@/types";

export interface PortalProfileAccount {
  name: string;
  email: string;
}

interface PortalProfileProps {
  portalRole: "STORE_MANAGER" | "BUSINESS_OWNER";
  account: PortalProfileAccount;
  supportContact: PortalSupportContact;
  assignedStore?: ManagerStoreOption | null;
  initialStaff?: Awaited<ReturnType<typeof getStaff>>;
  initialStaffStoreId?: string;
  initialSection?: ProfileScope;
}

function accountInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function PortalProfile({
  portalRole,
  account,
  supportContact,
  assignedStore = null,
  initialStaff,
  initialStaffStoreId,
  initialSection = "account",
}: PortalProfileProps) {
  const isOwner = portalRole === "BUSINESS_OWNER";
  const copy = isOwner ? content.store.ownerShell.profile : content.store.managerShell.profile;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [scope, setScopeState] = useState<ProfileScope>(
    () => parseProfileSection(searchParams.get("section")) ?? initialSection,
  );
  const { storeId, setStoreId, stores, hasMultipleStores } = useStoreDashboard();
  const { signOut, isSigningOut } = usePortalSignOut();
  const { title, description } = profileScopeMeta(copy, scope);

  const setScope = useCallback(
    (value: ProfileScope) => {
      setScopeState(value);
      const next = new URLSearchParams(searchParams.toString());
      if (value === "account") {
        next.delete("section");
      } else {
        next.set("section", value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const dashboardPath = portalDashboardPath(portalRole);
  const backLabel = content.store.storeDetail.backToPortal;
  const displayStores = isOwner ? stores : assignedStore ? [assignedStore] : [];
  const showStorePicker = isOwner && hasMultipleStores;
  const activeStoreId = storeId ?? stores[0]?.id ?? assignedStore?.id ?? null;
  const ownerActivityCopy = content.store.ownerShell.activityLog;

  return (
    <div className="space-y-6">
      <header className="min-w-0 space-y-3">
        <Link
          href={dashboardPath}
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
        <div className="flex items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-brand-gold/35 bg-surface-card font-display text-base font-semibold text-brand-gold shadow-sm sm:h-14 sm:w-14 sm:text-lg"
            aria-hidden
          >
            {accountInitials(account.name, account.email)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
              {copy.roleBadge}
            </p>
            <h1 className="font-display text-2xl font-bold text-text-primary sm:text-3xl">
              {copy.pageTitle}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {account.name.trim() || copy.fallbackName} · {account.email}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">{copy.subtitle}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <PortalProfileSidePanel
          copy={copy}
          value={scope}
          onChange={setScope}
          panelIcon={isOwner ? Building2 : Store}
        />

        <section
          className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-card lg:min-h-[520px]"
          role="tabpanel"
          aria-label={title}
        >
          <ProfileResultsHeader
            title={title}
            description={description}
            action={
              scope === "billing" ? (
                <PortalBillingTariffButton copy={copy.billing} />
              ) : undefined
            }
          />

          <div className="px-4 py-4 sm:px-5">
            {scope === "account" ? (
              <div className="space-y-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      {copy.account.nameLabel}
                    </dt>
                    <dd className="mt-1 text-sm text-text-primary">
                      {account.name.trim() || copy.fallbackName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      {copy.account.emailLabel}
                    </dt>
                    <dd className="mt-1 text-sm text-text-primary">{account.email}</dd>
                  </div>
                </dl>

                <div className="space-y-3 border-t border-border pt-5">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {copy.businesses.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-text-muted">{copy.businesses.description}</p>
                  </div>
                  {displayStores.length === 0 ? (
                    <p className="text-sm text-text-muted">{copy.businesses.empty}</p>
                  ) : (
                    <ul className="space-y-2">
                      {displayStores.map((store) => (
                        <li key={store.id}>
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-border bg-surface-secondary/30 px-3 py-3">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                                <Store
                                  className="h-4 w-4 shrink-0 text-brand-gold"
                                  aria-hidden
                                />
                                {store.name}
                              </p>
                              <p className="mt-0.5 text-xs text-text-muted">
                                {[store.city, store.state].filter(Boolean).join(", ") ||
                                  copy.businesses.locationFallback}
                              </p>
                            </div>
                            <Button asChild size="sm" variant="outline">
                              <Link href={storeDetailPathForRole(store.id, portalRole)}>
                                {copy.businesses.openStore}
                              </Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            {scope === "staff" ? (
              activeStoreId ? (
                <div className="space-y-4">
                  {showStorePicker ? (
                    <ProfileStoreFilter
                      stores={stores}
                      activeStoreId={activeStoreId}
                      onSelect={setStoreId}
                      label={ownerActivityCopy.storeFilterLabel}
                    />
                  ) : null}
                  <StaffManagement
                    embedded
                    store={content.store}
                    storeId={activeStoreId}
                    emptyMessage={content.empty.staff}
                    errors={content.errors}
                    initialStaff={
                      initialStaffStoreId === activeStoreId ? initialStaff : undefined
                    }
                    readOnly={!isOwner}
                    showImport={isOwner}
                  />
                </div>
              ) : hasMultipleStores ? (
                <SelectStorePrompt store={content.store} />
              ) : (
                <p className="text-sm text-text-muted">{copy.businesses.empty}</p>
              )
            ) : null}

            {scope === "activity" ? (
              activeStoreId ? (
                <PortalStoreActivityLog portalRole={portalRole} embedded />
              ) : hasMultipleStores ? (
                <SelectStorePrompt store={content.store} />
              ) : (
                <p className="text-sm text-text-muted">{copy.businesses.empty}</p>
              )
            ) : null}

            {scope === "billing" ? <PortalProfileBilling copy={copy.billing} /> : null}

            {scope === "preferences" ? (
              <PortalProfilePreferences
                copy={copy.preferences}
                portalRole={portalRole}
                assignedStore={assignedStore}
              />
            ) : null}

            {scope === "support" ? (
              <PortalProfileSupport
                copy={copy.support}
                contact={supportContact}
                portalRole={portalRole}
                accountName={account.name}
                accountEmail={account.email}
              />
            ) : null}

            {scope === "signOut" ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-secondary">{copy.signOut.description}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={isSigningOut}
                  onClick={() => void signOut()}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  {isSigningOut ? copy.signOut.pending : copy.signOut.action}
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
