"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { content } from "@/content/en";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { maskPhone } from "@/lib/utils/formatters";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { useIsClient } from "@/hooks/useIsClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { StaffCustomerProfileDialog } from "@/components/staff/StaffCustomerProfileDialog";
import type { CustomerProfileLookup } from "@/components/customers/CustomerProfileDialog";
import { cn } from "@/lib/utils";

interface CustomerSearchRow {
  id: string;
  name: string;
  phone: string;
}

type SearchScope = "mine" | "store";

function GlobalSearchDialogInner({ storeId }: { storeId?: string | null }) {
  const copy = content.staff.search;
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("mine");
  const [profileLookup, setProfileLookup] = useState<CustomerProfileLookup | null>(null);
  const debouncedQuery = useDebouncedValue(query, 300);

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

  const { data, isFetching, isError } = useQuery({
    queryKey: ["global-search", storeId, scope, debouncedQuery],
    queryFn: () =>
      apiFetch<{ data: CustomerSearchRow[] }>(
        `/api/customers${buildQueryString({
          search: debouncedQuery,
          storeId: storeId ?? undefined,
          scope,
          page: 1,
          pageSize: 8,
        })}`,
      ),
    enabled: isClient && open && debouncedQuery.trim().length >= 2,
  });

  const results = data?.data ?? [];

  function handleSelect(row: CustomerSearchRow) {
    setProfileLookup({
      customerId: row.id,
      customerName: row.name,
    });
    setOpen(false);
  }

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
        size="icon"
        className="sm:hidden"
        aria-label={copy.title}
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" aria-hidden />
      </Button>

      {isClient && open ? (
        <Dialog
          open
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setQuery("");
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              {(["mine", "store"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setScope(item)}
                  className={cn(
                    "rounded-chip px-3 py-1.5 text-xs font-medium",
                    scope === item
                      ? "bg-brand-gold text-white"
                      : "bg-surface-secondary text-text-secondary",
                  )}
                >
                  {item === "mine" ? copy.mine : copy.store}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">
              {scope === "mine" ? copy.mineHint : copy.storeHint}
            </p>
            <Input
              autoFocus
              placeholder={copy.placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {debouncedQuery.trim().length < 2 ? (
                <p className="text-sm text-text-muted">{copy.minChars}</p>
              ) : isFetching ? (
                <p className="text-sm text-text-muted">{content.common.loading}</p>
              ) : isError ? (
                <p className="text-sm text-status-error">{copy.error}</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-text-muted">{copy.empty}</p>
              ) : (
                results.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => handleSelect(row)}
                    className={cn(
                      "w-full rounded-input border border-border px-3 py-2 text-left text-sm",
                      "transition-colors hover:border-brand-gold/35 hover:bg-brand-gold/[0.04]",
                    )}
                  >
                    <p className="font-medium text-text-primary">{row.name}</p>
                    <p className="text-xs text-text-muted">{maskPhone(row.phone)}</p>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <StaffCustomerProfileDialog
        open={profileLookup !== null}
        onOpenChange={(next) => {
          if (!next) setProfileLookup(null);
        }}
        lookup={profileLookup}
        storeId={storeId ?? undefined}
      />
    </>
  );
}

export function StoreGlobalSearch() {
  const { storeId } = useStoreDashboard();
  return <GlobalSearchDialogInner storeId={storeId} />;
}

export function GlobalSearchDialog({ storeId }: { storeId?: string | null }) {
  return <GlobalSearchDialogInner storeId={storeId} />;
}
