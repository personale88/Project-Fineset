"use client";

import { useMemo, useState } from "react";
import { Building2, Users } from "lucide-react";
import { useAdminDashboardOverview } from "@/hooks/useAnalytics";
import { KPICard } from "@/components/analytics/KPICard";
import { PeriodSwitcher, type PeriodValue } from "@/components/shared/PeriodSwitcher";
import { buildPeriodSwitcherOptions } from "@/lib/utils/analytics-period-url";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Content } from "@/content/en";
import type { GetAnalyticsParams, StoreCategory } from "@/types";
import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import { StorePerformanceCard } from "./overview/StorePerformanceCard";

type AdminContent = Content["admin"];

interface AdminOverviewProps {
  admin: AdminContent;
  initialOverview?: import("@/types").AdminDashboardOverview;
  initialParams?: GetAnalyticsParams;
}

export function AdminOverview({
  admin,
  initialOverview,
  initialParams,
}: AdminOverviewProps) {
  const [period, setPeriod] = useState<PeriodValue>("today");
  const [categoryFilter, setCategoryFilter] = useState<StoreCategory | "ALL">("ALL");
  const { data, isLoading } = useAdminDashboardOverview(
    { period },
    { initialData: initialOverview, initialParams },
  );

  const periodOptions = buildPeriodSwitcherOptions(admin.period);

  const filteredStores = useMemo(() => {
    const stores = data?.stores ?? [];
    if (categoryFilter === "ALL") return stores;
    return stores.filter((store) => store.category === categoryFilter);
  }, [categoryFilter, data?.stores]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {admin.overview.title}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">{admin.overview.subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={categoryFilter}
              onValueChange={(value) =>
                setCategoryFilter(value as StoreCategory | "ALL")
              }
            >
              <SelectTrigger className="w-full sm:w-44" id="category-filter">
                <SelectValue placeholder={admin.overview.allCategories} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{admin.overview.allCategories}</SelectItem>
                {Object.entries(admin.categories).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <PeriodSwitcher options={periodOptions} value={period} onChange={setPeriod} />
          </div>
        </div>
        <AdminDashboardNav labels={admin.nav} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 [&>*]:min-w-0">
        <KPICard
          label={admin.overview.totalStores}
          value={data?.totalStores ?? 0}
          icon={<Building2 className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <KPICard
          label={admin.overview.activeStores}
          value={data?.activeStores ?? 0}
          icon={<Building2 className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <KPICard
          label={admin.overview.listedStores}
          value={filteredStores.length}
          icon={<Users className="h-4 w-4" />}
          isLoading={isLoading}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-live="polite">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-card" />
          ))}
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="rounded-card border border-border bg-surface-card p-8 text-center shadow-card">
          <p className="text-text-secondary">{admin.overview.emptyStores}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStores.map((store) => (
            <StorePerformanceCard key={store.storeId} store={store} admin={admin} />
          ))}
        </div>
      )}

    </div>
  );
}
