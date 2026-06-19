import type { FollowUpFilter } from "@/hooks/useFollowUps";

export function buildFollowUpsHref(
  basePath: string,
  filter: FollowUpFilter = "overdue",
): string {
  if (filter === "overdue") return basePath;
  const qs = new URLSearchParams({ filter });
  return `${basePath}?${qs.toString()}`;
}

/** Prefer due today when staff have tasks today; otherwise overdue, then all open. */
export function buildDefaultFollowUpsHref(
  basePath: string,
  counts: { dueToday: number; overdue: number },
): string {
  if (counts.dueToday > 0) return buildFollowUpsHref(basePath, "due_today");
  if (counts.overdue > 0) return buildFollowUpsHref(basePath, "overdue");
  return buildFollowUpsHref(basePath, "open");
}

export function parseFollowUpFilter(
  value: string | string[] | undefined,
): FollowUpFilter {
  const raw = typeof value === "string" ? value : value?.[0];
  if (raw === "due_today" || raw === "open" || raw === "mismatched") return raw;
  return "overdue";
}
