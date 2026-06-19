"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { content } from "@/content/en";
import { bulkAssignFollowUps } from "@/lib/api/bulk-assignment";
import { getStaff } from "@/lib/api/staff";
import { toast } from "@/hooks/useToast";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FollowUpBulkReassignBarProps {
  storeId: string;
  followUpIds: string[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onComplete: () => void;
}

export function FollowUpBulkReassignBar({
  storeId,
  followUpIds,
  selectedIds,
  onToggleAll,
  onComplete,
}: FollowUpBulkReassignBarProps) {
  const copy = content.store.managerDashboard.followUps.store.bulkReassign;
  const [targetStaffId, setTargetStaffId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", storeId],
    queryFn: () => getStaff(storeId),
  });

  async function handleSubmit() {
    if (!targetStaffId || selectedIds.size === 0) {
      toast({ title: copy.noneSelected });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await bulkAssignFollowUps(storeId, {
        targetStaffId,
        followUpIds: Array.from(selectedIds),
      });
      toast({
        title: copy.success.replace("{count}", String(result.assigned)),
      });
      onComplete();
    } catch (error) {
      toast({ title: getPortalErrorMessage(error, content.errors) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface-secondary p-4">
      <button
        type="button"
        onClick={onToggleAll}
        className="text-sm font-medium text-brand-gold hover:underline"
      >
        {copy.selectAll}
      </button>
      <p className="text-sm text-text-secondary">
        {copy.selected.replace("{count}", String(selectedIds.size))}
      </p>
      <div className="min-w-[12rem] flex-1">
        <Label htmlFor="bulk-reassign-staff">{copy.assignTo}</Label>
        <Select value={targetStaffId} onValueChange={setTargetStaffId}>
          <SelectTrigger id="bulk-reassign-staff">
            <SelectValue placeholder={copy.assignTo} />
          </SelectTrigger>
          <SelectContent>
            {staff
              .filter((member) => member.isActive)
              .map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        disabled={isSubmitting || selectedIds.size === 0 || !targetStaffId}
        onClick={() => void handleSubmit()}
      >
        {isSubmitting ? copy.submitting : copy.submit}
      </Button>
      <input type="hidden" value={followUpIds.join(",")} readOnly aria-hidden />
    </div>
  );
}
