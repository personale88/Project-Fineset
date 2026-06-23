"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlatformAdmins, updatePlatformAdmin } from "@/lib/api/platform-admins";
import { ADMIN_PERMISSION_KEYS } from "@/lib/auth/admin-permissions";
import { useAdminPortal } from "@/components/admin/AdminPortalContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";
import { ApiError } from "@/types";
import type { Content } from "@/content/en";
import type { AdminPermissionKey } from "@/types";

type InternalTeamCopy = Content["admin"]["accounts"]["internalTeam"];

interface InternalTeamPaneProps {
  copy: InternalTeamCopy;
}

export function InternalTeamPane({ copy }: InternalTeamPaneProps) {
  const { role } = useAdminPortal();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "team"],
    queryFn: fetchPlatformAdmins,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: Parameters<typeof updatePlatformAdmin>[1];
    }) => updatePlatformAdmin(userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "team"] });
    },
  });

  const canManage = role === "MASTER_ADMIN";

  async function toggleActive(userId: string, isActive: boolean) {
    try {
      await updateMutation.mutateAsync({ userId, payload: { isActive: !isActive } });
      toast({
        title: !isActive ? copy.reactivatedTitle : copy.deactivatedTitle,
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.body.message?.trim() || copy.updateFailed
          : copy.updateFailed;
      toast({ title: message });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">{copy.loading}</p>;
  }

  if (isError) {
    return (
      <div className="rounded-card border border-border bg-surface-card p-5">
        <p className="text-sm text-text-secondary">{copy.loadFailed}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
          {copy.retry}
        </Button>
      </div>
    );
  }

  if (members.length === 0) {
    return <p className="text-sm text-text-secondary">{copy.empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface-card shadow-card">
      <table className="min-w-full text-sm">
        <thead className="bg-surface-secondary text-left">
          <tr>
            <th className="px-4 py-3">{copy.columns.name}</th>
            <th className="px-4 py-3">{copy.columns.email}</th>
            <th className="hidden px-4 py-3 md:table-cell">{copy.columns.phone}</th>
            <th className="px-4 py-3">{copy.columns.role}</th>
            <th className="hidden px-4 py-3 lg:table-cell">{copy.columns.permissions}</th>
            <th className="px-4 py-3">{copy.columns.status}</th>
            <th className="px-4 py-3">{copy.columns.actions}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-t border-border">
              <td className="px-4 py-3 font-medium text-text-primary">{member.name}</td>
              <td className="px-4 py-3 text-text-secondary">{member.email}</td>
              <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                {member.phone ?? "—"}
              </td>
              <td className="px-4 py-3">
                {member.role === "MASTER_ADMIN" ? copy.roles.master : copy.roles.platform}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {ADMIN_PERMISSION_KEYS.filter((key) => member.permissions[key]).map((key) => (
                    <Badge key={key} variant="secondary">
                      {copy.permissionLabels[key as AdminPermissionKey]}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={member.isActive ? "default" : "outline"}>
                  {member.isActive ? copy.statusActive : copy.statusInactive}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {member.role === "PLATFORM_ADMIN" && canManage ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updateMutation.isPending}
                    onClick={() => void toggleActive(member.id, member.isActive)}
                  >
                    {member.isActive ? copy.deactivate : copy.activate}
                  </Button>
                ) : (
                  <span className="text-xs text-text-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
