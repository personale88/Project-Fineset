"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { maskPhone } from "@/lib/utils/formatters";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
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

interface CustomerSearchRow {
  id: string;
  name: string;
  phone: string;
}

function GlobalSearchDialogInner({ storeId }: { storeId?: string | null }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted]);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", storeId, debouncedQuery],
    queryFn: () =>
      apiFetch<{ data: CustomerSearchRow[] }>(
        `/api/customers${buildQueryString({
          search: debouncedQuery,
          storeId: storeId ?? undefined,
          page: 1,
          pageSize: 8,
        })}`,
      ),
    enabled: mounted && open && debouncedQuery.trim().length >= 2,
  });

  const results = data?.data ?? [];

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
        Search
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted">
          ⌘K
        </kbd>
      </Button>

      {mounted && open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Search customers</DialogTitle>
              <DialogDescription>
                Find customers by name or phone within your store scope.
              </DialogDescription>
            </DialogHeader>
            <Input
              autoFocus
              placeholder="Name or phone…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {debouncedQuery.trim().length < 2 ? (
                <p className="text-sm text-text-muted">Type at least 2 characters.</p>
              ) : isFetching ? (
                <p className="text-sm text-text-muted">Searching…</p>
              ) : results.length === 0 ? (
                <p className="text-sm text-text-muted">No customers found.</p>
              ) : (
                results.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-input border border-border px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-text-primary">{row.name}</p>
                    <p className="text-xs text-text-muted">{maskPhone(row.phone)}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
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
