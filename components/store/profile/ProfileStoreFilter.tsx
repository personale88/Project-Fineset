"use client";

import { cn } from "@/lib/utils";
import type { ManagerStoreOption } from "@/types";

interface ProfileStoreFilterProps {
  stores: ManagerStoreOption[];
  activeStoreId: string;
  onSelect: (storeId: string) => void;
  label: string;
}

export function ProfileStoreFilter({
  stores,
  activeStoreId,
  onSelect,
  label,
}: ProfileStoreFilterProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={label}>
      {stores.map((store) => (
        <button
          key={store.id}
          type="button"
          aria-pressed={activeStoreId === store.id}
          onClick={() => onSelect(store.id)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeStoreId === store.id
              ? "border-brand-gold bg-brand-gold/10 text-text-primary"
              : "border-border text-text-muted hover:border-brand-gold/30",
          )}
        >
          {store.name}
        </button>
      ))}
    </div>
  );
}
