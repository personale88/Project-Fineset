"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { useAllStoresForFilter } from "@/hooks/useAllStoresForFilter";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useIsClient } from "@/hooks/useIsClient";
import { useMaxSm } from "@/hooks/useMaxSm";
import { maskPhone } from "@/lib/utils/formatters";
import { CustomerProfileDialog } from "@/components/customers/CustomerProfileDialog";
import type { CustomerProfileLookup } from "@/components/customers/CustomerProfileDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PortalBottomSheet } from "@/components/shared/PortalBottomSheet";
import { portalHeaderIconButtonClass } from "@/components/layout/portal-header-button";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";

interface CustomerSearchRow {
  id: string;
  name: string;
  phone: string;
}

interface AdminGlobalSearchDialogProps {
  copy: Content["admin"]["search"];
  storeCopy: Content["store"];
  visitFields: Content["visitForm"]["fields"];
  productLabels: Record<string, string>;
}

export function AdminGlobalSearchDialog({
  copy,
  storeCopy,
  visitFields,
  productLabels,
}: AdminGlobalSearchDialogProps) {
  const isClient = useIsClient();
  const isMobile = useMaxSm();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [storeId, setStoreId] = useState<string>("");
  const [profileLookup, setProfileLookup] = useState<CustomerProfileLookup | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data: storesResult } = useAllStoresForFilter();

  useEffect(() => {
    if (!storeId && storesResult?.data?.[0]) {
      setStoreId(storesResult.data[0].id);
    }
  }, [storeId, storesResult?.data]);

  useEffect(() => {
    if (!isClient) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isClient]);

  const canSearch = debouncedQuery.trim().length >= 2 && Boolean(storeId);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["admin-global-search", storeId, debouncedQuery],
    queryFn: () =>
      apiFetch<{ data: CustomerSearchRow[] }>(
        `/api/customers${buildQueryString({
          search: debouncedQuery,
          storeId,
          page: 1,
          pageSize: 10,
        })}`,
      ),
    enabled: isClient && open && canSearch,
  });

  const results = data?.data ?? [];

  function handleClose(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function handleSelect(row: CustomerSearchRow) {
    setProfileLookup({
      customerId: row.id,
      customerName: row.name,
      storeId,
    });
    handleClose(false);
  }

  const panel = (
    <div className="space-y-4 pb-2">
      <div className="space-y-2">
        <label htmlFor="admin-search-store" className="text-xs font-medium text-text-muted">
          {copy.storeLabel}
        </label>
        <Select value={storeId} onValueChange={setStoreId}>
          <SelectTrigger id="admin-search-store">
            <SelectValue placeholder={copy.storePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {(storesResult?.data ?? []).map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name} — {store.city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.placeholder}
          className="pl-9"
          autoFocus={!isMobile}
        />
      </div>

      {!storeId ? (
        <p className="text-sm text-text-muted">{copy.selectStoreFirst}</p>
      ) : debouncedQuery.trim().length < 2 ? (
        <p className="text-sm text-text-muted">{copy.minChars}</p>
      ) : isFetching ? (
        <p className="text-sm text-text-muted">{copy.searching}</p>
      ) : isError ? (
        <p className="text-sm text-status-error">{copy.error}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-text-muted">{copy.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-surface-secondary/60"
                onClick={() => handleSelect(row)}
              >
                <span className="font-medium text-text-primary">{row.name}</span>
                <span className="text-xs text-text-muted">{maskPhone(row.phone)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="hidden gap-2 sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
        {copy.button}
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">
          ⌘K
        </kbd>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(portalHeaderIconButtonClass, "sm:hidden")}
        aria-label={copy.title}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
      </Button>

      {isClient && open && isMobile ? (
        <PortalBottomSheet
          open
          onOpenChange={handleClose}
          title={copy.title}
          subtitle={copy.description}
          contentClassName="!h-[90dvh] !max-h-[90dvh]"
          bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {panel}
        </PortalBottomSheet>
      ) : null}

      {isClient && open && !isMobile ? (
        <Dialog open onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            {panel}
          </DialogContent>
        </Dialog>
      ) : null}

      <CustomerProfileDialog
        visit={null}
        lookup={profileLookup}
        copy={storeCopy.visits.customerProfile}
        fieldLabels={visitFields}
        productLabels={productLabels}
        onClose={() => setProfileLookup(null)}
        storeId={profileLookup?.storeId}
        showMerge={false}
      />
    </>
  );
}
