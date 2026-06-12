"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildYearOptions } from "@/components/shared/calls";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import {
  buildStaffCallsSearchParams,
  parseStaffCallsSearchParams,
} from "@/lib/utils/staff-calls-url";
import type {
  GetStaffCallsParams,
  StaffCallFilterCounts,
  StaffCallMasterFilter,
  StaffCallOccasionFilter,
  StaffCallQueue,
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";

interface UseStaffCallFiltersOptions {
  initialParams?: GetStaffCallsParams;
  pageSize?: number;
  fixedStoreId?: string;
}

function searchParamsRecord(
  searchParams: ReturnType<typeof useSearchParams>,
): Record<string, string | string[] | undefined> {
  const raw: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return raw;
}

function applyParamsToState(params: GetStaffCallsParams, pageSize: number) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  return {
    year: params.year ?? currentYear,
    month: params.month ?? currentMonth,
    segment: params.segment ?? "ALL",
    valueTier: params.valueTier ?? "ALL",
    queue: params.queue ?? "ALL",
    master: params.master ?? "ALL",
    birthday: params.birthday ?? "ALL",
    anniversary: params.anniversary ?? "ALL",
    page: params.page ?? 1,
    pageSize: params.pageSize ?? pageSize,
  };
}

export function useStaffCallFilters(options: UseStaffCallFiltersOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageSize = options.pageSize ?? 15;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const lastSyncedQueryRef = useRef<string | null>(null);

  const resolvedFilters = useMemo(() => {
    const fromUrl = parseStaffCallsSearchParams(searchParamsRecord(searchParams));
    if (searchParams.toString().length > 0) return fromUrl;
    return { ...defaultStaffCallsParams(), ...options.initialParams };
  }, [searchParams, options.initialParams]);

  const initialState = applyParamsToState(resolvedFilters, pageSize);

  const [year, setYear] = useState(initialState.year);
  const [month, setMonth] = useState(initialState.month);
  const [segment, setSegment] = useState<StaffCallSegment>(initialState.segment);
  const [valueTier, setValueTier] = useState<StaffCallValueTier>(initialState.valueTier);
  const [queue, setQueue] = useState<StaffCallQueue>(initialState.queue);
  const [master, setMaster] = useState<StaffCallMasterFilter>(initialState.master);
  const [birthday, setBirthday] = useState<StaffCallOccasionFilter>(initialState.birthday);
  const [anniversary, setAnniversary] = useState<StaffCallOccasionFilter>(
    initialState.anniversary,
  );
  const [page, setPage] = useState(initialState.page);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    const qs = searchParams.toString();
    if (qs === lastSyncedQueryRef.current) return;

    const parsed = parseStaffCallsSearchParams(searchParamsRecord(searchParams));
    const next = applyParamsToState(parsed, pageSize);

    setYear(next.year);
    setMonth(next.month);
    setSegment(next.segment);
    setValueTier(next.valueTier);
    setQueue(next.queue);
    setMaster(next.master);
    setBirthday(next.birthday);
    setAnniversary(next.anniversary);
    setPage(next.page);
  }, [searchParams, pageSize]);

  const queryParams = useMemo<GetStaffCallsParams>(
    () => ({
      ...(options.fixedStoreId ? { storeId: options.fixedStoreId } : {}),
      year,
      month,
      segment,
      valueTier,
      queue,
      master,
      birthday,
      anniversary,
      page,
      pageSize,
    }),
    [
      options.fixedStoreId,
      year,
      month,
      segment,
      valueTier,
      queue,
      master,
      birthday,
      anniversary,
      page,
      pageSize,
    ],
  );

  const syncUrl = useCallback(
    (next: GetStaffCallsParams) => {
      const qs = buildStaffCallsSearchParams(next);
      if (searchParams.toString() !== qs) {
        lastSyncedQueryRef.current = qs;
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  const applyFilters = useCallback(
    (patch: Partial<GetStaffCallsParams>, resetPage = true) => {
      const next: GetStaffCallsParams = {
        ...(options.fixedStoreId ? { storeId: options.fixedStoreId } : {}),
        year: patch.year ?? year,
        month: patch.month ?? month,
        segment: patch.segment ?? segment,
        valueTier: patch.valueTier ?? valueTier,
        queue: patch.queue ?? queue,
        master: patch.master ?? master,
        birthday: patch.birthday ?? birthday,
        anniversary: patch.anniversary ?? anniversary,
        page: patch.page ?? (resetPage ? 1 : page),
        pageSize,
      };

      setYear(next.year!);
      setMonth(next.month!);
      setSegment(next.segment!);
      setValueTier(next.valueTier!);
      setQueue(next.queue!);
      setMaster(next.master!);
      setBirthday(next.birthday!);
      setAnniversary(next.anniversary!);
      setPage(next.page!);
      syncUrl(next);
    },
    [
      anniversary,
      birthday,
      master,
      month,
      page,
      pageSize,
      queue,
      segment,
      syncUrl,
      valueTier,
      year,
      options.fixedStoreId,
    ],
  );

  function handleYearChange(nextYear: number) {
    applyFilters({
      year: nextYear,
      month: nextYear === currentYear ? currentMonth : 1,
    });
  }

  function handleMonthChange(nextMonth: number) {
    applyFilters({ month: nextMonth });
  }

  function setFilter<K extends keyof GetStaffCallsParams>(key: K, value: GetStaffCallsParams[K]) {
    applyFilters({ [key]: value } as Partial<GetStaffCallsParams>);
  }

  function handlePageChange(nextPage: number) {
    applyFilters({ page: nextPage }, false);
  }

  function clearAdvancedFilters() {
    applyFilters({
      segment: "ALL",
      valueTier: "ALL",
      birthday: "ALL",
      anniversary: "ALL",
    });
  }

  const activeAdvancedCount = [
    segment !== "ALL",
    valueTier !== "ALL",
    birthday !== "ALL",
    anniversary !== "ALL",
  ].filter(Boolean).length;

  const hasAdvancedFilters = activeAdvancedCount > 0;
  const isDefaultFilters =
    segment === "ALL" &&
    valueTier === "ALL" &&
    queue === "ALL" &&
    master === "ALL" &&
    birthday === "ALL" &&
    anniversary === "ALL";

  function bindFilterCounts(filterCounts?: StaffCallFilterCounts) {
    return {
      yearOptions: buildYearOptions(currentYear, filterCounts?.availableYears ?? []),
      getMonthCount: (monthNumber: number) =>
        filterCounts?.months?.find((item) => item.month === monthNumber)?.count ?? 0,
      getFilterCount: (
        group:
          | "masters"
          | "segments"
          | "valueTiers"
          | "queues"
          | "birthdays"
          | "anniversaries",
        key: string,
      ) => filterCounts?.[group]?.find((item) => item.key === key)?.count ?? 0,
    };
  }

  return {
    filters: {
      year,
      month,
      segment,
      valueTier,
      queue,
      master,
      birthday,
      anniversary,
    },
    ui: {
      showAdvancedFilters,
      setShowAdvancedFilters,
      activeAdvancedCount,
      hasAdvancedFilters,
      isDefaultFilters,
    },
    queryParams,
    pagination: { page, setPage: handlePageChange },
    handlers: {
      handleYearChange,
      handleMonthChange,
      setFilter,
      clearAdvancedFilters,
    },
    bindFilterCounts,
  };
}
