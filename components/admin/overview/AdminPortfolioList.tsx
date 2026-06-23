"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  Store,
} from "lucide-react";
import { useAdminDashboardOverview } from "@/hooks/useAnalytics";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { AdminStoreListItem } from "@/components/admin/overview/AdminStoreListItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingCycleSettings } from "@/components/admin/BillingCycleSettingsProvider";
import { cn } from "@/lib/utils";
import {
  businessMatchesAreaFilter,
  businessMatchesPaymentFilter,
  derivePortfolioAreaOptions,
  type AdminPortfolioPaymentStatus,
} from "@/lib/utils/admin-portfolio-filters";
import { getBillingPaymentStatusCopy } from "@/lib/utils/billing-status-labels";
import { formatDate } from "@/lib/utils/formatters";
import type { Content } from "@/content/en";
import type {
  AdminDashboardOverview,
  BusinessPortfolioRow,
  StoreCategory,
} from "@/types";

type AdminContent = Content["admin"];

const PAGE_SIZE = 20;

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type PaymentFilter = "ALL" | AdminPortfolioPaymentStatus;

function PortfolioTabList({
  value,
  onChange,
  options,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  options: { value: StatusFilter; label: string }[];
}) {
  return (
    <div
      className="inline-flex max-w-full rounded-input border border-border bg-surface-secondary/60 p-0.5"
      role="tablist"
      aria-label="Store status filter"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-[6px] px-3 py-1.5 text-sm transition-colors",
            value === option.value
              ? "bg-surface-card font-semibold text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BusinessPortfolioCard({
  business,
  admin,
  expanded,
  onToggle,
}: {
  business: BusinessPortfolioRow;
  admin: AdminContent;
  expanded: boolean;
  onToggle: () => void;
}) {
  const storeSummary =
    business.storeCount === 1
      ? admin.portfolio.singleStore
      : admin.portfolio.storeCount.replace("{count}", String(business.storeCount));

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface-card shadow-card">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={cn(
          "flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-secondary/30 sm:px-5",
          expanded && "border-b border-border",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate font-display text-lg font-semibold text-text-primary">
              {business.businessName}
            </h2>
            {!business.hasBusinessEmail ? (
              <span className="rounded-full bg-status-warning/10 px-2 py-0.5 text-xs font-medium text-status-warning">
                {admin.portfolio.noBusinessEmail}
              </span>
            ) : null}
          </div>
          {business.ownerName ? (
            <p className="mt-0.5 text-sm text-text-secondary">{business.ownerName}</p>
          ) : null}
          {business.businessEmail ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{business.businessEmail}</span>
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
            <span className="inline-flex items-center gap-1">
              <Store className="h-3.5 w-3.5" aria-hidden />
              {storeSummary}
            </span>
            <span>
              {admin.portfolio.activeCount.replace(
                "{count}",
                String(business.activeStoreCount),
              )}
            </span>
            {business.inactiveStoreCount > 0 ? (
              <span>
                {admin.portfolio.inactiveCount.replace(
                  "{count}",
                  String(business.inactiveStoreCount),
                )}
              </span>
            ) : null}
          </p>
          {(business.renewalDueAt || business.dataExpiryAt) && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
              {business.renewalDueAt ? (
                <span>
                  {admin.portfolio.storeList.renewalDue}: {formatDate(business.renewalDueAt)}
                </span>
              ) : null}
              {business.dataExpiryAt ? (
                <span>
                  {admin.portfolio.storeList.dataExpiry}: {formatDate(business.dataExpiryAt)}
                </span>
              ) : null}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-5 w-5 shrink-0 text-text-muted transition-transform duration-200",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="space-y-3 p-4 sm:p-5">
          {business.stores.map((store) => (
            <AdminStoreListItem key={store.storeId} store={store} admin={admin} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

interface AdminPortfolioListProps {
  admin: AdminContent;
  initialOverview?: AdminDashboardOverview;
  initialOverviewFailed?: boolean;
}

export function AdminPortfolioList({
  admin,
  initialOverview,
  initialOverviewFailed = false,
}: AdminPortfolioListProps) {
  const cycleSettings = useBillingCycleSettings();
  const paymentCopy = useMemo(
    () => getBillingPaymentStatusCopy(cycleSettings),
    [cycleSettings],
  );
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<StoreCategory | "ALL">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useAdminDashboardOverview({
    initialData: initialOverview,
  });

  const loadFailed = initialOverviewFailed || (isError && !data);

  const areaOptions = useMemo(
    () => derivePortfolioAreaOptions(data?.businesses ?? []),
    [data?.businesses],
  );

  const paymentStatusLabels: Record<AdminPortfolioPaymentStatus, string> = {
    CURRENT: paymentCopy.labels.current,
    DUE_SOON: paymentCopy.labels.dueSoon,
    OVERDUE: paymentCopy.labels.overdue,
    EXPIRED: paymentCopy.labels.expired,
    UNKNOWN: paymentCopy.labels.unknown,
  };

  const filteredBusinesses = useMemo(() => {
    const businesses = data?.businesses ?? [];
    const query = search.trim().toLowerCase();

    let rows = businesses.filter((business) => {
      if (statusFilter === "ACTIVE" && business.activeStoreCount === 0) return false;
      if (statusFilter === "INACTIVE" && business.inactiveStoreCount === 0) return false;
      if (!businessMatchesAreaFilter(business, areaFilter)) return false;
      if (!businessMatchesPaymentFilter(business, paymentFilter, cycleSettings)) return false;
      if (categoryFilter !== "ALL") {
        const hasCategory = business.stores.some((store) => store.category === categoryFilter);
        if (!hasCategory) return false;
      }
      if (!query) return true;

      if (business.businessName.toLowerCase().includes(query)) return true;
      if (business.ownerName?.toLowerCase().includes(query)) return true;
      if (business.businessEmail?.toLowerCase().includes(query)) return true;
      return business.stores.some(
        (store) =>
          store.storeName.toLowerCase().includes(query) ||
          store.city.toLowerCase().includes(query) ||
          store.state.toLowerCase().includes(query),
      );
    });

    rows = [...rows].sort((a, b) => {
      const aRenewal = a.renewalDueAt
        ? new Date(a.renewalDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bRenewal = b.renewalDueAt
        ? new Date(b.renewalDueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (aRenewal !== bRenewal) return aRenewal - bRenewal;
      return a.businessName.localeCompare(b.businessName);
    });

    return rows;
  }, [areaFilter, categoryFilter, data?.businesses, paymentFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedBusinesses = filteredBusinesses.slice(pageStart, pageStart + PAGE_SIZE);

  const toggleExpanded = (businessKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(businessKey)) next.delete(businessKey);
      else next.add(businessKey);
      return next;
    });
  };

  const statusTabs = [
    { value: "ALL" as const, label: admin.portfolio.filterAll },
    { value: "ACTIVE" as const, label: admin.portfolio.filterActive },
    { value: "INACTIVE" as const, label: admin.portfolio.filterInactive },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PortfolioTabList
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={statusTabs}
          />
          <p className="text-sm text-text-muted">
            {admin.portfolio.showingBusinesses
              .replace("{shown}", String(filteredBusinesses.length))
              .replace("{total}", String(data?.totalBusinesses ?? 0))}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={admin.portfolio.searchPlaceholder}
              className="pl-9"
              aria-label={admin.portfolio.searchPlaceholder}
            />
          </div>
          <Select
            value={areaFilter}
            onValueChange={(value) => {
              setAreaFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="area-filter" className="w-full lg:w-40">
              <SelectValue placeholder={admin.portfolio.allAreas} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{admin.portfolio.allAreas}</SelectItem>
              {areaOptions.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value as StoreCategory | "ALL");
              setPage(1);
            }}
          >
            <SelectTrigger id="category-filter" className="w-full lg:w-40">
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
          <Select
            value={paymentFilter}
            onValueChange={(value) => {
              setPaymentFilter(value as PaymentFilter);
              setPage(1);
            }}
          >
            <SelectTrigger id="payment-filter" className="w-full lg:w-44">
              <SelectValue placeholder={admin.portfolio.allPaymentStatuses} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{admin.portfolio.allPaymentStatuses}</SelectItem>
              {(Object.keys(paymentStatusLabels) as AdminPortfolioPaymentStatus[]).map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {paymentStatusLabels[status]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadFailed ? (
        <AdminLoadErrorBanner
          message={admin.accounts.loadFailed}
          retryLabel={admin.overview.retry}
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-4" aria-live="polite">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-card" />
          ))}
        </div>
      ) : pagedBusinesses.length === 0 ? (
        <div className="rounded-card border border-border bg-surface-card p-8 text-center shadow-card">
          <p className="text-text-secondary">{admin.overview.emptyStores}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pagedBusinesses.map((business) => (
            <BusinessPortfolioCard
              key={business.businessKey}
              business={business}
              admin={admin}
              expanded={expandedKeys.has(business.businessKey)}
              onToggle={() => toggleExpanded(business.businessKey)}
            />
          ))}
        </div>
      )}

      {filteredBusinesses.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-card px-4 py-3">
          <p className="text-sm text-text-secondary">
            {admin.portfolio.pageSummary
              .replace("{start}", String(pageStart + 1))
              .replace("{end}", String(Math.min(pageStart + PAGE_SIZE, filteredBusinesses.length)))
              .replace("{total}", String(filteredBusinesses.length))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {admin.portfolio.previous}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              {admin.portfolio.next}
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
