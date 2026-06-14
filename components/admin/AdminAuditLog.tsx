"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { AdminDashboardNav } from "@/components/admin/AdminDashboardNav";
import { content } from "@/content/en";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditRow {
  id: string;
  event: string;
  email: string | null;
  createdAt: string;
  metadata: unknown;
}

const EVENT_FILTERS = [
  { value: "ALL", label: "All events" },
  { value: "LOGIN_SUCCESS", label: "Login success" },
  { value: "LOGIN_FAILED", label: "Login failed" },
  { value: "USER_DEACTIVATED", label: "User deactivated" },
  { value: "STORE_SOFT_DELETED", label: "Store deleted" },
  { value: "STAFF_CREATED", label: "Staff created" },
  { value: "VISIT_IMPORT", label: "Visit import" },
  { value: "CUSTOMER_MERGED", label: "Customer merged" },
] as const;

export function AdminAuditLog() {
  const [eventFilter, setEventFilter] = useState<string>("ALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-audit", eventFilter],
    queryFn: () =>
      apiFetch<{ data: AuditRow[] }>(
        `/api/audit${buildQueryString({
          limit: 100,
          event: eventFilter === "ALL" ? undefined : eventFilter,
        })}`,
      ),
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <AdminDashboardNav labels={content.admin.nav} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Audit log</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Authentication and admin events across the platform.
          </p>
        </div>
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Loading audit log…</p>
      ) : isError ? (
        <p className="text-sm text-status-error">Could not load audit log.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-secondary">No audit events recorded yet.</p>
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
