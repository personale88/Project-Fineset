import { History, Loader2 } from "lucide-react";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAutomationRunSummaryLine } from "@/lib/automation/run-summary";
import {
  AUTOMATION_RUN_ERROR_TEXT_CLASS,
  automationRunErrorsWereRedacted,
  getAutomationRunErrorMessagesForDisplay,
} from "@/lib/automation/run-errors-display";
import { cn } from "@/lib/utils";
import { formatDateTimeInTimezone } from "@/lib/automation/timezone";
import type { AutomationRunLogDto } from "@/lib/automation/types";
import type { Content } from "@/content/en";

type AutomationCopy = Content["admin"]["automation"];

export function automationRunStatusBadgeVariant(
  status: AutomationRunLogDto["status"],
): "default" | "secondary" | "error" | "running" | "warning" | "outline" {
  switch (status) {
    case "SUCCESS":
      return "default";
    case "RUNNING":
      return "running";
    case "PARTIAL":
      return "warning";
    case "FAILED":
      return "error";
    default:
      return "outline";
  }
}

function automationRunErrorsClassName(status: AutomationRunLogDto["status"]): string {
  if (status === "PARTIAL") return "text-xs text-status-warning";
  if (status === "FAILED") return "text-xs text-status-error";
  return "text-xs text-text-muted";
}

function AutomationHistoryEmptyState({
  copy,
  canEdit,
}: {
  copy: AutomationCopy;
  canEdit: boolean;
}) {
  return (
    <div className="p-4 sm:p-5" data-testid="automation-history-empty">
      <div className="rounded-lg border border-border bg-surface-secondary/30 px-4 py-8 text-center sm:px-6">
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-surface-secondary text-text-muted">
          <History className="size-5" aria-hidden />
        </span>
        <h3 className="font-display text-base font-semibold text-text-primary">
          {copy.history.emptyTitle}
        </h3>
        <p
          className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary"
          data-testid="automation-history-empty-description"
        >
          {canEdit ? copy.history.emptyDescription : copy.history.emptyReadOnlyDescription}
        </p>
        {canEdit ? (
          <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-text-muted">
            {copy.history.emptyCronHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface AutomationHistoryPanelProps {
  copy: AutomationCopy;
  timezone: string;
  runs?: AutomationRunLogDto[];
  total?: number;
  isLoading: boolean;
  isEmpty: boolean;
  isError: boolean;
  loadMoreError?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  canEdit?: boolean;
  onLoadMore?: () => void;
  onRetry: () => void;
  onRetryLoadMore?: () => void;
}

export function AutomationHistoryPanel({
  copy,
  timezone,
  runs,
  total = 0,
  isLoading,
  isEmpty,
  isError,
  loadMoreError = false,
  hasMore = false,
  isLoadingMore = false,
  canEdit = true,
  onLoadMore,
  onRetry,
  onRetryLoadMore,
}: AutomationHistoryPanelProps) {
  if (isLoading) {
    return (
      <div
        className="space-y-4 p-4 sm:p-5"
        data-testid="automation-history-loading"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          <p className="text-sm">{copy.history.loading}</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-5" aria-live="polite">
        <AdminLoadErrorBanner
          message={copy.history.loadFailed}
          retryLabel={copy.retry}
          onRetry={onRetry}
          data-testid="automation-history-error"
        />
      </div>
    );
  }

  if (isEmpty) {
    return <AutomationHistoryEmptyState copy={copy} canEdit={canEdit} />;
  }

  if (!runs?.length) {
    return null;
  }

  const shownCount = runs.length;
  const showingLabel = copy.history.showingRuns
    .replace("{shown}", String(shownCount))
    .replace("{total}", String(total));

  return (
    <div className="space-y-4 p-4 sm:p-5" data-testid="automation-history-list">
      {loadMoreError ? (
        <AdminLoadErrorBanner
          message={copy.history.loadMoreFailed}
          retryLabel={copy.retry}
          onRetry={onRetryLoadMore ?? onRetry}
          data-testid="automation-history-load-more-error"
        />
      ) : null}

      <ul className="min-w-0 divide-y divide-border rounded-lg border border-border">
        {runs.map((run) => {
          const errorMessages = getAutomationRunErrorMessagesForDisplay(run.errors);

          return (
            <li key={run.id} className="min-w-0 space-y-2 px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant={automationRunStatusBadgeVariant(run.status)}
                    data-testid={`automation-run-status-${run.status}`}
                  >
                    {run.status}
                  </Badge>
                  <span className="text-xs text-text-muted">{run.trigger}</span>
                </div>
                <span className="shrink-0 text-xs text-text-muted">
                  {formatDateTimeInTimezone(run.startedAt, timezone)}
                </span>
              </div>
              <p className="min-w-0 break-words text-sm leading-relaxed text-text-secondary [overflow-wrap:anywhere]">
                {formatAutomationRunSummaryLine(copy.history.summaryLine, run.summary)}
              </p>
              {errorMessages.length ? (
                <div className="min-w-0 space-y-1">
                  <ul
                    className="min-w-0 list-disc space-y-1 break-words pl-4"
                    data-testid={`automation-run-errors-${run.id}`}
                  >
                    {errorMessages.map((message) => (
                      <li
                        key={message}
                        className={cn(
                          automationRunErrorsClassName(run.status),
                          AUTOMATION_RUN_ERROR_TEXT_CLASS,
                        )}
                      >
                        {message}
                      </li>
                    ))}
                  </ul>
                  {automationRunErrorsWereRedacted(run.errors) ? (
                    <p
                      className={cn("text-xs text-text-muted", AUTOMATION_RUN_ERROR_TEXT_CLASS)}
                      data-testid={`automation-run-errors-privacy-${run.id}`}
                    >
                      {copy.history.errorsPrivacyHint}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {total > shownCount || hasMore ? (
        <div className="flex flex-col items-center gap-3 border-t border-border pt-4">
          <p className="text-xs text-text-muted" data-testid="automation-history-showing">
            {showingLabel}
          </p>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="automation-history-load-more"
              disabled={isLoadingMore}
              onClick={onLoadMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  {copy.history.loading}
                </>
              ) : (
                copy.history.loadMore
              )}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
