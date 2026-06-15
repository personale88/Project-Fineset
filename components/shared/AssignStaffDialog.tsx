"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRoundPen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { content } from "@/content/en";
import { useAssignCustomer } from "@/hooks/useAssignCustomer";
import { getStaff } from "@/lib/api/staff";
import { STAFF_FILTER_QUERY_OPTIONS } from "@/lib/sync/constants";
import { toast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignCustomerInput } from "@/lib/validations/customer-assignment.schema";
import { ApiError } from "@/types";

export type AssignCustomerTarget = Pick<
  AssignCustomerInput,
  "visitId" | "fieldSaleId" | "followUpId"
>;

export interface AssignStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  target: AssignCustomerTarget;
  customerName: string;
  currentStaffId?: string | null;
  currentStaffName?: string | null;
  onAssigned?: () => void;
}

export function AssignStaffDialog({
  open,
  onOpenChange,
  storeId,
  target,
  customerName,
  currentStaffId,
  currentStaffName,
  onAssigned,
}: AssignStaffDialogProps) {
  const copy = content.assignStaff;
  const assignMutation = useAssignCustomer();
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff", storeId],
    queryFn: () => getStaff(storeId),
    enabled: open && Boolean(storeId),
    ...STAFF_FILTER_QUERY_OPTIONS,
  });

  const activeStaff = useMemo(
    () => staffMembers.filter((member) => member.isActive),
    [staffMembers],
  );

  useEffect(() => {
    if (!open) {
      setSelectedStaffId("");
      return;
    }
    if (currentStaffId) {
      setSelectedStaffId(currentStaffId);
    }
  }, [open, currentStaffId]);

  const description = copy.description
    .replace("{name}", customerName)
    .replace("{staff}", currentStaffName ?? copy.unassigned);

  function handleSubmit() {
    if (!selectedStaffId || selectedStaffId === currentStaffId) return;

    assignMutation.mutate(
      {
        storeId,
        payload: {
          targetStaffId: selectedStaffId,
          ...target,
        },
      },
      {
        onSuccess: (result) => {
          toast({
            title: copy.successTitle,
            description: copy.successDescription
              .replace("{name}", result.customerName)
              .replace("{staff}", result.newStaffName),
          });
          onOpenChange(false);
          onAssigned?.();
        },
        onError: (error) => {
          const message =
            error instanceof ApiError
              ? error.body.message ?? content.errors.generic
              : content.errors.generic;
          toast({
            title: copy.errorTitle,
            description: message,
          });
        },
      },
    );
  }

  const canSubmit =
    Boolean(selectedStaffId) &&
    selectedStaffId !== currentStaffId &&
    !assignMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="assign-staff-select">{copy.staffLabel}</Label>
          <Select
            value={selectedStaffId}
            onValueChange={setSelectedStaffId}
            disabled={staffLoading || assignMutation.isPending}
          >
            <SelectTrigger id="assign-staff-select">
              <SelectValue placeholder={staffLoading ? content.common.loading : copy.staffPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {activeStaff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                  {member.id === currentStaffId ? ` (${copy.current})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-text-muted">{copy.hint}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignMutation.isPending}
          >
            {content.common.cancel}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {assignMutation.isPending ? content.common.loading : copy.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AssignStaffButtonProps {
  storeId: string;
  target: AssignCustomerTarget;
  customerName: string;
  currentStaffId?: string | null;
  currentStaffName?: string | null;
  onAssigned?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  label?: string;
  showIcon?: boolean;
}

export function AssignStaffButton({
  storeId,
  target,
  customerName,
  currentStaffId,
  currentStaffName,
  onAssigned,
  variant = "outline",
  size = "sm",
  className,
  label,
  showIcon = true,
}: AssignStaffButtonProps) {
  const copy = content.assignStaff;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {showIcon ? <UserRoundPen className="h-4 w-4" aria-hidden /> : null}
        {size !== "icon" ? (label ?? copy.action) : null}
        {size === "icon" ? (
          <span className="sr-only">{label ?? copy.action}</span>
        ) : null}
      </Button>

      <AssignStaffDialog
        open={open}
        onOpenChange={setOpen}
        storeId={storeId}
        target={target}
        customerName={customerName}
        currentStaffId={currentStaffId}
        currentStaffName={currentStaffName}
        onAssigned={onAssigned}
      />
    </>
  );
}
