import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { PortalChildSidePanel } from "@/components/layout/PortalChildSidePanel";
import { Skeleton } from "@/components/ui/skeleton";
import { AUTOMATION_CENTER_ROOT_CLASS } from "@/lib/automation/automation-center-layout";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface AutomationCenterErrorShellProps {
  admin: AdminContent;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  retryDisabled?: boolean;
}

export function AutomationCenterErrorShell({
  admin,
  message,
  retryLabel,
  onRetry,
  retryDisabled = false,
}: AutomationCenterErrorShellProps) {
  const copy = admin.automation;

  return (
    <>
      <PortalChildSidePanel aria-label={copy.title} pageTitle={copy.title} pageSubtitle={copy.subtitle}>
        <div className="space-y-2 px-2 py-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg opacity-40" aria-hidden />
          ))}
        </div>
      </PortalChildSidePanel>

      <div
        className={AUTOMATION_CENTER_ROOT_CLASS}
        data-testid="automation-center-error"
        aria-live="polite"
      >
        <AdminLoadErrorBanner
          message={message}
          retryLabel={retryLabel}
          onRetry={onRetry}
          retryDisabled={retryDisabled}
          data-testid="automation-config-error-banner"
          className="shrink-0"
        />
      </div>
    </>
  );
}
