import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTOMATION_CENTER_BODY_CLASS,
  AUTOMATION_CENTER_INTRO_CLASS,
  AUTOMATION_CENTER_NAV_CLASS,
  AUTOMATION_CENTER_ROOT_CLASS,
} from "@/lib/automation/automation-center-layout";
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
    <div
      className={AUTOMATION_CENTER_ROOT_CLASS}
      data-testid="automation-center-error"
      aria-live="polite"
    >
      <AdminPageIntro
        title={copy.title}
        subtitle={copy.subtitle}
        nav={admin.nav}
        introClassName={AUTOMATION_CENTER_INTRO_CLASS}
        navClassName={AUTOMATION_CENTER_NAV_CLASS}
      />

      <div className={AUTOMATION_CENTER_BODY_CLASS}>
        <div className="hidden shrink-0 space-y-2 lg:block lg:w-72">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg opacity-40" aria-hidden />
          ))}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <AdminLoadErrorBanner
            message={message}
            retryLabel={retryLabel}
            onRetry={onRetry}
            retryDisabled={retryDisabled}
            data-testid="automation-config-error-banner"
          />
        </div>
      </div>
    </div>
  );
}
