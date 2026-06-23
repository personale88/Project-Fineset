"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { formatDate } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { StoreRestoreDialog } from "@/components/admin/StoreRestoreDialog";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface DeletedStoresListProps {
  admin: AdminContent;
}

export function DeletedStoresList({ admin }: DeletedStoresListProps) {
  const copy = admin.accounts.deletedList;
  const [restoreTarget, setRestoreTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, isError, refetch } = useStores({
    page: 1,
    pageSize: 100,
    includeDeleted: true,
  });

  const deletedStores = useMemo(
    () => (data?.data ?? []).filter((store) => Boolean(store.deletedAt)),
    [data?.data],
  );

  if (isLoading) {
    return (
      <div className="space-y-3" aria-live="polite">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-card" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <AdminLoadErrorBanner
        message={copy.loadFailed}
        retryLabel={admin.overview.retry}
        onRetry={() => void refetch()}
      />
    );
  }

  if (deletedStores.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface-card p-8 text-center shadow-card">
        <p className="text-sm text-text-secondary">{copy.empty}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {deletedStores.map((store) => (
          <article
            key={store.id}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-text-primary">{store.name}</h3>
              <p className="mt-1 text-sm text-text-muted">
                {store.city}, {store.state}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {copy.deletedOn.replace("{date}", formatDate(store.deletedAt!))}
                {store.purgeAt
                  ? ` · ${copy.purgeOn.replace("{date}", formatDate(store.purgeAt))}`
                  : null}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setRestoreTarget({ id: store.id, name: store.name })}
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
              {copy.restore}
            </Button>
          </article>
        ))}
      </div>

      <StoreRestoreDialog
        storeId={restoreTarget?.id ?? null}
        storeName={restoreTarget?.name ?? ""}
        open={restoreTarget != null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
        admin={admin}
      />
    </>
  );
}
