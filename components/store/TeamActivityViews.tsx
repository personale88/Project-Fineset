import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { ManagerStaffActivityRow } from "@/lib/services/manager-dashboard";
import { BillingRestrictedValue } from "@/components/billing/BillingRestrictedOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TeamActivityRow = ManagerStaffActivityRow & {
  storeId?: string;
  storeName?: string;
};

export interface TeamActivityCopy {
  viewCalls: string;
  viewFollowUps: string;
  overdueHint: string;
  dueTodayHint: string;
  statusNeedsAttention: string;
  statusOnTrack: string;
  columns: {
    store?: string;
    staff: string;
    visits: string;
    conversion: string;
    openFollowUps: string;
    pendingWork: string;
    status: string;
    actions: string;
  };
}

interface TeamActivityViewsProps {
  rows: TeamActivityRow[];
  copy: TeamActivityCopy;
  showStoreColumn: boolean;
  getCallsHref: (row: TeamActivityRow) => string;
  getFollowUpsHref: (row: TeamActivityRow) => string;
}

function rowKey(row: TeamActivityRow): string {
  return row.storeId ? `${row.storeId}-${row.staffId}` : row.staffId;
}

function needsAttention(row: TeamActivityRow): boolean {
  return row.overdueTasks > 0 || row.pendingWork > 0;
}

function StatusBadge({
  row,
  copy,
}: {
  row: TeamActivityRow;
  copy: TeamActivityCopy;
}) {
  if (needsAttention(row)) {
    return (
      <Badge variant="warning" className="shrink-0 gap-1">
        <AlertCircle className="h-3 w-3" aria-hidden />
        {copy.statusNeedsAttention}
      </Badge>
    );
  }

  return <Badge variant="success">{copy.statusOnTrack}</Badge>;
}

function PendingWorkHint({
  row,
  copy,
}: {
  row: TeamActivityRow;
  copy: TeamActivityCopy;
}) {
  if (row.overdueTasks > 0) {
    return (
      <p className="text-xs text-status-error">
        {copy.overdueHint.replace("{count}", String(row.overdueTasks))}
      </p>
    );
  }

  if (row.dueTodayTasks > 0) {
    return (
      <p className="text-xs text-status-warning">
        {copy.dueTodayHint.replace("{count}", String(row.dueTodayTasks))}
      </p>
    );
  }

  return null;
}

function TeamActivityMobileCard({
  row,
  copy,
  showStore,
  callsHref,
  followUpsHref,
}: {
  row: TeamActivityRow;
  copy: TeamActivityCopy;
  showStore: boolean;
  callsHref: string;
  followUpsHref: string;
}) {
  const headingId = `team-activity-${rowKey(row)}`;
  const metrics = [
    { label: copy.columns.visits, value: row.monthlyVisits, restricted: true },
    { label: copy.columns.conversion, value: `${row.conversionRate}%`, restricted: true },
    { label: copy.columns.openFollowUps, value: row.openFollowUps, restricted: true },
    { label: copy.columns.pendingWork, value: row.pendingWork, restricted: true },
  ];

  return (
    <article aria-labelledby={headingId} className="border-b border-border px-4 py-4 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <h3 id={headingId} className="font-medium text-text-primary">
            {row.staffName}
            {row.role === "STORE_MANAGER" ? (
              <span className="ml-1.5 text-xs font-normal text-text-muted">(Manager)</span>
            ) : null}
          </h3>
          {showStore && row.storeName ? (
            <p className="truncate text-xs text-text-muted">{row.storeName}</p>
          ) : null}
        </div>
        <StatusBadge row={row} copy={copy} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <dt className="text-xs text-text-secondary">{metric.label}</dt>
            <dd className="mt-0.5 font-numeric text-sm font-medium tabular-nums text-text-primary">
              {metric.restricted ? (
                <BillingRestrictedValue>{metric.value}</BillingRestrictedValue>
              ) : (
                metric.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-2">
        <PendingWorkHint row={row} copy={copy} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href={callsHref}>{copy.viewCalls}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={followUpsHref}>{copy.viewFollowUps}</Link>
        </Button>
      </div>
    </article>
  );
}

function TeamActivityDesktopTable({
  rows,
  copy,
  showStoreColumn,
  getCallsHref,
  getFollowUpsHref,
}: TeamActivityViewsProps) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table
        className={cn(
          "w-full text-left text-sm",
          showStoreColumn ? "min-w-[980px]" : "min-w-[860px]",
        )}
      >
        <caption className="sr-only">{copy.columns.staff}</caption>
        <thead className="border-b border-border bg-surface-secondary">
          <tr>
            {showStoreColumn ? (
              <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
                {copy.columns.store}
              </th>
            ) : null}
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.staff}
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.visits}
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.conversion}
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.openFollowUps}
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.pendingWork}
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.status}
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-text-secondary">
              {copy.columns.actions}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const callsHref = getCallsHref(row);
            const followUpsHref = getFollowUpsHref(row);

            return (
              <tr key={rowKey(row)} className="border-b border-border last:border-0">
                {showStoreColumn ? (
                  <td className="px-4 py-3 text-text-secondary">{row.storeName}</td>
                ) : null}
                <td className="px-4 py-3 font-medium text-text-primary">
                  {row.staffName}
                  {row.role === "STORE_MANAGER" ? (
                    <span className="ml-2 text-xs text-text-muted">(Manager)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-numeric tabular-nums">
                  <BillingRestrictedValue>{row.monthlyVisits}</BillingRestrictedValue>
                </td>
                <td className="px-4 py-3 font-numeric tabular-nums">
                  <BillingRestrictedValue>{row.conversionRate}%</BillingRestrictedValue>
                </td>
                <td className="px-4 py-3 font-numeric tabular-nums">
                  <BillingRestrictedValue>{row.openFollowUps}</BillingRestrictedValue>
                </td>
                <td className="px-4 py-3">
                  <BillingRestrictedValue className="font-numeric tabular-nums text-text-primary">
                    {row.pendingWork}
                  </BillingRestrictedValue>
                  {row.overdueTasks > 0 ? (
                    <span className="ml-2 text-xs text-status-error">
                      {copy.overdueHint.replace("{count}", String(row.overdueTasks))}
                    </span>
                  ) : row.dueTodayTasks > 0 ? (
                    <span className="ml-2 text-xs text-status-warning">
                      {copy.dueTodayHint.replace("{count}", String(row.dueTodayTasks))}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge row={row} copy={copy} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={callsHref}
                      className="text-sm font-medium text-brand-gold hover:underline"
                    >
                      {copy.viewCalls}
                    </Link>
                    <Link
                      href={followUpsHref}
                      className="text-sm font-medium text-brand-gold hover:underline"
                    >
                      {copy.viewFollowUps}
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TeamActivityViews({
  rows,
  copy,
  showStoreColumn,
  getCallsHref,
  getFollowUpsHref,
}: TeamActivityViewsProps) {
  return (
    <>
      <div
        className={cn(
          "max-md:-mx-6 md:hidden",
          "border-y border-border",
        )}
        role="list"
        aria-label={copy.columns.staff}
      >
        {rows.map((row) => (
          <div key={rowKey(row)} role="listitem">
            <TeamActivityMobileCard
              row={row}
              copy={copy}
              showStore={showStoreColumn}
              callsHref={getCallsHref(row)}
              followUpsHref={getFollowUpsHref(row)}
            />
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <TeamActivityDesktopTable
          rows={rows}
          copy={copy}
          showStoreColumn={showStoreColumn}
          getCallsHref={getCallsHref}
          getFollowUpsHref={getFollowUpsHref}
        />
      </div>
    </>
  );
}
