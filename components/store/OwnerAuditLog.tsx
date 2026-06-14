"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

interface AuditRow {
  id: string;
  event: string;
  email: string | null;
  createdAt: string;
  metadata: unknown;
}

export function OwnerAuditLog() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["owner-audit"],
    queryFn: () => apiFetch<{ data: AuditRow[] }>("/api/audit?limit=50"),
  });

  if (isLoading) {
    return <p className="text-sm text-text-secondary">Loading activity log…</p>;
  }
  if (isError) {
    return <p className="text-sm text-status-error">Could not load activity log.</p>;
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Activity log</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Recent staff, import, and account events for your stores.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">No activity recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-secondary text-left">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-2 text-text-muted">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{row.event.replace(/_/g, " ")}</td>
                  <td className="px-4 py-2">{row.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
