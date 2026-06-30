"use client";

import { Eye, X } from "lucide-react";
import { useAdminImpersonation } from "@/hooks/useAdminImpersonation";
import { Button } from "@/components/ui/button";
import type { Content } from "@/content/en";
import type { AdminSession } from "@/types";

interface AdminImpersonationBannerProps {
  copy: Content["admin"]["impersonation"];
  session: AdminSession;
  storeName?: string;
}

export function AdminImpersonationBanner({
  copy,
  session,
  storeName,
}: AdminImpersonationBannerProps) {
  const impersonation = useAdminImpersonation();

  if (!session.impersonatedStoreId) return null;

  const label = copy.viewingAs.replace(
    "{storeName}",
    storeName ?? session.impersonatedStoreId,
  );

  return (
    <div
      role="status"
      className="border-b border-status-warning/40 bg-status-warning/10 py-2"
    >
      <div className="flex w-full items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-status-warning">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {label}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={impersonation.isPending}
          onClick={() => impersonation.mutate(null)}
        >
          <X className="mr-1.5 h-4 w-4" aria-hidden />
          {copy.exit}
        </Button>
      </div>
    </div>
  );
}
