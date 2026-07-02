"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFieldSalesList } from "@/hooks/useFieldSalesList";
import { getStaff, getStaffPerformance } from "@/lib/api/staff";
import { getStores } from "@/lib/api/stores";
import { LIVE_QUERY_OPTIONS, STAFF_FILTER_QUERY_OPTIONS } from "@/lib/sync/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IssueGpsExceptionDialog } from "@/components/field-force/IssueGpsExceptionDialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import {
  FieldSaleCard,
  LogPagination,
  StoreStaffFilters,
  YearMonthFilters,
  buildYearOptions,
} from "@/components/shared/calls";
import { content } from "@/content/en";
import type { Content } from "@/content/en";
import type { FieldSaleListResponse, GetFieldSalesListParams } from "@/types";

type PortalFieldSalesCopy = Content["portal"]["fieldSales"];
type CommonContent = Content["common"];

interface PortalFieldSalesLogProps {
  copy: PortalFieldSalesCopy;
  common: CommonContent;
  emptyMessage: string;
  allStoresLabel: string;
  allStaffLabel: string;
  showStoreFilter?: boolean;
  initialStoreId?: string;
  initialFieldSales?: FieldSaleListResponse;
  initialFieldSalesParams?: GetFieldSalesListParams;
  backHref?: string;
  backLabel?: string;
  canIssueGpsException?: boolean;
}

export function PortalFieldSalesLog({
  copy,
  common,
  emptyMessage,
  allStoresLabel,
  allStaffLabel,
  showStoreFilter = false,
  initialStoreId,
  initialFieldSales,
  initialFieldSalesParams,
  backHref,
  backLabel,
  canIssueGpsException = false,
}: PortalFieldSalesLogProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(initialFieldSalesParams?.year ?? currentYear);
  const [month, setMonth] = useState(initialFieldSalesParams?.month ?? currentMonth);
  const [page, setPage] = useState(initialFieldSalesParams?.page ?? 1);
  const [searchInput, setSearchInput] = useState(
    initialFieldSalesParams?.search ?? "",
  );
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [storeFilter, setStoreFilter] = useState(initialStoreId ?? "all");
  const [staffFilter, setStaffFilter] = useState(initialFieldSalesParams?.staffId ?? "all");
  const [locationStatusFilter, setLocationStatusFilter] = useState(
    initialFieldSalesParams?.locationStatus ?? "all",
  );
  const [outsideAreaOnly, setOutsideAreaOnly] = useState(
    initialFieldSalesParams?.outsideApprovedArea === true,
  );
  const enrollmentOutcomeFilter = initialFieldSalesParams?.enrollmentOutcome;
  const activityTypeFilter = initialFieldSalesParams?.activityType;

  const queryParams = useMemo<GetFieldSalesListParams>(
    () => ({
      year,
      month,
      page,
      pageSize: 15,
      search: debouncedSearch.trim() || undefined,
      storeId: showStoreFilter
        ? storeFilter !== "all"
          ? storeFilter
          : undefined
        : initialStoreId,
      staffId: staffFilter !== "all" ? staffFilter : undefined,
      enrollmentOutcome: enrollmentOutcomeFilter,
      activityType: activityTypeFilter,
      locationStatus: locationStatusFilter !== "all" ? locationStatusFilter : undefined,
      outsideApprovedArea: outsideAreaOnly ? true : undefined,
    }),
    [
      year,
      month,
      page,
      debouncedSearch,
      showStoreFilter,
      storeFilter,
      staffFilter,
      enrollmentOutcomeFilter,
      activityTypeFilter,
      locationStatusFilter,
      outsideAreaOnly,
    ],
  );

  const { data, isLoading, isFetching, isError, refetch } = useFieldSalesList(
    queryParams,
    {
    initialData: initialFieldSales,
      initialParams: initialFieldSalesParams,
    },
  );

  const { data: stores } = useQuery({
    queryKey: ["stores", "filter"],
    queryFn: () => getStores({ page: 1, pageSize: 100 }),
    enabled: showStoreFilter,
    ...LIVE_QUERY_OPTIONS,
  });

  const { data: storeStaff } = useQuery({
    queryKey: ["staff", "store", initialStoreId],
    queryFn: () => getStaff(initialStoreId),
    enabled: !showStoreFilter && Boolean(initialStoreId),
    ...STAFF_FILTER_QUERY_OPTIONS,
  });

  const { data: adminStaff } = useQuery({
    queryKey: ["staff", "performance", storeFilter],
    queryFn: () =>
      getStaffPerformance(storeFilter === "all" ? undefined : storeFilter),
    enabled: showStoreFilter,
    ...LIVE_QUERY_OPTIONS,
  });

  const staffOptions = showStoreFilter
    ? (adminStaff ?? []).map((member) => ({
        id: member.staffId,
        name: member.staffName,
      }))
    : (storeStaff ?? []).map((member) => ({
        id: member.id,
        name: member.name,
      }));

  const yearOptions = useMemo(
    () => buildYearOptions(currentYear, data?.filters.availableYears ?? []),
    [currentYear, data?.filters.availableYears],
  );

  function getMonthCount(monthNumber: number): number {
    return data?.filters.months.find((item) => item.month === monthNumber)?.count ?? 0;
  }

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
    setMonth(nextYear === currentYear ? currentMonth : 1);
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {backHref ? (
            <Link
              href={backHref}
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-text-secondary hover:text-brand-gold"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel ?? "Back"}
            </Link>
          ) : null}
          <h1 className="font-display text-2xl font-bold text-text-primary">{copy.title}</h1>
          <p className="mt-1 text-sm text-text-muted">{copy.subtitle}</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          {canIssueGpsException && staffOptions.length > 0 ? (
            <IssueGpsExceptionDialog
              copy={copy.issueGpsException}
              staffOptions={staffOptions}
            />
          ) : null}
          <StoreStaffFilters
          showStoreFilter={showStoreFilter}
          storeFilter={storeFilter}
          staffFilter={staffFilter}
          storeFilterLabel={copy.storeFilterLabel}
          staffFilterLabel={copy.staffFilterLabel}
          allStoresLabel={allStoresLabel}
          allStaffLabel={allStaffLabel}
          filterPlaceholder={common.filter}
          stores={stores?.data}
          staffOptions={staffOptions}
          onStoreChange={(value) => {
            setStoreFilter(value);
            setStaffFilter("all");
            setPage(1);
          }}
          onStaffChange={(value) => {
            setStaffFilter(value);
            setPage(1);
          }}
        />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="field-sales-location-status">{copy.locationStatusLabel}</Label>
          <Select
            value={locationStatusFilter}
            onValueChange={(value) => {
              setLocationStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger id="field-sales-location-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{copy.locationStatusAll}</SelectItem>
              <SelectItem value="DETECTED">Detected</SelectItem>
              <SelectItem value="PERMISSION_DENIED">Permission denied</SelectItem>
              <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
              <SelectItem value="POOR_ACCURACY">Poor accuracy</SelectItem>
              <SelectItem value="EXEMPT">Exempt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3 rounded-input border border-border px-3 py-2">
          <Switch
            id="field-sales-outside-area"
            checked={outsideAreaOnly}
            onCheckedChange={(checked) => {
              setOutsideAreaOnly(checked);
              setPage(1);
            }}
          />
          <Label htmlFor="field-sales-outside-area" className="text-sm">
            {copy.outsideAreaOnly}
          </Label>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="field-sales-search">{copy.searchLabel}</Label>
        <div className="relative max-w-md">
          <Input
            id="field-sales-search"
            value={searchInput}
            aria-label={copy.searchLabel}
            aria-busy={isFetching && Boolean(debouncedSearch.trim())}
            placeholder={copy.searchPlaceholder}
            className={isFetching && debouncedSearch.trim() ? "pr-9" : undefined}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
          />
          {isFetching && debouncedSearch.trim() ? (
            <Loader2
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-muted"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      <YearMonthFilters
        year={year}
        month={month}
        yearLabel={copy.yearLabel}
        monthLabels={copy.monthLabels}
        yearOptions={yearOptions}
        getMonthCount={getMonthCount}
        onYearChange={handleYearChange}
        onMonthChange={(value) => {
          setMonth(value);
          setPage(1);
        }}
      />

      {(enrollmentOutcomeFilter || activityTypeFilter) && (
        <p className="rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
          {copy.analyticsFilterActive}
        </p>
      )}

      <QueryLoadState
        isLoading={isLoading && !data}
        isError={isError}
        loadingLabel={common.loading}
        errorLabel={copy.loadError}
        retryLabel={content.errors.tryAgain}
        onRetry={() => void refetch()}
      >
        {!data || data.data.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="space-y-3">
            {data.data.map((item) => (
              <FieldSaleCard
                key={item.id}
                item={item}
                showStoreName={showStoreFilter}
                canAssign
                onAssigned={() => void refetch()}
                labels={{
                  staff: copy.columns.staff,
                  followUpDue: copy.followUpDue,
                  schemes: copy.columns.schemes,
                  reason: copy.columns.reason,
                  notesLabel: copy.notesLabel,
                }}
              />
            ))}
          </div>
        )}
      </QueryLoadState>

      {data && data.total > data.pageSize && (
        <LogPagination
          page={page}
          totalPages={totalPages}
          showingLabel=""
          pageLabel={copy.pageLabel
            .replace("{page}", String(page))
            .replace("{total}", String(totalPages))}
          previousLabel={copy.previousPage}
          nextLabel={copy.nextPage}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
