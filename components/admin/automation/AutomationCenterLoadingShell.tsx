import { Loader2 } from "lucide-react";
import { AdminReadOnlyBanner } from "@/components/admin/AdminReadOnlyBanner";
import { PortalChildSidePanel } from "@/components/layout/PortalChildSidePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AUTOMATION_CENTER_CONTENT_CARD_CLASS,
  AUTOMATION_CENTER_CONTENT_SCROLL_CLASS,
  AUTOMATION_CENTER_ROOT_CLASS,
  AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS,
} from "@/lib/automation/automation-center-layout";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface AutomationCenterLoadingShellProps {
  admin: AdminContent;
  loadingLabel: string;
  canEdit?: boolean;
  readOnlyHint?: string;
}

export function AutomationCenterLoadingShell({
  admin,
  loadingLabel,
  canEdit = true,
  readOnlyHint,
}: AutomationCenterLoadingShellProps) {
  const copy = admin.automation;

  return (
    <>
      <PortalChildSidePanel aria-label={copy.title} pageTitle={copy.title} pageSubtitle={copy.subtitle}>
        <div className="space-y-2 px-2 py-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      </PortalChildSidePanel>

      <div
        className={AUTOMATION_CENTER_ROOT_CLASS}
        data-testid="automation-center-loading"
        aria-busy="true"
        aria-live="polite"
      >
        {!canEdit && readOnlyHint ? (
          <AdminReadOnlyBanner message={readOnlyHint} className="shrink-0" />
        ) : null}

        <div className={cn(AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS, "shrink-0 pb-1 lg:hidden")}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        <div
          className={AUTOMATION_CENTER_CONTENT_CARD_CLASS}
          data-testid="automation-center-content"
        >
          <div className="space-y-2 border-b border-border px-4 py-4 sm:px-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>

          <div className={AUTOMATION_CENTER_CONTENT_SCROLL_CLASS}>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-text-secondary">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                <p className="text-sm">{loadingLabel}</p>
              </div>
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
